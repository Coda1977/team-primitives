import { describe, expect, it } from "vitest";
import { findIdea, normalizeForMatch } from "./findIdea";

// Helper: build a StarredIdea with sensible defaults so tests can focus on
// just the text/participant fields under test.
function idea(text: string, participantName: string, _id = `${participantName}-${text}`) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cast = (v: unknown) => v as any;
  return {
    _id: cast(_id),
    text,
    categoryId: "ideation",
    participantId: cast(`pid-${participantName}`),
    participantName,
  };
}

describe("normalizeForMatch", () => {
  it("lowercases", () => {
    expect(normalizeForMatch("HELLO")).toBe("hello");
  });
  it("collapses runs of whitespace to single spaces", () => {
    expect(normalizeForMatch("a   b\tc\nd")).toBe("a b c d");
  });
  it("trims leading/trailing whitespace", () => {
    expect(normalizeForMatch("   foo  ")).toBe("foo");
  });
});

describe("findIdea", () => {
  const corpus = [
    idea("Auto-draft QBR decks", "Alex"),
    idea("Draft QBR decks first-pass", "Alex"),
    idea("Auto-draft QBR decks", "Brit"),
    idea("Triage support tickets by sentiment", "Casey"),
  ];

  it("matches exact text + participant name (tier 1)", () => {
    const hit = findIdea(
      { text: "Auto-draft QBR decks", participantName: "Brit" },
      corpus
    );
    expect(hit?.participantName).toBe("Brit");
  });

  it("falls back to exact text only when participant name doesn't match (tier 2)", () => {
    const hit = findIdea(
      { text: "Auto-draft QBR decks", participantName: "Ghost" },
      corpus
    );
    // Tier 1 misses (no Ghost). Tier 2 hits the first exact-text match.
    expect(hit?.text).toBe("Auto-draft QBR decks");
  });

  it("falls back to normalized text + participant name (tier 3)", () => {
    const hit = findIdea(
      { text: "  auto-draft   qbr decks  ", participantName: "Alex" },
      corpus
    );
    expect(hit?.participantName).toBe("Alex");
    expect(hit?.text).toBe("Auto-draft QBR decks");
  });

  it("falls back to normalized text only (tier 4)", () => {
    const hit = findIdea(
      { text: "TRIAGE\tsupport tickets   by sentiment", participantName: "Ghost" },
      corpus
    );
    expect(hit?.text).toBe("Triage support tickets by sentiment");
  });

  it("returns null when no tier matches", () => {
    const hit = findIdea(
      { text: "Forecast demand by quarter", participantName: "Alex" },
      corpus
    );
    expect(hit).toBeNull();
  });

  it("disambiguates between two participants who starred the same text", () => {
    const alexHit = findIdea(
      { text: "Auto-draft QBR decks", participantName: "Alex" },
      corpus
    );
    const britHit = findIdea(
      { text: "Auto-draft QBR decks", participantName: "Brit" },
      corpus
    );
    expect(alexHit?.participantName).toBe("Alex");
    expect(britHit?.participantName).toBe("Brit");
    expect(alexHit?._id).not.toBe(britHit?._id);
  });

  it("prefers the exact + name match even when a normalized + name match also exists", () => {
    const corpusWithBoth = [
      idea("auto-draft   qbr decks", "Alex", "messy"),
      idea("Auto-draft QBR decks", "Alex", "clean"),
    ];
    const hit = findIdea(
      { text: "Auto-draft QBR decks", participantName: "Alex" },
      corpusWithBoth
    );
    expect(hit?._id).toBe("clean");
  });

  it("returns null on empty corpus", () => {
    expect(findIdea({ text: "anything", participantName: "Alex" }, [])).toBeNull();
  });
});
