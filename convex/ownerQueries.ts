// Owner-gated queries + mutations.
// Every function takes `ownerKey` as an argument and validates it against
// the OWNER_KEY env var. Failed validation returns null (queries) or throws (mutations).

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateAdminKey, generateSessionCode } from "./lib/ids";

function validate(provided: string | undefined): boolean {
  const expected = process.env.OWNER_KEY;
  if (!expected) return false;
  if (!provided) return false;
  return provided === expected;
}

// Cross-session library for the owner.
export const listAllSessions = query({
  args: { ownerKey: v.string() },
  handler: async (ctx, args) => {
    if (!validate(args.ownerKey)) return null;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    const rows = await Promise.all(
      sessions.map(async (s) => {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();

        const ideas = await ctx.db
          .query("ideas")
          .withIndex("by_session_starred", (q) => q.eq("sessionId", s._id))
          .collect();

        const starred = ideas.filter((i) => i.starred);
        const starCount = starred.length;
        const ideaCount = ideas.length;

        // Top voted idea (if any votes exist for this session)
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();

        let topVotedIdea: { text: string; voteCount: number } | undefined;
        if (votes.length > 0) {
          const counts = new Map<string, number>();
          for (const v of votes) {
            const k = v.ideaId as unknown as string;
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
          let topId: string | undefined;
          let topCount = 0;
          for (const [id, c] of counts) {
            if (c > topCount) {
              topCount = c;
              topId = id;
            }
          }
          if (topId) {
            const idea = await ctx.db.get(topId as any);
            if (idea && "text" in idea) {
              topVotedIdea = { text: (idea as any).text, voteCount: topCount };
            }
          }
        }

        const adminUrl = `/s/${s.code}/admin?k=${s.adminKey}`;

        return {
          _id: s._id,
          code: s.code,
          functionName: s.functionName,
          teamSize: s.teamSize,
          industry: s.industry,
          status: s.status,
          votingStatus: s.votingStatus,
          createdAt: s.createdAt,
          participantCount: participants.length,
          ideaCount,
          starCount,
          voteCount: votes.length,
          topVotedIdea,
          adminUrl,
        };
      })
    );

    return rows;
  },
});

// Owner-gated session creation. Replaces the public createSession in sessions.ts.
export const createSessionAsOwner = mutation({
  args: {
    ownerKey: v.string(),
    functionName: v.string(),
    teamSize: v.optional(v.number()),
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!validate(args.ownerKey)) {
      throw new Error("Invalid owner key");
    }

    const trimmedFunctionName = args.functionName.trim();
    if (!trimmedFunctionName) {
      throw new Error("Function name is required");
    }

    let code = generateSessionCode(trimmedFunctionName);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = generateSessionCode(trimmedFunctionName);
    }

    const adminKey = generateAdminKey();
    const now = Date.now();

    const sessionId = await ctx.db.insert("sessions", {
      code,
      functionName: trimmedFunctionName,
      teamSize: args.teamSize,
      industry: args.industry?.trim() || undefined,
      adminKey,
      status: "open",
      votingStatus: "idle",
      createdAt: now,
    });

    return { sessionId, code, adminKey };
  },
});

// Bundles everything an export needs for a single session. Owner-gated.
export const getSessionExportBundle = query({
  args: { ownerKey: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    if (!validate(args.ownerKey)) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Hydrate participant lookup
    const participantById = new Map<string, { name: string; slug: string }>();
    for (const p of participants) {
      participantById.set(p._id as unknown as string, { name: p.name, slug: p.slug });
    }

    const starred = await ctx.db
      .query("ideas")
      .withIndex("by_session_starred", (q) =>
        q.eq("sessionId", args.sessionId).eq("starred", true)
      )
      .collect();

    const starredWithNames = starred.map((idea) => ({
      _id: idea._id,
      text: idea.text,
      categoryId: idea.categoryId,
      participantId: idea.participantId,
      participantName:
        participantById.get(idea.participantId as unknown as string)?.name ?? "(unknown)",
      createdAt: idea.createdAt,
    }));

    const synthesis = await ctx.db
      .query("synthesis")
      .withIndex("by_session_ran", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    // Compute ranked results from votes if any exist
    const allVotes = await ctx.db
      .query("votes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const voteCountByIdea = new Map<string, number>();
    for (const vote of allVotes) {
      const k = vote.ideaId as unknown as string;
      voteCountByIdea.set(k, (voteCountByIdea.get(k) ?? 0) + 1);
    }

    const ideasById = new Map<string, any>();
    for (const idea of starred) {
      ideasById.set(idea._id as unknown as string, idea);
    }

    let ranked: any[] = [];
    if (synthesis && synthesis.status === "ready") {
      ranked = synthesis.clusters
        .map((cluster: any) => {
          let voteCount = 0;
          let earliestCreatedAt = Number.MAX_SAFE_INTEGER;
          for (const ideaId of cluster.memberIdeaIds as any[]) {
            const k = ideaId as unknown as string;
            voteCount += voteCountByIdea.get(k) ?? 0;
            const idea = ideasById.get(k);
            if (idea && idea.createdAt < earliestCreatedAt) {
              earliestCreatedAt = idea.createdAt;
            }
          }
          const contributorNames = cluster.participantIds
            .map((pid: any) => participantById.get(pid as unknown as string)?.name)
            .filter(Boolean);
          return {
            id: cluster.id,
            title: cluster.title,
            summary: cluster.summary,
            categoryId: cluster.categoryId,
            memberIdeaIds: cluster.memberIdeaIds,
            participantIds: cluster.participantIds,
            contributorNames,
            voteCount,
            earliestCreatedAt,
          };
        })
        .sort((a: any, b: any) => {
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return a.earliestCreatedAt - b.earliestCreatedAt;
        });
    }

    return {
      session: {
        _id: session._id,
        code: session.code,
        functionName: session.functionName,
        teamSize: session.teamSize,
        industry: session.industry,
        votingStatus: session.votingStatus,
        votesPerParticipant: session.votesPerParticipant,
        createdAt: session.createdAt,
      },
      participants: participants.map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        phase: p.phase,
      })),
      starred: starredWithNames,
      synthesis: synthesis
        ? {
            status: synthesis.status,
            ranAt: synthesis.ranAt,
            clusters: synthesis.clusters,
          }
        : null,
      ranked,
      totalVotes: allVotes.length,
    };
  },
});

// Owner-gated session deletion (cascades through all related tables).
export const deleteSessionAsOwner = mutation({
  args: { ownerKey: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    if (!validate(args.ownerKey)) {
      throw new Error("Invalid owner key");
    }
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Cascade in safe order: dependent records first, sessions last.
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const chatMessages = await ctx.db
      .query("chatMessages")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .collect();
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_session_starred", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const intakeAnswers = await ctx.db
      .query("intakeAnswers")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .collect();
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const synth = await ctx.db
      .query("synthesis")
      .withIndex("by_session_ran", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    let deleted = 0;
    for (const row of [...votes, ...chatMessages, ...ideas, ...intakeAnswers, ...synth, ...participants]) {
      await ctx.db.delete(row._id);
      deleted++;
    }
    await ctx.db.delete(args.sessionId);
    deleted++;

    return { deleted };
  },
});
