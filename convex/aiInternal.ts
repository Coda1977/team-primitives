// Internal queries + mutations used by Convex actions in convex/ai/*.
// Actions can't access the database directly — they call these via ctx.runQuery / ctx.runMutation.
// Action files use "use node"; internal helpers live here in the standard V8 runtime.

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { timingSafeEqual } from "./lib/auth";

export const getParticipantInternal = internalQuery({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.participantId);
  },
});

export const getSessionInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getIntakeInternal = internalQuery({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("intakeAnswers")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .unique();
  },
});

export const countIdeasInternal = internalQuery({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .collect();
    return ideas.length;
  },
});

export const listCategoryIdeasInternal = internalQuery({
  args: {
    participantId: v.id("participants"),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ideas")
      .withIndex("by_participant_and_category", (q) =>
        q.eq("participantId", args.participantId).eq("categoryId", args.categoryId)
      )
      .collect();
  },
});

export const listChatHistoryInternal = internalQuery({
  args: {
    participantId: v.id("participants"),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_participant_category", (q) =>
        q.eq("participantId", args.participantId).eq("categoryId", args.categoryId)
      )
      .order("asc")
      .collect();
  },
});

// Counts user-role chat turns for a (participant, category) — drives the
// per-category chatRefine quota so a single participant link can't be used
// to spam the Anthropic API.
export const countUserChatTurnsInternal = internalQuery({
  args: {
    participantId: v.id("participants"),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_participant_category", (q) =>
        q.eq("participantId", args.participantId).eq("categoryId", args.categoryId)
      )
      .collect();
    return rows.filter((r) => r.role === "user").length;
  },
});

// Counts synthesis runs (any status) for a session — drives the lifetime
// re-synthesis quota.
export const countSynthesisRunsInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("synthesis")
      .withIndex("by_session_ran", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return runs.length;
  },
});

export const appendChatInternal = internalMutation({
  args: {
    participantId: v.id("participants"),
    sessionId: v.id("sessions"),
    categoryId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    ideas: v.optional(
      v.array(
        v.object({
          text: v.string(),
          categoryId: v.string(),
          added: v.boolean(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      participantId: args.participantId,
      categoryId: args.categoryId,
      role: args.role,
      content: args.content,
      ideas: args.ideas,
      createdAt: Date.now(),
    });
    if (args.role === "user") {
      await ctx.db.patch(args.participantId, { lastActivityAt: Date.now() });
    }
    return messageId;
  },
});

// Used by the synthesize action: validates adminKey, returns session.
export const getSessionByAdminKeyInternal = internalQuery({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (!timingSafeEqual(session.adminKey, args.adminKey)) return null;
    return session;
  },
});

// Used by the synthesize action: returns all starred ideas in the session
// with participant names, for prompt assembly + verbatim source-mapping back
// to ideaIds.
export const listStarredForSynthesisInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const starred = await ctx.db
      .query("ideas")
      .withIndex("by_session_starred", (q) =>
        q.eq("sessionId", args.sessionId).eq("starred", true)
      )
      .collect();

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
      });
    }
    return rows;
  },
});

// Used by the synthesize action: counts distinct locked participants in
// the session (used to gate Synthesize >=2).
export const countLockedParticipantsInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return participants.filter((p) => p.phase === "locked").length;
  },
});

// Inserts a "running" synthesis row to lock the slot during the LLM call,
// returns its _id. The action will patch it later with the parsed clusters
// (status: ready) or an error (status: error).
export const startSynthesisInternal = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("synthesis", {
      sessionId: args.sessionId,
      status: "running",
      ranAt: Date.now(),
      clusters: [],
    });
    return id;
  },
});

export const finishSynthesisInternal = internalMutation({
  args: {
    synthesisId: v.id("synthesis"),
    clusters: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        summary: v.string(),
        categoryId: v.string(),
        memberIdeaIds: v.array(v.id("ideas")),
        participantIds: v.array(v.id("participants")),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.synthesisId, {
      status: "ready",
      clusters: args.clusters,
      ranAt: Date.now(),
    });
  },
});

export const failSynthesisInternal = internalMutation({
  args: {
    synthesisId: v.id("synthesis"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.synthesisId, {
      status: "error",
      error: args.error,
      ranAt: Date.now(),
    });
  },
});

// Invoked by the generateCanvas action after it parses the LLM response.
// Inserts AI-generated ideas in batch + advances participant phase to "canvas".
export const writeGeneratedIdeas = internalMutation({
  args: {
    participantId: v.id("participants"),
    sessionId: v.id("sessions"),
    ideasByCategory: v.array(
      v.object({
        categoryId: v.string(),
        texts: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const cat of args.ideasByCategory) {
      let order = 0;
      for (const text of cat.texts) {
        await ctx.db.insert("ideas", {
          sessionId: args.sessionId,
          participantId: args.participantId,
          categoryId: cat.categoryId,
          text: text.trim(),
          starred: false,
          source: "ai",
          order: order++,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(args.participantId, {
      phase: "canvas",
      canvasGeneratedAt: now,
      lastActivityAt: now,
    });
  },
});
