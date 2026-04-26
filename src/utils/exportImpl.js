// Word/PDF exports for Team Primitives.
//
// Three deliverables:
// 1. exportTopIdeasDocx — primary post-vote artifact: ranked list with top-3
//    emphasis, methodology footer.
// 2. exportSynthesisDocx — secondary "full board" export: synthesized themes
//    + raw breakdown by participant.
// 3. exportParticipantDocx — personal export: a participant's own canvas
//    (all ideas, starred ones marked).
//
// Each public function accepts `{ save = true }`. When save is true (default),
// triggers a browser download via file-saver. When false, returns
// `{ blob, filename }` so the caller can bundle into a zip etc.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { CATEGORIES } from "../config/categories";

// ---------------- helpers ----------------

const RED = "E30613";
const BLACK = "000000";
const DARK_GRAY = "333333";
const GRAY_500 = "666666";
const LIGHT_GRAY = "CCCCCC";

function dateString(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function categoryTitle(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId)?.title ?? categoryId;
}

function safeFilename(s) {
  return (s || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function kicker(text) {
  return new Paragraph({
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 18, // 9pt
        characterSpacing: 80,
        color: GRAY_500,
      }),
    ],
  });
}

function hairline() {
  return new Paragraph({
    border: {
      bottom: { color: LIGHT_GRAY, space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: 120, after: 240 },
  });
}

function sectionHeader(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before ?? 320, after: opts.after ?? 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32, // 16pt
        color: BLACK,
      }),
    ],
  });
}

// ---------------- 1. exportTopIdeasDocx ----------------
// Post-vote ranked list — the primary deliverable a facilitator hands back
// to the group. Cover + Top 3 + Full ranked list + methodology footer.

