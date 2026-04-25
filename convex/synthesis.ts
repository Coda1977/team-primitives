import { query } from "./_generated/server";
import { v } from "convex/values";

// Returns the most recent synthesis row for this session, or null.
// Admin-gated.
export const getLatestSynthesis = query({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (session.adminKey !== args.adminKey) return null;

    const latest = await ctx.db
      .query("synthesis")
      .withIndex("by_session_ran", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    return latest ?? null;
  },
});

// Returns all starred ideas in this session with participant attribution.
// Admin-gated. Used by the admin's RawStarredList panel + synthesize action.
export const listRawStarred = query({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    if (session.adminKey !== args.adminKey) return [];

    const starred = await ctx.db
      .query("ideas")
      .withIndex("by_session_starred", (q) =>
        q.eq("sessionId", args.sessionId).eq("starred", true)
      )
      .collect();

    // Hydrate participant names
    const participantCache = new Map();
    const rows = [];
    for (const idea of starred) {
      let participantName = participantCache.get(idea.participantId);
      if (!participantName) {
        const p = await ctx.db.get(idea.participantId);
        participantName = p?.name ?? "(unknown)";
        participantCache.set(idea.participantId, participantName);
      }
      rows.push({
        _id: idea._id,
        text: idea.text,
        categoryId: idea.categoryId,
        participantId: idea.participantId,
        participantName,
        source: idea.source,
        createdAt: idea.createdAt,
      });
    }
    // Sort by category for stable display
    rows.sort((a, b) => {
      if (a.categoryId !== b.categoryId)
        return a.categoryId.localeCompare(b.categoryId);
      return a.participantName.localeCompare(b.participantName);
    });
    return rows;
  },
});

// Public-ish: returns the latest synthesis for participants who reached the
// "locked" phase (so the participant can see the team board when ready).
// Validates that the participant belongs to this session.
export const getLatestSynthesisForParticipant = query({
  args: {
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return null;
    if (participant.sessionId !== args.sessionId) return null;
    if (participant.phase !== "locked") return null;

    const latest = await ctx.db
      .query("synthesis")
      .withIndex("by_session_ran", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    if (!latest || latest.status !== "ready") return null;
    return latest;
  },
});
