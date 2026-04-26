import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { slugify } from "./lib/ids";
import { enforceMaxLength, LIMITS } from "./lib/limits";
import { timingSafeEqual } from "./lib/auth";
import { checkRateLimit } from "./lib/rateLimit";

// Per-session join cap: anyone with the public participant URL can call this,
// so we cap the burst rate to thwart auto-fill abuse. Real workshops have at
// most ~30 participants spread over a few minutes; 50 joins per minute is
// well above that.
const JOIN_LIMIT_PER_MINUTE = 50;

// Helper called by every participant mutation to track activity for admin roster.
export async function bumpActivity(
  ctx: MutationCtx,
  participantId: Id<"participants">
): Promise<void> {
  await ctx.db.patch(participantId, { lastActivityAt: Date.now() });
}

export const joinSession = mutation({
  args: { sessionId: v.id("sessions"), name: v.string() },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Name is required");
    }
    enforceMaxLength("Name", trimmedName, LIMITS.name);

    await checkRateLimit(
      ctx,
      `joinSession:${args.sessionId}`,
      JOIN_LIMIT_PER_MINUTE,
      60_000
    );

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status !== "open") {
      throw new Error("Session is closed to new participants");
    }

    // Slug uniqueness within session: append -2, -3, ... if needed
    const baseSlug = slugify(trimmedName) || "participant";
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const existing = await ctx.db
        .query("participants")
        .withIndex("by_session_and_slug", (q) =>
          q.eq("sessionId", args.sessionId).eq("slug", slug)
        )
        .unique();
      if (!existing) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const now = Date.now();
    const participantId = await ctx.db.insert("participants", {
      sessionId: args.sessionId,
      name: trimmedName,
      slug,
      phase: "intake",
      lastActivityAt: now,
      createdAt: now,
    });

    return { participantId, slug };
  },
});

export const getParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.participantId);
  },
});

export const getParticipantBySlug = query({
  args: { sessionId: v.id("sessions"), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_session_and_slug", (q) =>
        q.eq("sessionId", args.sessionId).eq("slug", args.slug)
      )
      .unique();
  },
});

// Admin-gated: returns roster with aggregated counts + activity for the live admin view.
export const listParticipants = query({
  args: { sessionId: v.id("sessions"), adminKey: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    if (!timingSafeEqual(session.adminKey, args.adminKey)) return [];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // For each, count ideas + starred ideas
    const rows = await Promise.all(
      participants.map(async (p) => {
        const ideas = await ctx.db
          .query("ideas")
          .withIndex("by_participant", (q) => q.eq("participantId", p._id))
          .collect();
        const ideaCount = ideas.length;
        const starCount = ideas.filter((i) => i.starred).length;

        // Compute the timestamp at which this participant entered their current phase
        let phaseEnteredAt = p.createdAt;
        if (p.phase === "canvas" && p.canvasGeneratedAt) {
          phaseEnteredAt = p.canvasGeneratedAt;
        } else if (p.phase === "locked" && p.starsLockedAt) {
          phaseEnteredAt = p.starsLockedAt;
        }

        return {
          _id: p._id,
          name: p.name,
          slug: p.slug,
          phase: p.phase,
          ideaCount,
          starCount,
          phaseEnteredAt,
          lastActivityAt: p.lastActivityAt,
          createdAt: p.createdAt,
        };
      })
    );

    return rows;
  },
});