export async function exportTopIdeasDocx({ session, ranked, totalVotes, participants, save = true }) {
  if (!ranked || ranked.length === 0) {
    throw new Error("No ranked ideas to export");
  }

  // Compute display ranks with tie handling
  const withRank = [];
  let prev = null;
  let rank = 0;
  ranked.forEach((idea, i) => {
    if (idea.voteCount !== prev) {
      rank = i + 1;
      prev = idea.voteCount;
    }
    withRank.push({ ...idea, rank });
  });
  const top3 = withRank.filter((i) => i.rank <= 3);
  const rest = withRank.filter((i) => i.rank > 3);
  const hasTies = withRank.some(
    (i, idx, arr) => idx > 0 && arr[idx - 1].voteCount === i.voteCount
  );
  const totalParticipants = participants?.length ?? 0;
  const votesPerParticipant = session.votesPerParticipant ?? 3;

  const children = [];

  // Cover page
  children.push(kicker("Team Primitives"));
  children.push(
    new Paragraph({
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: session.functionName,
          bold: true,
          size: 56, // 28pt display
          color: BLACK,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({
          text: "Team AI Priorities",
          size: 32, // 16pt
          color: DARK_GRAY,
        }),
      ],
    })
  );
  const subtitleParts = [];
  if (session.industry) subtitleParts.push(session.industry);
  if (session.teamSize) subtitleParts.push(`team of ${session.teamSize}`);
  subtitleParts.push(dateString(session.createdAt));
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: subtitleParts.join(" · "),
          size: 20,
          color: GRAY_500,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `${totalParticipants} ${
            totalParticipants === 1 ? "person voted" : "people voted"
          } · ${votesPerParticipant} ${
            votesPerParticipant === 1 ? "vote" : "votes"
          } each · ${totalVotes} ${totalVotes === 1 ? "vote" : "votes"} cast total`,
          size: 20,
          color: DARK_GRAY,
        }),
      ],
    })
  );
  children.push(hairline());

  // Top 3 priorities
  children.push(kicker("Top priorities"));
  top3.forEach((idea, i) => {
    children.push(
      new Paragraph({
        spacing: { before: i === 0 ? 0 : 320, after: 120 },
        children: [
          new TextRun({
            text: `#${idea.rank}`,
            bold: true,
            size: 64, // 32pt
            color: idea.rank === 1 ? RED : DARK_GRAY,
          }),
          new TextRun({
            text: `   ${idea.voteCount} ${idea.voteCount === 1 ? "vote" : "votes"}`,
            size: 20,
            color: GRAY_500,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: idea.title,
            bold: true,
            size: 32, // 16pt
            color: BLACK,
          }),
        ],
      })
    );
    if (idea.summary) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: idea.summary,
              size: 22,
              color: DARK_GRAY,
            }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: `${categoryTitle(idea.categoryId)} · `,
            size: 20,
            color: GRAY_500,
            italics: true,
          }),
          new TextRun({
            text: idea.contributorNames.join(", "),
            size: 20,
            color: DARK_GRAY,
          }),
        ],
      })
    );
  });

  // Full ranked list
  if (rest.length > 0) {
    children.push(hairline());
    children.push(kicker("All ideas, ranked"));
    rest.forEach((idea) => {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `#${idea.rank}  `,
              bold: true,
              size: 22,
              color: GRAY_500,
            }),
            new TextRun({
              text: idea.title,
              bold: true,
              size: 22,
              color: BLACK,
            }),
            new TextRun({
              text: `   ${idea.voteCount} ${idea.voteCount === 1 ? "vote" : "votes"}`,
              size: 18,
              color: idea.voteCount === 0 ? GRAY_500 : DARK_GRAY,
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${categoryTitle(idea.categoryId)} · ${idea.contributorNames.join(", ")}`,
              size: 18,
              color: GRAY_500,
              italics: true,
            }),
          ],
        })
      );
    });
  }

  // Methodology footer
  children.push(hairline());
  children.push(kicker("Methodology"));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${totalParticipants} participants each starred 5–10 favorite ideas. AI clustered the starred ideas into ${ranked.length} themes (duplicates removed). Each participant then voted with ${votesPerParticipant} ${
            votesPerParticipant === 1 ? "vote" : "votes"
          } (one per idea, one vote max per idea). This list is ranked by total votes${
            hasTies ? "; ties broken by which idea was contributed first" : ""
          }.`,
          size: 18,
          color: DARK_GRAY,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: `Generated by Team Primitives · ${dateString(Date.now())} · Session ${session.code}`,
          size: 16,
          color: GRAY_500,
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const filename = `${safeFilename(session.functionName)}-${session.code}-top-ideas.docx`;
  if (save !== false) saveAs(blob, filename);
  return { blob, filename };
}

// ---------------- 2. exportSynthesisDocx ----------------
// Full board: synthesized themes + raw breakdown by participant. Optional
// secondary export.

export async function exportSynthesisDocx({ session, ranked, synthesis, starred, participants, save = true }) {
  if (!synthesis || synthesis.status !== "ready") {
    throw new Error("No synthesis to export");
  }

  const totalParticipants = participants?.length ?? 0;
  const children = [];

  // Cover
  children.push(kicker("Team Primitives"));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: session.functionName,
          bold: true,
          size: 56,
          color: BLACK,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Full Workshop Board",
          size: 32,
          color: DARK_GRAY,
        }),
      ],
    })
  );
  const subtitleParts = [];
  if (session.industry) subtitleParts.push(session.industry);
  if (session.teamSize) subtitleParts.push(`team of ${session.teamSize}`);
  subtitleParts.push(dateString(session.createdAt));
  children.push(
    new Paragraph({
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: subtitleParts.join(" · "),
          size: 20,
          color: GRAY_500,
        }),
      ],
    })
  );
  children.push(hairline());

  // Synthesized themes (ordered by votes if available, else by source count)
  children.push(sectionHeader("Synthesized themes", { before: 0 }));
  const orderedThemes =
    ranked && ranked.length > 0
      ? ranked
      : synthesis.clusters
          .map((c) => ({
            ...c,
            voteCount: 0,
            contributorNames: [],
          }))
          .sort((a, b) => b.participantIds.length - a.participantIds.length);

  orderedThemes.forEach((theme) => {
    children.push(
      new Paragraph({
        spacing: { before: 280, after: 80 },
        children: [
          new TextRun({
            text: theme.title,
            bold: true,
            size: 26,
            color: BLACK,
          }),
        ],
      })
    );
    if (theme.summary) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: theme.summary,
              size: 20,
              color: DARK_GRAY,
            }),
          ],
        })
      );
    }
    const metaParts = [
      categoryTitle(theme.categoryId),
      `${theme.participantIds.length} ${
        theme.participantIds.length === 1 ? "voter" : "voters"
      }`,
    ];
    if (theme.voteCount !== undefined && theme.voteCount > 0) {
      metaParts.push(
        `${theme.voteCount} ${theme.voteCount === 1 ? "vote" : "votes"}`
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: metaParts.join(" · "),
            size: 18,
            color: GRAY_500,
            italics: true,
          }),
        ],
      })
    );
    if (theme.contributorNames && theme.contributorNames.length > 0) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `Sourced from: ${theme.contributorNames.join(", ")}`,
              size: 18,
              color: GRAY_500,
            }),
          ],
        })
      );
    }
  });

  // Raw breakdown by participant
  children.push(hairline());
  children.push(sectionHeader("Raw starred ideas — by participant"));
  const byParticipant = new Map();
  for (const idea of starred ?? []) {
    const k = idea.participantId;
    if (!byParticipant.has(k))
      byParticipant.set(k, { name: idea.participantName, ideas: [] });
    byParticipant.get(k).ideas.push(idea);
  }
  for (const [, group] of byParticipant) {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: group.name,
            bold: true,
            size: 22,
            color: BLACK,
          }),
          new TextRun({
            text: `   ${group.ideas.length} starred`,
            size: 18,
            color: GRAY_500,
            italics: true,
          }),
        ],
      })
    );
    group.ideas.forEach((idea) => {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: `${categoryTitle(idea.categoryId)}: `,
              bold: true,
              size: 20,
              color: DARK_GRAY,
            }),
            new TextRun({
              text: idea.text,
              size: 20,
              color: BLACK,
            }),
          ],
        })
      );
    });
  }

  children.push(hairline());
  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Generated by Team Primitives · ${dateString(Date.now())} · Session ${session.code} · ${totalParticipants} participants`,
          size: 16,
          color: GRAY_500,
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const filename = `${safeFilename(session.functionName)}-${session.code}-full-board.docx`;
  if (save !== false) saveAs(blob, filename);
  return { blob, filename };
}

// ---------------- 3. exportParticipantDocx ----------------
// Personal: one participant's own canvas.

export async function exportParticipantDocx({ session, participant, canvas, save = true }) {
  const children = [];

  children.push(kicker("Team Primitives · Personal"));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: participant.name + "'s ideas",
          bold: true,
          size: 48,
          color: BLACK,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `${session.functionName} workshop · ${dateString(session.createdAt)}`,
          size: 22,
          color: DARK_GRAY,
        }),
      ],
    })
  );
  children.push(hairline());

  // Compute counts
  let total = 0;
  let starred = 0;
  for (const cat of CATEGORIES) {
    const arr = canvas?.[cat.id] ?? [];
    total += arr.length;
    starred += arr.filter((i) => i.starred).length;
  }
  children.push(kicker("Summary"));
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${total} ideas · ${starred} starred for the team`,
          size: 22,
          color: BLACK,
        }),
      ],
    })
  );

  CATEGORIES.forEach((cat) => {
    const ideas = canvas?.[cat.id] ?? [];
    if (ideas.length === 0) return;
    children.push(
      new Paragraph({
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: `${cat.number}. ${cat.title}`,
            bold: true,
            size: 26,
            color: BLACK,
          }),
        ],
      })
    );
    ideas.forEach((idea) => {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: idea.starred ? "★ " : "",
              bold: true,
              color: RED,
              size: 22,
            }),
            new TextRun({
              text: idea.text,
              size: 22,
              color: BLACK,
            }),
          ],
        })
      );
    });
  });

  children.push(hairline());
  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Generated by Team Primitives · ${dateString(Date.now())}`,
          size: 16,
          color: GRAY_500,
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const filename = `${safeFilename(session.functionName)}-${participant.slug}-ideas.docx`;
  if (save !== false) saveAs(blob, filename);
  return { blob, filename };
}

// ---------------- 4. exportAllSessionsZip ----------------
// Bulk export: top-ideas docx for every session that has ranked results,
// zipped up as a single download. Sessions with no ranked ideas (pre-vote)
// are skipped silently. Caller provides a fetchBundle function that returns
// the export bundle for a given sessionId.

export async function exportAllSessionsZip({ sessions, fetchBundle, onProgress }) {
  if (!sessions || sessions.length === 0) {
    throw new Error("No sessions to export");
  }
  const zip = new JSZip();
  let included = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    onProgress?.({ current: i + 1, total: sessions.length, sessionCode: s.code });
    try {
      const bundle = await fetchBundle(s._id);
      if (!bundle || !bundle.ranked || bundle.ranked.length === 0) {
        skipped += 1;
        continue;
      }
      const { blob, filename } = await exportTopIdeasDocx({
        session: bundle.session,
        ranked: bundle.ranked,
        totalVotes: bundle.totalVotes,
        participants: bundle.participants,
        save: false,
      });
      zip.file(filename, blob);
      included += 1;
    } catch (err) {
      errors.push({ code: s.code, message: err?.message ?? String(err) });
    }
  }

  if (included === 0) {
    throw new Error(
      `No sessions had ranked results to export${
        skipped ? ` (${skipped} skipped: pre-vote)` : ""
      }${errors.length ? `; ${errors.length} errored` : ""}.`
    );
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const ts = new Date().toISOString().slice(0, 10);
  const filename = `team-primitives-${ts}.zip`;
  saveAs(zipBlob, filename);

  return { included, skipped, errors, filename };
}
