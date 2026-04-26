import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { bumpActivity } from "./participants";
import { enforceMaxLength, LIMITS } from "./lib/limits";

export const submitIntake = mutation({
  args: {
    participantId: v.id("participants"),
    strengths: v.string(),
    blockers: v.string(),
    oneWish: v.string(),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    const strengths = args.strengths.trim();
    const blockers = args.blockers.trim();
    const oneWish = args.oneWish.trim();
    if (!strengths || !blockers || !oneWish) {
      throw new Error("All three intake answers are required");
    }
    enforceMaxLength("Strengths", strengths, LIMITS.intakeField);
    enforceMaxLength("Blockers", blockers, LIMITS.intakeField);
    enforceMaxLength("One wish", oneWish, LIMITS.intakeField);

    // Upsert: if an intake already exists for this participant, update it
    const existing = await ctx.db
      .query("intakeAnswers")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        strengths,
        blockers,
        oneWish,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("intakeAnswers", {
        sessionId: participant.sessionId,
        participantId: args.participantId,
        strengths,
        blockers,
        oneWish,
        updatedAt: now,
      });
    }

    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});

export const getMyIntake = query({
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
