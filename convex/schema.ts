import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    code: v.string(),
    functionName: v.string(),
    teamSize: v.optional(v.number()),
    industry: v.optional(v.string()),
    adminKey: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    votingStatus: v.union(
      v.literal("idle"),
      v.literal("open"),
      v.literal("closed_with_results")
    ),
    votesPerParticipant: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_created_at", ["createdAt"]),

  participants: defineTable({
    sessionId: v.id("sessions"),
    name: v.string(),
    slug: v.string(),
    phase: v.union(
      v.literal("intake"),
      v.literal("canvas"),
      v.literal("locked")
    ),
    canvasGeneratedAt: v.optional(v.number()),
    starsLockedAt: v.optional(v.number()),
    lastActivityAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_slug", ["sessionId", "slug"]),

  intakeAnswers: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    strengths: v.string(),
    blockers: v.string(),
    oneWish: v.string(),
    updatedAt: v.number(),
  }).index("by_participant", ["participantId"]),

  ideas: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    categoryId: v.string(),
    text: v.string(),
    starred: v.boolean(),
    source: v.union(
      v.literal("ai"),
      v.literal("manual"),
      v.literal("chat")
    ),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_participant_and_category", ["participantId", "categoryId"])
    .index("by_session_starred", ["sessionId", "starred"]),

  chatMessages: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
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
    createdAt: v.number(),
  }).index("by_participant_category", [
    "participantId",
    "categoryId",
    "createdAt",
  ]),

  synthesis: defineTable({
    sessionId: v.id("sessions"),
    status: v.union(
      v.literal("running"),
      v.literal("ready"),
      v.literal("error")
    ),
    ranAt: v.number(),
    error: v.optional(v.string()),
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
  }).index("by_session_ran", ["sessionId", "ranAt"]),

  votes: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    ideaId: v.id("ideas"),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_participant", ["participantId"])
    .index("by_idea", ["ideaId"]),
});
