// Pure-data helper used by synthesize.ts to map an LLM-quoted source line
// back to an originally-starred idea. Lives outside `synthesize.ts` so it can
// be unit-tested without dragging in the `"use node"` action runtime.
//
// 4-tier fallback, ordered most → least specific:
//   1. exact text + participant name
//   2. exact text only
//   3. normalized (whitespace-collapsed, lowercased) text + participant name
//   4. normalized text only
//
// Returns the matched idea or null. Caller treats null as "orphan source"
// rather than silently dropping the cluster.

import { Id } from "../_generated/dataModel";

export type StarredIdea = {
  _id: Id<"ideas">;
  text: string;
  categoryId: string;
  participantId: Id<"participants">;
  participantName: string;
};

export function normalizeForMatch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findIdea(
  source: { text: string; participantName: string },
  starred: StarredIdea[]
): StarredIdea | null {
  // 1. Exact text + participant name (most specific)
  let hit = starred.find(
    (s) => s.text === source.text && s.participantName === source.participantName
  );
  if (hit) return hit;
  // 2. Exact text only
  hit = starred.find((s) => s.text === source.text);
  if (hit) return hit;
  // 3. Normalized text + participant name
  const normSource = normalizeForMatch(source.text);
  hit = starred.find(
    (s) =>
      normalizeForMatch(s.text) === normSource &&
      s.participantName === source.participantName
  );
  if (hit) return hit;
  // 4. Normalized text only
  hit = starred.find((s) => normalizeForMatch(s.text) === normSource);
  if (hit) return hit;
  return null;
}
