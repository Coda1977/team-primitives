// Internal queries + mutations used by Convex actions in convex/ai/*.
// Actions can't access the database directly — they call these via ctx.runQuery / ctx.runMutation.
// Action files use "use node"; internal helpers live here in the standard V8 runtime.

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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
