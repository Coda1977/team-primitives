import { describe, expect, it } from "vitest";
import {
  exportTopIdeasDocx,
  exportSynthesisDocx,
  exportParticipantDocx,
} from "./exportImpl.js";

// Fixture builders. Keep small — these are smoke tests that confirm each
// export function produces a non-trivial Word document with the expected
// filename, not a check on every byte of docx output.

function makeSession(overrides = {}) {
  return {
    code: "HR-4K2M",
    functionName: "Human Resources",
    industry: "B2B SaaS",
    teamSize: 6,
    createdAt: Date.UTC(2026, 3, 1),
    ...overrides,
  };
}

function makeRanked() {
  return [
    {
      id: "c1",
      title: "Auto-draft offer letters from ATS data",
      summary: "Pull candidate fields and produce a polished first-pass offer letter.",
      categoryId: "content",
      memberIdeaIds: ["i1", "i2"],
      anchorIdeaId: "i1",
      participantIds: ["p1", "p2"],
      contributorNames: ["Alex", "Brit"],
      voteCount: 4,
      earliestCreatedAt: 100,
    },
    {
      id: "c2",
      title: "Triage applicant questions automatically",
      summary: "",
      categoryId: "automation",
      memberIdeaIds: ["i3"],
      anchorIdeaId: "i3",
      participantIds: ["p3"],
      contributorNames: ["Casey"],
      voteCount: 2,
      earliestCreatedAt: 200,
    },
  ];
}

function makeParticipants() {
  return [
    { _id: "p1", name: "Alex", phase: "locked" },
    { _id: "p2", name: "Brit", phase: "locked" },
    { _id: "p3", name: "Casey", phase: "locked" },
  ];
}

describe("exportTopIdeasDocx", () => {
  it("returns a non-empty .docx blob and a slugified filename", async () => {
    const { blob, filename } = await exportTopIdeasDocx({
      session: makeSession(),
      ranked: makeRanked(),
      totalVotes: 6,
      participants: makeParticipants(),
      save: false,
    });
    expect(blob.size).toBeGreaterThan(1000);
    expect(filename.endsWith(".docx")).toBe(true);
    // Filename = `${safeFilename(functionName)}-${session.code}-top-ideas.docx`.
    // safeFilename only lowercases its argument; session.code stays uppercase.
    expect(filename).toContain("HR-4K2M");
    expect(filename).toContain("human-resources");
  });

  it("throws when no ranked ideas are provided", async () => {
    await expect(
      exportTopIdeasDocx({
        session: makeSession(),
        ranked: [],
        totalVotes: 0,
        participants: [],
        save: false,
      })
    ).rejects.toThrow(/no ranked/i);
  });
});

describe("exportSynthesisDocx", () => {
  it("returns a non-empty .docx blob with the session code in the filename", async () => {
    const synthesis = {
      status: "ready",
      ranAt: Date.UTC(2026, 3, 5),
      clusters: [
        {
          id: "c1",
          title: "Auto-draft offer letters",
          summary: "From ATS fields.",
          categoryId: "content",
          memberIdeaIds: ["i1"],
          participantIds: ["p1"],
        },
      ],
    };
    const starred = [
      {
        _id: "i1",
        text: "Auto-draft offer letters from ATS data",
        categoryId: "content",
        participantId: "p1",
        participantName: "Alex",
      },
    ];
    const { blob, filename } = await exportSynthesisDocx({
      session: makeSession(),
      ranked: makeRanked(),
      synthesis,
      starred,
      participants: makeParticipants(),
      save: false,
    });
    expect(blob.size).toBeGreaterThan(1000);
    expect(filename.endsWith(".docx")).toBe(true);
    expect(filename).toContain("HR-4K2M");
  });
});

describe("exportParticipantDocx", () => {
  it("returns a non-empty .docx blob keyed by participant name", async () => {
    const participant = { _id: "p1", name: "Alex", slug: "alex" };
    const canvas = {
      content: [
        {
          _id: "i1",
          text: "Auto-draft offer letters",
          starred: true,
          source: "ai",
          createdAt: 1,
          order: 0,
        },
      ],
      automation: [
        {
          _id: "i2",
          text: "Triage tickets",
          starred: false,
          source: "manual",
          createdAt: 2,
          order: 0,
        },
      ],
    };
    const { blob, filename } = await exportParticipantDocx({
      session: makeSession(),
      participant,
      canvas,
      save: false,
    });
    expect(blob.size).toBeGreaterThan(500);
    expect(filename.endsWith(".docx")).toBe(true);
    expect(filename.toLowerCase()).toContain("alex");
  });
});

describe("safeFilename behavior (via export filenames)", () => {
  it("strips illegal characters from the function-name portion of the filename", async () => {
    const { filename } = await exportTopIdeasDocx({
      session: makeSession({ functionName: "  Sales / Customer  Success!! " }),
      ranked: makeRanked(),
      totalVotes: 1,
      participants: makeParticipants(),
      save: false,
    });
    // safeFilename runs on the function name only; the session code stays
    // uppercase. Pull out the function-name slug from the filename pattern
    // and assert it's clean.
    const match = filename.match(/^([^-]+(?:-[^-]+)*?)-HR-4K2M-/);
    expect(match).not.toBeNull();
    const slug = match[1];
    expect(slug).toBe("sales-customer-success");
    expect(slug).not.toMatch(/[^a-z0-9-]/);
  });
});
