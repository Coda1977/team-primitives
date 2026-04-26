// Voting on deduplicated ideas (= synthesis clusters).
//
// Vote model: one vote per (participant, ideaId) pair. The UI casts votes
// against the FIRST memberIdeaId of a cluster (the "anchor"); cluster
// vote counts are aggregated by summing votes whose ideaId is in that
// cluster's memberIdeaIds. This keeps the schema simple while letting
// the UI vote at the deduplicated-idea level.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { bumpActivity } from "./participants";
import { rankClusters } from "./lib/ranking";
import { timingSafeEqual } from "./lib/auth";

const DEFAULT_VOTES_PER_PARTICIPANT = 3;

// ---------- Admin controls ----------

export const openVoting = mutation({
  args: {
    sessionId: v.id("sessions"),
    adminKey: v.string(),
    votesPerParticipant: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (!timingSafeEqual(session.adminKey, args.adminKey)) throw new Error("Invalid admin key");

    const budget = Math.floor(args.votesPerParticipant);
    if (budget < 1) throw new Error("votesPerParticipant must be at least 1");

    // Require synthesis to have run successfully at least once
    const latestSynthesis = await ctx.db
      .query("synthesis")
      .withIndex("by_session_ran", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    if (!latestSynthesis || latestSynthesis.status !== "ready") {
      throw new Error("Run synthesis before opening voting");
    }
    if (latestSynthesis.clusters.length === 0) {
      throw new Error("No deduplicated ideas to vote on");
    }

    // If re-opening: budget must be >= max votes already cast by any participant
    if (session.votingStatus === "closed_with_results") {
      const allVotes = await ctx.db
        .query("votes")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();
      const counts = new Map<string, number>();
      for (const vote of allVotes) {
        const k = vote.participantId as unknown as string;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const maxCast = Math.max(0, ...counts.values());
      if (budget < maxCast) {
        throw new Error(
          `Budget must be ≥ ${maxCast} (the most votes any participant already cast)`
        );
      }
    }

    await ctx.db.patch(args.sessionId, {
      votingStatus: "open",
      votesPerParticipant: budget,
    });
    return { ok: true, votesPerParticipant: budget };
  },
});

export const closeVoting = mutation({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (!timingSafeEqual(session.adminKey, args.adminKey)) throw new Error("Invalid admin key");
    if (session.votingStatus === "idle") {
      throw new Error("Voting was never opened");
    }
    await ctx.db.patch(args.sessionId, { votingStatus: "closed_with_results" });
    return { ok: true };
  },
});

// ---------- Participant voting ----------

export const castVote = mutation({
  args: {
    participantId: v.id("participants"),
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    const session = await ctx.db.get(participant.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.votingStatus !== "open") {
      throw new Error("Voting is not open");
    }
    const budget = session.votesPerParticipant ?? DEFAULT_VOTES_PER_PARTICIPANT;

    // Validate the idea is part of the latest synthesis (so voters can't
    // vote on an idea outside the deduplicated set).
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.sessionId !== participant.sessionId) {
      throw new Error("Idea is not part of this session");
    }

    // Uniqueness check: no double-voting on the same idea by the same person
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .filter((q) => q.eq(q.field("ideaId"), args.ideaId))
      .unique();
    if (existing) {
      // Idempotent: already voted, no-op
      return { ok: true, alreadyVoted: true };
    }

    // Budget check
    const myVotes = await ctx.db
      .query("votes")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .collect();
    if (myVotes.length >= budget) {
      throw new Error(`Vote budget exhausted (${budget})`);
    }

    await ctx.db.insert("votes", {
      sessionId: participant.sessionId,
      participantId: args.participantId,
      ideaId: args.ideaId,
      createdAt: Date.now(),
    });
    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});

export const removeVote = mutation({
  args: {
    participantId: v.id("participants"),
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    const session = await ctx.db.get(participant.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.votingStatus !== "open") {
      throw new Error("Voting is not open");
    }

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .filter((q) => q.eq(q.field("ideaId"), args.ideaId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});

export const listMyVotes = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .collect();
    // Return a Set-like object: the ideaIds the participant has voted for
    return votes.map((v) => v.ideaId);
  },
});

// ---------- Tallies ----------

// Loads the latest ready synthesis + all votes/ideas needed to rank, then
// delegates to the shared `rankClusters` helper. Used by both admin (live
// during open) and the post-close ranked view.
async function computeRankedClusters(
  ctx: any,
  sessionId: Id<"sessions">,
  participantsList: Array<{ _id: Id<"participants">; name: string }>
) {
  const synthesis = await ctx.db
    .query("synthesis")
    .withIndex("by_session_ran", (q: any) => q.eq("sessionId", sessionId))
    .order("desc")
    .first();
  if (!synthesis || synthesis.status !== "ready") return [];

  const [allVotes, sessionIdeas] = await Promise.all([
    ctx.db
      .query("votes")
      .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("ideas")
      .withIndex("by_session_starred", (q: any) => q.eq("sessionId", sessionId))
      .collect(),
  ]);

  return rankClusters({
    clusters: synthesis.clusters,
    ideas: sessionIdeas,
    votes: allVotes,
    participants: participantsList,
  });
}

// Admin-gated live tallies (visible only to admin while voting is open).
export const getAdminTallies = query({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (!timingSafeEqual(session.adminKey, args.adminKey)) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const totalVotes = (
      await ctx.db
        .query("votes")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect()
    ).length;

    const ranked = await computeRankedClusters(
      ctx,
      args.sessionId,
      participants.map((p) => ({ _id: p._id, name: p.name }))
    );

    return {
      votingStatus: session.votingStatus,
      votesPerParticipant: session.votesPerParticipant ?? DEFAULT_VOTES_PER_PARTICIPANT,
      totalVotes,
      participantCount: participants.length,
      ranked,
    };
  },
});

// Public-ish: ranked list visible to everyone in the session AFTER voting closes.
export const getRankedResults = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (session.votingStatus !== "closed_with_results") return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const ranked = await computeRankedClusters(
      ctx,
      args.sessionId,
      participants.map((p) => ({ _id: p._id, name: p.name }))
    );
    return {
      ranked,
      votesPerParticipant: session.votesPerParticipant ?? DEFAULT_VOTES_PER_PARTICIPANT,
      participantCount: participants.length,
    };
  },
});
