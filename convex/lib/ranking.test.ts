import { describe, expect, it } from "vitest";
import { rankClusters } from "./ranking";

// Helper: build the rankClusters input from compact fixtures. Ids are plain
// strings at runtime; we cast through `as any` so we don't drag in the Convex
// generated types.
function fixture(spec: {
  clusters: Array<{
    id: string;
    members: string[];
    participants: string[];
    title?: string;
    summary?: string;
    categoryId?: string;
  }>;
  ideas: Array<{ id: string; createdAt: number }>;
  votes: string[];
  participants: Array<{ id: string; name: string }>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cast = <T>(v: unknown) => v as any as T;
  return {
    clusters: spec.clusters.map((c) => ({
      id: c.id,
      title: c.title ?? c.id.toUpperCase(),
      summary: c.summary ?? "",
      categoryId: c.categoryId ?? "ideation",
      memberIdeaIds: c.members.map(cast),
      participantIds: c.participants.map(cast),
    })),
    ideas: spec.ideas.map((i) => ({ _id: cast(i.id), createdAt: i.createdAt })),
    votes: spec.votes.map((id) => ({ ideaId: cast(id) })),
    participants: spec.participants.map((p) => ({ _id: cast(p.id), name: p.name })),
  };
}

describe("rankClusters", () => {
  it("sorts by aggregated vote count descending", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          { id: "c1", members: ["i1"], participants: ["p1"] },
          { id: "c2", members: ["i2"], participants: ["p2"] },
          { id: "c3", members: ["i3"], participants: ["p3"] },
        ],
        ideas: [
          { id: "i1", createdAt: 1 },
          { id: "i2", createdAt: 2 },
          { id: "i3", createdAt: 3 },
        ],
        votes: ["i2", "i2", "i2", "i1", "i3", "i3"],
        participants: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
          { id: "p3", name: "C" },
        ],
      })
    );
    expect(ranked.map((r) => r.id)).toEqual(["c2", "c3", "c1"]);
    expect(ranked.map((r) => r.voteCount)).toEqual([3, 2, 1]);
  });

  it("aggregates votes across all memberIdeaIds in a cluster", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          { id: "merged", members: ["i1", "i2", "i3"], participants: ["p1", "p2"] },
          { id: "solo", members: ["i4"], participants: ["p3"] },
        ],
        ideas: [
          { id: "i1", createdAt: 1 },
          { id: "i2", createdAt: 2 },
          { id: "i3", createdAt: 3 },
          { id: "i4", createdAt: 4 },
        ],
        votes: ["i1", "i2", "i3", "i4", "i4"],
        participants: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
          { id: "p3", name: "C" },
        ],
      })
    );
    // merged cluster: votes on i1+i2+i3 = 3. solo: 2.
    expect(ranked.map((r) => r.id)).toEqual(["merged", "solo"]);
    expect(ranked.map((r) => r.voteCount)).toEqual([3, 2]);
  });

  it("breaks ties by earliest contributing-idea createdAt (asc)", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          { id: "later", members: ["i2"], participants: ["p1"] },
          { id: "earlier", members: ["i1"], participants: ["p2"] },
        ],
        ideas: [
          { id: "i1", createdAt: 100 },
          { id: "i2", createdAt: 200 },
        ],
        votes: ["i1", "i2"],
        participants: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
        ],
      })
    );
    expect(ranked.map((r) => r.id)).toEqual(["earlier", "later"]);
  });

  it("uses the earliest createdAt within a cluster's members for tie-break", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          { id: "spans", members: ["iLate", "iEarly"], participants: ["p1"] },
          { id: "single", members: ["iMid"], participants: ["p2"] },
        ],
        ideas: [
          { id: "iLate", createdAt: 300 },
          { id: "iEarly", createdAt: 50 },
          { id: "iMid", createdAt: 150 },
        ],
        votes: ["iLate", "iMid"],
        participants: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
        ],
      })
    );
    // Both have 1 vote each; spans's earliest is 50, single's is 150 → spans first.
    expect(ranked.map((r) => r.id)).toEqual(["spans", "single"]);
  });

  it("includes clusters with zero votes", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          { id: "voted", members: ["i1"], participants: ["p1"] },
          { id: "unvoted", members: ["i2"], participants: ["p2"] },
        ],
        ideas: [
          { id: "i1", createdAt: 1 },
          { id: "i2", createdAt: 2 },
        ],
        votes: ["i1"],
        participants: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
        ],
      })
    );
    expect(ranked.map((r) => r.id)).toEqual(["voted", "unvoted"]);
    expect(ranked[1].voteCount).toBe(0);
  });

  it("maps participantIds to contributor names, dropping unknowns", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          { id: "c1", members: ["i1"], participants: ["pA", "pGhost", "pB"] },
        ],
        ideas: [{ id: "i1", createdAt: 1 }],
        votes: [],
        participants: [
          { id: "pA", name: "Alex" },
          { id: "pB", name: "Brit" },
          // pGhost intentionally absent
        ],
      })
    );
    expect(ranked[0].contributorNames).toEqual(["Alex", "Brit"]);
  });

  it("sets anchorIdeaId to the first member", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [{ id: "c1", members: ["anchor", "other"], participants: ["p1"] }],
        ideas: [
          { id: "anchor", createdAt: 1 },
          { id: "other", createdAt: 2 },
        ],
        votes: [],
        participants: [{ id: "p1", name: "A" }],
      })
    );
    expect(ranked[0].anchorIdeaId).toBe("anchor");
  });

  it("returns [] for empty cluster input", () => {
    expect(
      rankClusters(
        fixture({
          clusters: [],
          ideas: [],
          votes: [],
          participants: [],
        })
      )
    ).toEqual([]);
  });

  it("ignores votes that don't map to any cluster member", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [{ id: "c1", members: ["i1"], participants: ["p1"] }],
        ideas: [{ id: "i1", createdAt: 1 }],
        votes: ["i1", "ghost", "ghost"],
        participants: [{ id: "p1", name: "A" }],
      })
    );
    expect(ranked[0].voteCount).toBe(1);
  });

  it("preserves cluster metadata (title, summary, categoryId)", () => {
    const ranked = rankClusters(
      fixture({
        clusters: [
          {
            id: "c1",
            members: ["i1"],
            participants: ["p1"],
            title: "Auto-draft QBR decks",
            summary: "From CRM data, as a starting point.",
            categoryId: "content",
          },
        ],
        ideas: [{ id: "i1", createdAt: 1 }],
        votes: [],
        participants: [{ id: "p1", name: "A" }],
      })
    );
    expect(ranked[0].title).toBe("Auto-draft QBR decks");
    expect(ranked[0].summary).toBe("From CRM data, as a starting point.");
    expect(ranked[0].categoryId).toBe("content");
  });
});
