import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateAdminKey, generateSessionCode } from "./lib/ids";

export const createSession = mutation({
  args: {
    functionName: v.string(),
    teamSize: v.optional(v.number()),
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedFunctionName = args.functionName.trim();
    if (!trimmedFunctionName) {
      throw new Error("Function name is required");
    }

    // Retry on code collision (very unlikely but defensive)
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
    if (session.adminKey !== args.adminKey) return null;
    return session;
  },
});

export const closeSession = mutation({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.adminKey !== args.adminKey) throw new Error("Invalid admin key");
    await ctx.db.patch(args.sessionId, { status: "closed" });
    return { ok: true };
  },
});
