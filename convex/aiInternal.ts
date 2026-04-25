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
