// Ranking + tie-break for synthesis clusters by aggregated vote count.
//
// Pure function — takes the rows already loaded by the caller and returns
// a sorted ranked list. Used by both `convex/votes.ts` (live admin tallies +
// post-close ranked results) and `convex/ownerQueries.ts` (export bundle).
//
// Tie-break: vote count desc, then earliest contributing-idea createdAt asc
// (first-contributed wins) — matches the rule documented in CLAUDE.md.

import { Id } from "../_generated/dataModel";

export type RankableCluster = {
  id: string;
  title: string;
  summary: string;
  categoryId: string;
  memberIdeaIds: Id<"ideas">[];
  participantIds: Id<"participants">[];
};

export type RankableIdea = {
  _id: Id<"ideas">;
  createdAt: number;
};

export type RankableVote = {
  ideaId: Id<"ideas">;
};

export type RankableParticipant = {
  _id: Id<"participants">;
  name: string;
};

export type RankedCluster = {
  id: string;
  title: string;
  summary: string;
  categoryId: string;
  anchorIdeaId: Id<"ideas">;
  memberIdeaIds: Id<"ideas">[];
  participantIds: Id<"participants">[];
  contributorNames: string[];
  voteCount: number;
  earliestCreatedAt: number;
};

export function rankClusters(args: {
  clusters: RankableCluster[];
  ideas: RankableIdea[];
  votes: RankableVote[];
  participants: RankableParticipant[];
}): RankedCluster[] {
  const voteCountByIdea = new Map<string, number>();
  for (const vote of args.votes) {
    const k = vote.ideaId as unknown as string;
    voteCountByIdea.set(k, (voteCountByIdea.get(k) ?? 0) + 1);
  }

  const ideasById = new Map<string, RankableIdea>();
  for (const idea of args.ideas) {
    ideasById.set(idea._id as unknown as string, idea);
  }

  const participantNameById = new Map<string, string>();
  for (const p of args.participants) {
    participantNameById.set(p._id as unknown as string, p.name);
  }

  const ranked: RankedCluster[] = args.clusters.map((cluster) => {
    let voteCount = 0;
    let earliestCreatedAt = Number.MAX_SAFE_INTEGER;
    for (const ideaId of cluster.memberIdeaIds) {
      const k = ideaId as unknown as string;
      voteCount += voteCountByIdea.get(k) ?? 0;
      const idea = ideasById.get(k);
      if (idea && idea.createdAt < earliestCreatedAt) {
        earliestCreatedAt = idea.createdAt;
      }
    }
    const contributorNames = cluster.participantIds
      .map((pid) => participantNameById.get(pid as unknown as string))
      .filter((n): n is string => !!n);
    return {
      id: cluster.id,
      title: cluster.title,
      summary: cluster.summary,
      categoryId: cluster.categoryId,
      anchorIdeaId: cluster.memberIdeaIds[0],
      memberIdeaIds: cluster.memberIdeaIds,
      participantIds: cluster.participantIds,
      contributorNames,
      voteCount,
      earliestCreatedAt,
    };
  });

  ranked.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.earliestCreatedAt - b.earliestCreatedAt;
  });

  return ranked;
}
