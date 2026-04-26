import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { bumpActivity } from "./participants";
import { enforceMaxLength, LIMITS } from "./lib/limits";

const MIN_STARS = 5;
const MAX_STARS = 10;

// Returns ideas grouped by category for the participant's canvas view.
export const getMyCanvas = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .collect();

    const grouped: Record<string, typeof ideas> = {};
    for (const idea of ideas) {
      if (!grouped[idea.categoryId]) grouped[idea.categoryId] = [];
      grouped[idea.categoryId].push(idea);
    }
    // Sort within each category by `order` asc, then createdAt asc as tiebreak
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.createdAt - b.createdAt;
      });
    }
    return grouped;
  },
});

export const addIdea = mutation({
  args: {
    participantId: v.id("participants"),
    categoryId: v.string(),
    text: v.string(),
    source: v.union(v.literal("ai"), v.literal("manual"), v.literal("chat")),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.phase === "locked") {
      throw new Error("Cannot edit canvas after stars are locked");
    }

    const text = args.text.trim();
    if (!text) throw new Error("Idea text is required");
    enforceMaxLength("Idea", text, LIMITS.idea);

    // Determine the next `order` value within this category for stable display
    const existing = await ctx.db
      .query("ideas")
      .withIndex("by_participant_and_category", (q) =>
        q.eq("participantId", args.participantId).eq("categoryId", args.categoryId)
      )
      .collect();
    const maxOrder = existing.reduce((m, i) => Math.max(m, i.order), -1);

    const ideaId = await ctx.db.insert("ideas", {
      sessionId: participant.sessionId,
      participantId: args.participantId,
      categoryId: args.categoryId,
      text,
      starred: false,
      source: args.source,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    await bumpActivity(ctx, args.participantId);
    return ideaId;
  },
});

export const updateIdea = mutation({
  args: {
    participantId: v.id("participants"),
    ideaId: v.id("ideas"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.phase === "locked") {
      throw new Error("Cannot edit canvas after stars are locked");
    }

    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.participantId !== args.participantId) {
      throw new Error("Cannot edit another participant's idea");
    }

    const text = args.text.trim();
    if (!text) throw new Error("Idea text is required");
    enforceMaxLength("Idea", text, LIMITS.idea);

    await ctx.db.patch(args.ideaId, { text });
    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});

export const deleteIdea = mutation({
  args: {
    participantId: v.id("participants"),
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.phase === "locked") {
      throw new Error("Cannot edit canvas after stars are locked");
    }

    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.participantId !== args.participantId) {
      throw new Error("Cannot delete another participant's idea");
    }

    await ctx.db.delete(args.ideaId);
    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});

export const toggleStar = mutation({
  args: {
    participantId: v.id("participants"),
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.phase === "locked") {
      throw new Error("Cannot star after stars are locked");
    }

    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.participantId !== args.participantId) {
      throw new Error("Cannot star another participant's idea");
    }

    const newStarred = !idea.starred;

    if (newStarred) {
      // Enforce MAX_STARS server-side
      const allIdeas = await ctx.db
        .query("ideas")
        .withIndex("by_participant", (q) =>
          q.eq("participantId", args.participantId)
        )
        .collect();
      const currentlyStarred = allIdeas.filter((i) => i.starred).length;
      if (currentlyStarred >= MAX_STARS) {
        throw new Error(`Cannot star more than ${MAX_STARS} ideas`);
      }
    }

    await ctx.db.patch(args.ideaId, { starred: newStarred });
    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});

export const finalizeStars = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    // Idempotent: if already locked, no-op
    if (participant.phase === "locked") return { ok: true, alreadyLocked: true };

    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId)
      )
      .collect();
    const starCount = ideas.filter((i) => i.starred).length;
    if (starCount < MIN_STARS) {
      throw new Error(`Star at least ${MIN_STARS} ideas before submitting`);
    }
    if (starCount > MAX_STARS) {
      throw new Error(`Star at most ${MAX_STARS} ideas before submitting`);
    }

    const now = Date.now();
    await ctx.db.patch(args.participantId, {
      phase: "locked",
      starsLockedAt: now,
      lastActivityAt: now,
    });
    return { ok: true };
  },
});

// Chat messages — wired in Phase B step 11
export const listChatMessages = query({
  args: {
    participantId: v.id("participants"),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_participant_category", (q) =>
        q
          .eq("participantId", args.participantId)
          .eq("categoryId", args.categoryId)
      )
      .order("asc")
      .collect();
  },
});

// `appendChatMessage` was a holdover from Phase B before the chat action was
// wired up. Deleted because it was publicly callable, accepted role: "assistant"
// + arbitrary `ideas[]`, and let any caller fabricate AI suggestions in the
// chat drawer. All chat writes now go through the `chatRefine` action which
// uses `appendChatInternal` (`convex/aiInternal.ts`) for both user and
// assistant turns.

export const markChatIdeaAdded = mutation({
  args: {
    participantId: v.id("participants"),
    messageId: v.id("chatMessages"),
    ideaIdx: v.number(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Chat message not found");
    if (message.participantId !== args.participantId) {
      throw new Error("Cannot modify another participant's chat");
    }
    if (!message.ideas || args.ideaIdx >= message.ideas.length) {
      throw new Error("Invalid idea index");
    }

    const updatedIdeas = message.ideas.map((idea, idx) =>
      idx === args.ideaIdx ? { ...idea, added: true } : idea
    );
    await ctx.db.patch(args.messageId, { ideas: updatedIdeas });
    await bumpActivity(ctx, args.participantId);
    return { ok: true };
  },
});
