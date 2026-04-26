"use node";

// Cross-participant clustering: takes all starred ideas across all participants,
// asks Claude to group ideas that mean roughly the same thing, returns clusters
// with verbatim source mapping back to ideaIds.
//
// This is the #1 product risk per PLAN.md — budget time to iterate this prompt
// against real session data. temperature: 0.3 to reduce drift between runs.

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { callAnthropic } from "../lib/anthropic";
import { findIdea, type StarredIdea } from "./findIdea";

const CATEGORY_TITLES: Record<string, string> = {
  content: "Content Creation",
  automation: "Task Automation",
  research: "Research & Synthesis",
  data: "Data & Insights",
  coding: "Technical Work",
  ideation: "Strategy & Ideation",
};

// Lifetime cap on synthesis runs per session. Re-synthesis after late joiners
// is legitimate; double-digit re-runs are not — this caps Anthropic spend if
// the admin URL ever leaks.
const SYNTHESIS_RUN_LIMIT = 10;

interface LlmCluster {
  title: string;
  summary: string;
  categoryId: string;
  sources: { participantName: string; text: string }[];
}

function buildPrompt(args: {
  functionName: string;
  starred: StarredIdea[];
  participantCount: number;
}): string {
  const totalStars = args.starred.length;

  // Group starred ideas by category for the prompt body
  const byCategory: Record<string, StarredIdea[]> = {};
  for (const idea of args.starred) {
    if (!byCategory[idea.categoryId]) byCategory[idea.categoryId] = [];
    byCategory[idea.categoryId].push(idea);
  }

  const categoryBlocks = Object.keys(CATEGORY_TITLES)
    .filter((catId) => byCategory[catId]?.length)
    .map((catId) => {
      const title = CATEGORY_TITLES[catId];
      const lines = byCategory[catId]
        .map((i) => `- (${i.participantName}) ${i.text}`)
        .join("\n");
      return `[${title}]\n${lines}`;
    })
    .join("\n\n");

  return `You are helping a ${args.functionName} team see where their AI ideas overlap.

${args.participantCount} participants each starred their 5-10 favorite AI use case ideas. Below is the raw list.

RAW STARRED IDEAS (${totalStars} total, across ${args.participantCount} people):

${categoryBlocks}

YOUR JOB:
Cluster ideas that mean roughly the same thing, even when worded differently. Each cluster should represent ONE distinct AI application. Keep clusters surprising and specific — do not merge genuinely different ideas just because they share a keyword.

Rules:
- Two ideas belong in the same cluster only if a ${args.functionName} leader would pick ONE of them over the other (they're interchangeable), not if they're merely related.
- Ideas starred by only one person are valid single-member clusters — include them.
- Write a short cluster TITLE (max 8 words) and SUMMARY (1-2 sentences) that captures what the cluster actually IS, concretely.
- Pick the dominant categoryId: one of content | automation | research | data | coding | ideation.
- List the exact source ideas verbatim so we can trace them back to their ideaId.

Never invent experiences, metrics, or outcomes.

Respond in this exact JSON format (no markdown fences):
{
  "clusters": [
    {
      "title": "Auto-draft QBR decks from CRM data",
      "summary": "Generate first-pass customer review presentations from structured pipeline and account data, ready for human polish.",
      "categoryId": "content",
      "sources": [
        {"participantName": "Jordan", "text": "Draft first-pass QBR decks from CRM pipeline data"},
        {"participantName": "Alex", "text": "Build QBR slides from Salesforce export"}
      ]
    }
  ]
}

Sort clusters by number of sources descending. Do not invent ideas. Every \`sources[i].text\` MUST appear verbatim from the raw list above so we can map it back to an ideaId.`;
}

export const run = action({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args): Promise<{ ok: true; clusterCount: number } | { ok: false; error: string }> => {
    // Validate admin
    const session = await ctx.runQuery(
      internal.aiInternal.getSessionByAdminKeyInternal,
      { sessionId: args.sessionId, adminKey: args.adminKey }
    );
    if (!session) throw new Error("Invalid admin key or session");

    const priorRuns: number = await ctx.runQuery(
      internal.aiInternal.countSynthesisRunsInternal,
      { sessionId: args.sessionId }
    );
    if (priorRuns >= SYNTHESIS_RUN_LIMIT) {
      throw new Error(
        `Synthesis limit reached for this session (${SYNTHESIS_RUN_LIMIT} runs). Create a new workshop if you need to redo this.`
      );
    }

    // Require >= 2 locked participants per MVP defaults
    const lockedCount = await ctx.runQuery(
      internal.aiInternal.countLockedParticipantsInternal,
      { sessionId: args.sessionId }
    );
    if (lockedCount < 2) {
      throw new Error(`Need at least 2 locked participants to synthesize (have ${lockedCount})`);
    }

    const starred: StarredIdea[] = await ctx.runQuery(
      internal.aiInternal.listStarredForSynthesisInternal,
      { sessionId: args.sessionId }
    );
    if (starred.length === 0) {
      throw new Error("No starred ideas to synthesize");
    }

    // Distinct participants among starred
    const participantSet = new Set(starred.map((s) => s.participantId as unknown as string));

    // Insert a "running" synthesis row up-front
    const synthesisId: Id<"synthesis"> = await ctx.runMutation(
      internal.aiInternal.startSynthesisInternal,
      { sessionId: args.sessionId }
    );

    try {
      const prompt = buildPrompt({
        functionName: session.functionName,
        starred,
        participantCount: participantSet.size,
      });

      const { text: raw } = await callAnthropic({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 4096,
        temperature: 0.3,
      });

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response as JSON");

      let parsed: { clusters?: LlmCluster[] };
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Invalid JSON in AI response");
      }

      const llmClusters = Array.isArray(parsed.clusters) ? parsed.clusters : [];
      if (llmClusters.length === 0) throw new Error("LLM returned 0 clusters");

      // Map sources -> ideaIds. Drop sources we can't match (best-effort);
      // keep clusters that have at least one mapped source.
      const finalClusters = llmClusters
        .map((c, idx) => {
          const memberIds: Id<"ideas">[] = [];
          const participantIdSet = new Set<string>();
          for (const src of c.sources ?? []) {
            const hit = findIdea(src, starred);
            if (hit) {
              memberIds.push(hit._id);
              participantIdSet.add(hit.participantId as unknown as string);
            }
          }
          if (memberIds.length === 0) return null;
          const validCategoryId =
            CATEGORY_TITLES[c.categoryId] ? c.categoryId : memberIds[0]
              ? starred.find((s) => s._id === memberIds[0])?.categoryId ?? "ideation"
              : "ideation";
          return {
            id: `c${idx}`,
            title: (c.title || "(untitled)").trim().slice(0, 120),
            summary: (c.summary || "").trim(),
            categoryId: validCategoryId,
            memberIdeaIds: memberIds,
            participantIds: Array.from(participantIdSet) as unknown as Id<"participants">[],
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (finalClusters.length === 0) {
        throw new Error("No clusters could be mapped back to source ideas");
      }

      await ctx.runMutation(internal.aiInternal.finishSynthesisInternal, {
        synthesisId,
        clusters: finalClusters,
      });

      return { ok: true, clusterCount: finalClusters.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.aiInternal.failSynthesisInternal, {
        synthesisId,
        error: message,
      });
      throw err;
    }
  },
});
