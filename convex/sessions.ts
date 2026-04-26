// Session creation is owner-gated and lives in convex/ownerQueries.ts
// (see createSessionAsOwner). Only owners can create sessions, so the dashboard
// at /owner is the single entry point.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { timingSafeEqual } from "./lib/auth";

// Public query: returns session by code, NO adminKey exposed.
export const getSession = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!session) return null;
    return {
      _id: session._id,
      code: session.code,
      functionName: session.functionName,
      teamSize: session.teamSize,
      industry: session.industry,
      status: session.status,
      votingStatus: session.votingStatus,
      votesPerParticipant: session.votesPerParticipant,
      createdAt: session.createdAt,
    };
  },
});

// Admin-gated query: validates adminKey before returning anything.
export const getSessionForAdmin = query({
  args: { code: v.string(), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!session) return null;
    if (!timingSafeEqual(session.adminKey, args.adminKey)) return null;
    return session;
  },
});

export const closeSession = mutation({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (!timingSafeEqual(session.adminKey, args.adminKey)) throw new Error("Invalid admin key");
    await ctx.db.patch(args.sessionId, { status: "closed" });
    return { ok: true };
  },
});
