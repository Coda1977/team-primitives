"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { callAnthropic } from "../lib/anthropic";

const CATEGORY_ORDER = [
  "content",
  "automation",
  "research",
  "data",
  "coding",
  "ideation",
] as const;

function buildPrompt(
  functionName: string,
  industry: string | undefined,
  teamSize: number | undefined,
  strengths: string,
  blockers: string,
  oneWish: string
): string {
  const industryLine = industry ? `Industry context: ${industry}.` : "";
  const teamSizeLine = teamSize ? `Team size: ${teamSize}.` : "";

  return `You are helping a member of the ${functionName} function brainstorm how AI could help their team.
${industryLine}
${teamSizeLine}

This person answered 3 questions about their FUNCTION (not their personal role):

1) What does ${functionName} do well that AI could help you do 10x more of?
   ${strengths}

2) Where does ${functionName} get stuck or slowed down that AI could help unblock?
   ${blockers}

3) If you could snap your fingers and have AI handle one thing in ${functionName} tomorrow, what would it be?
   ${oneWish}

Generate 2-3 specific, actionable AI use case ideas for EACH of these 6 categories:
1. Content Creation (text, presentations, reports, communications)
2. Task Automation (repetitive processes, workflows, scheduling)
3. Research & Synthesis (information retrieval, document analysis)
4. Data & Insights (analysis, visualization, pattern recognition)
5. Technical Work (spreadsheets, scripts, tools, systems)
6. Strategy & Ideation (planning, brainstorming, problem-solving)

Each idea MUST:
- Reference concrete ${functionName} work (not generic office tasks).
- Be under 40 words and immediately actionable.
- Draw from the three answers above when possible.

Never invent experiences, metrics, or outcomes this person didn't share.

Respond in this exact JSON format (no markdown fences):
{
  "content": ["idea 1", "idea 2"],
  "automation": ["idea 1", "idea 2"],
  "research": ["idea 1", "idea 2"],
  "data": ["idea 1", "idea 2"],
  "coding": ["idea 1", "idea 2"],
  "ideation": ["idea 1", "idea 2"]
}`;
}

export const run = action({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    // Fetch participant + session + intake via internal queries
    const participant = await ctx.runQuery(
      internal.aiInternal.getParticipantInternal,
      { participantId: args.participantId }
    );
    if (!participant) throw new Error("Participant not found");

    const session = await ctx.runQuery(internal.aiInternal.getSessionInternal, {
      sessionId: participant.sessionId,
    });
    if (!session) throw new Error("Session not found");

    const intake = await ctx.runQuery(internal.aiInternal.getIntakeInternal, {
      participantId: args.participantId,
    });
    if (!intake) throw new Error("Intake answers not found");

    // Refuse if canvas already exists (idempotency guard)
    const existingIdeas = await ctx.runQuery(
      internal.aiInternal.countIdeasInternal,
      { participantId: args.participantId }
    );
    if (existingIdeas > 0) {
      // Already generated — no-op rather than error
      return { ok: true };
    }

    const prompt = buildPrompt(
      session.functionName,
      session.industry,
      session.teamSize,
      intake.strengths,
      intake.blockers,
      intake.oneWish
    );

    const { text: rawResponse } = await callAnthropic({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2048,
    });

    // Parse JSON. Same regex as api/primitives-generate.js:62
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    let parsed: Record<string, string[]>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new Error("Invalid JSON in AI response");
    }

    const ideasByCategory = CATEGORY_ORDER.map((categoryId) => ({
      categoryId,
      texts: Array.isArray(parsed[categoryId])
        ? parsed[categoryId].filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        : [],
    })).filter((c) => c.texts.length > 0);

    if (ideasByCategory.length === 0) {
      throw new Error("AI response had no usable ideas in any category");
    }

    await ctx.runMutation(internal.aiInternal.writeGeneratedIdeas, {
      participantId: args.participantId,
      sessionId: participant.sessionId,
      ideasByCategory,
    });

    return { ok: true };
  },
});
