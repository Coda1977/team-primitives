# Team Primitives — Implementation Plan

## Context

The existing solo app at `C:\Users\yonat\OneDrive\AI\Apps\AI Playbook` lets one person map AI use cases for their individual role using a 6-primitive framework (Content, Automation, Research, Data, Technical, Strategy). It works well as a personal workshop but can't be used as a team activity.

**Team Primitives** is a new app that keeps the 6-primitive framework but reframes the activity:
- **Unit of analysis:** whole function (HR, Product, Sales, Marketing, etc.) — not one person's role
- **Participation:** multi-person, parallel-solo ideation converging to a team-synthesized board
- **Output:** a consolidated team board showing where independent teammates' priorities cluster and diverge

The new app forks the original's Vite + React + Tailwind front-end (reusing the design system, 6 primitives config, `IdeaCard` / `ChatDrawer` / intake patterns) and replaces localStorage with Convex for shared, real-time state. It drops Phases 3 (Change Strategy) and 4 (Commitment) from the original — scope is ideation only.

Target directory: `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives`

---

## Product decisions (locked)

### Session (set by admin at creation)
- **Function name** (required) — e.g., "HR", "Product Marketing"
- **Team size** (optional)
- **Industry** (optional)

Admin gets two URLs: admin board + shareable participant URL. If the admin wants to ideate, they open the participant URL in a separate tab as a regular participant.

### Per-person intake (3 functional-level questions)
Each teammate answers these three about the **function**, not their personal role:
1. "What does [Function] do well that AI could help you do 10x more of?"
2. "Where does [Function] get stuck or slowed down that AI could help unblock?"
3. "If you could snap your fingers and have AI handle one thing in [Function] tomorrow, what would it be?"

### Ideation flow (per participant)
1. Enter name (no email, no auth) → creates participant, stored in localStorage keyed by session code
2. Fill the 3 intake questions
3. AI generates personalized 6-primitive canvas (2-3 ideas/category) from their intake + function context
4. Refine: per-category "Go Deeper" chat, edit/delete/add cards (same interactions as original PrimitivesView)
5. Star **5 to 10** favorite cards, then click "Submit stars" to lock

### After locking stars (participant side)
- Participant sees their **own completed read-only board** (not a waiting screen)
- Participant can **export their personal board** as .docx at any time after locking
- Participant can **return to their personal board anytime** (read-only — no further edits)
- Once admin runs team synthesis, participant gets access to the **team board** too (toggle between "My board" and "Team board")
- Once admin opens voting, participant gets a **voting view** to cast their votes on the starred ideas

### Admin experience
- Admin URL shows: live roster (who joined, who locked stars, idea/star counts), raw list of starred cards with attribution, shareable participant URL
- Admin clicks **Synthesize** to run the clustering LLM pass across all starred cards from all participants
- Admin sees synthesized clusters (title, summary, category badge, **source count** = how many participants' stars fed this cluster, attribution names) + raw breakdown drill-down
- Admin can re-synthesize as more stars come in (latest run wins)
- Admin configures **votes-per-participant** (e.g., 3, 5, 7 — admin choice per session), then clicks **Open voting**
- Admin watches live vote tallies, closes voting when ready
- Admin exports two artifacts:
  - **Top Ideas (ranked list)** — Word/PDF with ideas ordered by team votes; primary post-vote deliverable
  - **Full board** — optional secondary export with synthesized clusters + raw breakdown per participant

### Team voting phase (new)
After synthesis, admin opens a voting round. Key rules:
- **Unit of voting = individual idea**, not cluster. Clusters are a visual organizing tool only. If two similar ideas sit in one cluster, voters pick the specific idea with the wording they prefer.
- **One vote maximum per idea per person.** No stacking multiple dots on a single idea.
- **Vote budget is admin-configurable per session** (default 3; admin can pick any positive integer when opening voting). Participants can distribute their N votes across any N distinct ideas.
- Participants can change their votes while voting is open; votes lock when admin closes the round.
- **Vote counts hidden from participants while voting is open** (reduces bandwagon bias); admin sees live tallies.
- When admin closes voting → final ranked list is revealed to all participants on the team board.
- **Final output:** ideas sorted by vote count, with cluster badge as metadata. Participant attribution retained. This is what goes into the "Top Ideas" export.

### Identity & permissions
- **Admin** = possession of the `adminKey` query param in URL. Every admin mutation validates it.
- **Participant** = possession of `participantId` stored in localStorage keyed by session code + participantId (key: `aihuddle:${sessionCode}:participantId` → `participantId`). Every participant mutation validates it. Two tabs from the same browser = same participant (they share localStorage).
- **Duplicate names** within a session get `-2`, `-3` slug suffixes.
- **Admin URL loss has no recovery path in MVP.** Admin key only lives in URL. Surface a prominent "Bookmark this URL — it's the only way back" banner + auto-copy to clipboard on session create.

### Session state machine
Two orthogonal status fields on `sessions`:

**`sessions.status`:** `"open" | "closed"`
- `"open"` (default on create) — participants can join; all read/write allowed per phase rules
- `"closed"` — new joins blocked; existing participants retain read access to their board; admin can still read synthesis/votes but cannot re-synthesize or re-open voting
- Transition: admin-only (`closeSession` mutation). No reopening in MVP.

**`sessions.votingStatus`:** `"idle" | "open" | "closed_with_results"`
- `"idle"` (default on create) — no voting round; voting controls disabled; team board (if synthesis ran) shows source counts only, no vote counts
- `"open"` — voting round active; participants can cast/remove votes; admin sees live tallies; participants see "voting in progress — results hidden"
- `"closed_with_results"` — voting closed; ranked list revealed to all; votes frozen; admin can re-open (transitions back to `"open"`, preserving votes)
- Transitions: `openVoting` (admin, requires synthesis complete, sets status → `"open"`); `closeVoting` (admin, status → `"closed_with_results"`); re-opening allowed but the new `votesPerParticipant` must be ≥ the current max-cast-by-any-participant (mutation rejects otherwise)

### Late-joiner policy
**"Allowed in, fully."** Anyone with the participant URL can join at any time while `sessions.status === "open"`, regardless of `votingStatus` or whether synthesis has run. Late joiners go through the full flow:
- Intake → generate canvas → refine → star 5–10 → lock stars
- If synthesis has already run: admin can re-synthesize at any point to incorporate the late joiner's stars
- If voting is already `"open"` when they lock stars: they can cast votes immediately
- If voting closed before they finish: they see the final ranked list read-only (acceptable MVP behavior)

No join-time gates based on session state. `joinSession` mutation only checks `sessions.status === "open"`.

---

## Tech stack

- **Front-end:** Vite 7 + React 19 + Tailwind 4 + React Router 7 (new addition)
- **Backend:** Convex (replaces localStorage + Vercel serverless functions)
- **LLM:** Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`), called via Convex actions
- **Export:** `docx` + `file-saver` (reuse `src/utils/export.js` patterns from original)
- **Deployment:** Vercel + Convex (matches existing `/deploy` slash command)

---

## File structure

```
C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\
├── package.json                                    [ADAPT] add convex, react-router-dom@7
├── vite.config.js                                  [COPY from original]
├── vercel.json                                     [ADAPT] remove `functions` block
├── index.html                                      [COPY]
├── eslint.config.js                                [COPY]
├── AI_PLAYBOOK_BOLD_MODERN_DESIGN_BIBLE.md         [COPY] (rename doc title internally)
├── CLAUDE.md                                       [NEW] team-app flavor, Convex notes
├── .env.local                                      [NEW] VITE_CONVEX_URL
├── convex/
│   ├── schema.ts                                   [NEW] see schema below
│   ├── sessions.ts                                 [NEW] createSession, getSession, closeSession
│   ├── participants.ts                             [NEW] joinSession, listParticipants, getParticipant
│   ├── intake.ts                                   [NEW] submitIntake, getMyIntake
│   ├── canvas.ts                                   [NEW] ideas CRUD, toggleStar, finalizeStars, chat messages
│   ├── synthesis.ts                                [NEW] getLatestSynthesis, listRawStarred
│   ├── votes.ts                                    [NEW] openVoting, closeVoting, castVote, removeVote, listVoteTallies, listMyVotes
│   ├── ownerQueries.ts                             [NEW] super-admin-gated: listAllSessions, getSessionSummary, getAdminKeyForSession, bulkExport (action). All require SUPER_ADMIN_KEY env var.
│   ├── ai/
│   │   ├── generateCanvas.ts                       [NEW action] adapted from api/primitives-generate.js
│   │   ├── chatRefine.ts                           [NEW action] adapted from api/chat.js (primitives branch only)
│   │   └── synthesize.ts                           [NEW action] new cross-participant clustering
│   └── lib/
│       ├── anthropic.ts                            [NEW] thin /v1/messages wrapper
│       └── ids.ts                                  [NEW] short session codes, e.g. "HR-4K2M"
├── src/
│   ├── main.jsx                                    [ADAPT] wrap with ConvexProvider + BrowserRouter
│   ├── App.jsx                                     [REWRITE] router shell (no phase state machine)
│   ├── index.css                                   [COPY]
│   ├── routes/
│   │   ├── AdminCreate.jsx                         [NEW] landing / create session form
│   │   ├── AdminBoard.jsx                          [NEW] roster + raw starred + synthesize + clusters + export
│   │   ├── Join.jsx                                [NEW] name entry
│   │   ├── Participant.jsx                         [NEW] shell; dispatches by participant.phase
│   │   ├── OwnerDashboard.jsx                      [NEW] super-admin cross-session dashboard; sortable table; bulk export
│   │   └── NotFound.jsx                            [NEW]
│   ├── components/
│   │   ├── views/
│   │   │   ├── IntakeView.jsx                      [ADAPT] 3 questions instead of 7
│   │   │   ├── CanvasView.jsx                      [ADAPT from PrimitivesView.jsx]
│   │   │   ├── MyBoardView.jsx                     [NEW] read-only personal board after lock; toggles to team board / vote view / ranked list based on session phase
│   │   │   ├── VoteView.jsx                        [NEW] participant voting UI — starred ideas grouped visually by cluster; one-vote-per-idea; budget counter
│   │   │   └── RankedIdeasView.jsx                 [NEW] shared post-voting display — ideas sorted by vote count with cluster badges; used on both participant + admin views
│   │   ├── primitives/
│   │   │   ├── CategorySection.jsx                 [COPY] works unchanged via dispatch adapter
│   │   │   ├── IdeaCard.jsx                        [COPY]
│   │   │   └── AddIdeaInput.jsx                    [COPY]
│   │   ├── shared/
│   │   │   ├── ChatDrawer.jsx                      [ADAPT] data source → Convex subscriptions + useAction
│   │   │   ├── Header.jsx                          [ADAPT] show session code + function name
│   │   │   ├── GeneratingIndicator.jsx             [COPY] reuse for canvas + synthesis (different step configs)
│   │   │   ├── ConfirmModal.jsx                    [COPY]
│   │   │   ├── ErrorBanner.jsx                     [COPY]
│   │   │   ├── Toast.jsx                           [COPY]
│   │   │   └── PaperGrain.jsx                      [COPY]
│   │   └── admin/
│   │       ├── RosterPanel.jsx                     [NEW]
│   │       ├── RawStarredList.jsx                  [NEW]
│   │       ├── SynthesizeButton.jsx                [NEW]
│   │       ├── ClusterCard.jsx                     [NEW]
│   │       ├── VotingControlsPanel.jsx             [NEW] admin-only — votesPerParticipant input, Open/Close voting buttons, live tally view
│   │       └── ShareLinkPanel.jsx                  [NEW]
│   ├── config/
│   │   ├── categories.js                           [COPY] unchanged 6 primitives
│   │   └── constants.js                            [ADAPT] MIN_STARS=5, MAX_STARS=10; drop LS_KEY
│   ├── context/
│   │   └── ToastContext.jsx                        [COPY]
│   ├── hooks/
│   │   ├── useSession.js                           [NEW]
│   │   ├── useParticipant.js                       [NEW] resolves participant via localStorage map
│   │   └── useCanvasDispatch.js                    [NEW] dispatch-shaped adapter → Convex mutations
│   └── utils/
│       ├── export.js                               [ADAPT] add exportParticipantDocx + exportSynthesisDocx + exportTopIdeasDocx (ranked list is the primary post-vote artifact)
│       ├── localParticipant.js                     [NEW] localStorage helpers for {sessionCode: participantId}
│       └── sessionCode.js                          [NEW]
├── scripts/                                        [NEW — Phase F, simulation harness; not bundled, node-only]
│   ├── simulate-workshop.mjs                       [NEW] orchestrator for npm run simulate / simulate:full
│   ├── personas/                                   [NEW] 10 function briefs + persona archetypes (JSON)
│   │   ├── hr.json
│   │   ├── product-marketing.json
│   │   └── ... (10 total)
│   └── lib/
│       ├── convex-client.mjs                       [NEW] Convex SDK wrapper for mutation/action calls
│       ├── persona-llm.mjs                         [NEW] Anthropic SDK wrapper for persona responses
│       ├── report-writer.mjs                       [NEW] writes reports/YYYY-MM-DD-<run>/ folder tree
│       └── playwright-spotcheck.mjs                [NEW, optional] drives 1 real browser via Playwright MCP concurrent with Node sim
├── reports/                                        [NEW, gitignored] simulator output: per-run folder, per-session data + exports + index.md
└── (no api/ directory — all server logic in Convex)
```

**Dropped from original:** `src/components/views/PlaybookView.jsx`, `src/components/views/CommitmentView.jsx`, `src/components/playbook/*`, `src/components/shared/PhaseProgress.jsx` (no 4-phase linear flow in team app), `src/config/rules.js`, `api/playbook-generate.js`, playbook branch of `api/chat.js`, `src/context/AppContext.jsx` (replaced by Convex), `src/utils/storage.js` (replaced), `src/utils/api.js` (replaced).

**Note on `PaperGrain.jsx`:** original CLAUDE.md says "Paper grain disabled." File is copied as an inert artifact (CSS may reference the class); safe to delete entirely once verified nothing imports it.

**Reuse estimate:** ~70% of UI code is copy or near-copy; 100% of CSS / design system; prompts keep structural skeleton with functional-level copy changes.

---

## Convex schema (high-level)

```
sessions                      { code, functionName, teamSize?, industry?, adminKey, createdAt,
                                status: "open"|"closed",
                                votingStatus: "idle"|"open"|"closed_with_results",
                                votesPerParticipant: number?,
                                origin: "user"|"simulation" }
                              indexes by_code, by_created_at (for super-admin list sort),
                                      by_origin (for super-admin filter)

participants                  { sessionId, name, slug, phase: "intake"|"canvas"|"locked",
                                canvasGeneratedAt?, starsLockedAt?, createdAt }
                              indexes by_session, by_session_and_slug

intakeAnswers                 { sessionId, participantId, strengths, blockers, oneWish, updatedAt }
                              index by_participant

ideas                         { sessionId, participantId, categoryId, text, starred, source, order, createdAt }
                              indexes by_participant, by_participant_and_category, by_session_starred

chatMessages                  { sessionId, participantId, categoryId, role, content, ideas?, createdAt }
                              index by_participant_category
                              (NOTE: `ideas` shape when present: Array<{ text: string,
                               categoryId: string, added: boolean }>. `added` defaults false;
                               flipped to true by `markChatIdeaAdded` mutation when user
                               clicks "Add" in the chat drawer.)

synthesis                     { sessionId, status, ranAt, error?, clusters: [{ id, title, summary,
                                categoryId, memberIdeaIds, participantIds }] }
                              index by_session_ran
                              (NOTE: source count is computed from `participantIds.length`
                               at read time — NOT stored, to prevent drift. It represents
                               how many distinct participants' starred ideas fed this cluster;
                               it is NOT the team-vote count. See `votes` table for true votes.)

votes                         { sessionId, participantId, ideaId, createdAt }
                              indexes by_session, by_participant, by_idea
                              uniqueness: (participantId, ideaId) — enforced in mutation
                              NEW table. One row per vote. Max 1 per (participant, idea) pair.
                              Participant's vote budget = sessions.votesPerParticipant.
```

Key design choices:
- **`ideas` is flat (one row per card)**, not nested under participant — enables the cross-participant `by_session_starred` index the synthesis action needs.
- **Admin = adminKey, participant = participantId.** No accounts.
- **Latest synthesis wins** — admin can re-run, cluster view always shows the most recent.
- **Voting is on ideas, not clusters.** Clusters are purely a display/organizing construct; the `votes` table references `ideaId` directly. Ranking output sorts ideas by vote count globally; cluster membership is shown as a badge/context, not as the grouping.
- **Vote budget is session-scoped** (admin sets `votesPerParticipant` when opening the voting round). Mutation validates `countOfVotesByParticipant(sessionId, participantId) < votesPerParticipant` before inserting.

### Ordering & tie-breaks (explicit rules)
- **Vote view, ideas within a cluster:** alphabetical by `text` (ascending). Stable, avoids primacy bias in how ideas are presented to voters.
- **Vote view, cluster order:** same order synthesis returned (LLM is instructed to sort by source count descending).
- **Ranked list, tie-breaks:** primary sort by vote count descending; ties broken by `ideas.createdAt` ascending (first-voted-for tie wins). This rewards early contribution and is stable across re-renders.
- **Orphan ideas (voted for but no cluster after re-synthesis):** show in ranked list with `[Uncategorized]` badge rather than dropping.

### Error handling UX (all three LLM actions)
All three Convex actions (`generateCanvas`, `chatRefine`, `synthesize`) can fail due to Anthropic 5xx, timeout, or JSON-parse errors. MVP policy:
- **`generateCanvas` failure:** participant sees a full-screen error card with the error message + "Try again" button. No partial state — action is retried atomically; on retry, it deletes any partial ideas first (shouldn't exist but defensive).
- **`chatRefine` failure:** inline error toast in the chat drawer; user's message stays in the input so they can retry. Don't persist assistant turn. No exponential backoff.
- **`synthesize` failure:** `synthesis` row saved with `status: "error"` + error text. Admin board shows "Synthesis failed: ${message} — [Retry]" panel. No partial clusters persisted.

No silent fallbacks. Every failure surfaces to the right user with a retry path.

---

## LLM Prompts (full text)

Three prompts, all via Anthropic `claude-sonnet-4-5-20250929`. Full text below — copy these verbatim as the starting point; iterate on the synthesis prompt against real session data (see Risks §1).

### 1. Canvas generation — `convex/ai/generateCanvas.ts`

Single user turn, one-shot. `max_tokens: 2048`. Parse with `/\{[\s\S]*\}/` regex (matches `api/primitives-generate.js:62`).

```
You are helping a member of the ${functionName} function brainstorm how AI could help their team.
${industry ? "Industry context: " + industry + "." : ""}
${teamSize ? "Team size: " + teamSize + "." : ""}

This person answered 3 questions about their FUNCTION (not their personal role):

1) What does ${functionName} do well that AI could help you do 10x more of?
   ${strengths}

2) Where does ${functionName} get stuck or slowed down that AI could help unblock?
   ${blockers}

3) If you could snap your fingers and have AI handle one thing in ${functionName} tomorrow, what would it be?
   ${oneWish}

Generate 2-3 specific, actionable AI use case ideas for EACH of these 6 categories:
1. Content Creation (text, presentations, reports, communications)
2. Task Automation (repetitive processes, workflows, scheduling)
3. Research & Synthesis (information retrieval, document analysis)
4. Data & Insights (analysis, visualization, pattern recognition)
5. Technical Work (spreadsheets, scripts, tools, systems)
6. Strategy & Ideation (planning, brainstorming, problem-solving)

Each idea MUST:
- Reference concrete ${functionName} work (not generic office tasks).
- Be under 40 words and immediately actionable.
- Draw from the three answers above when possible.

Never invent experiences, metrics, or outcomes this person didn't share.

Respond in this exact JSON format (no markdown fences):
{
  "content": ["idea 1", "idea 2"],
  "automation": ["idea 1", "idea 2"],
  "research": ["idea 1", "idea 2"],
  "data": ["idea 1", "idea 2"],
  "coding": ["idea 1", "idea 2"],
  "ideation": ["idea 1", "idea 2"]
}
```

### 2. Chat refinement — `convex/ai/chatRefine.ts`

Per-category "Go Deeper" chat. `max_tokens: 250` (DO NOT raise — original CLAUDE.md proved 250 is the sweet spot; 200 truncates JSON, 512 gets verbose). Separator parser mirrors `api/chat.js:159-167`.

```
This is a team brainstorming session for the ${functionName} function. Team members each explored ideas for how AI could help them, and we're now diving deeper into one category.

You are helping brainstorm AI applications for ${category.title}: ${category.description}.

PARTICIPANT PROFILE (functional level, not personal role):
- Function: ${functionName}
${industry ? "- Industry: " + industry : ""}
- What ${functionName} does well today: ${intake.strengths}
- Where ${functionName} gets stuck: ${intake.blockers}
- One thing they'd snap their fingers to have AI do: ${intake.oneWish}

CURRENT IDEAS FOR THIS CATEGORY:
${currentBlock}

YOUR STYLE:
- Reference their actual function and the answers above. NO generic advice.
- Each idea MUST be under 40 words. If it's over, cut it.
- If they push back, adapt. Don't rephrase the same idea.
- Never invent experiences, metrics, or outcomes. If suggesting they share a story, leave the content to them.

RESPONSE FORMAT:
First, write your response as plain text. HARD LIMIT: 2-3 sentences, MAX 60 words total. No preamble, no recap, no filler. End with a question that opens a DIFFERENT angle they haven't explored yet.
Then write exactly this separator on its own line:
---IDEAS---
Then write a JSON array of suggested ideas (no markdown fences):
[{"text": "Specific actionable AI idea under 40 words", "categoryId": "${category.id}"}]

BREVITY IS MANDATORY. NEVER write more than 60 words before ---IDEAS---. Count them.
```

### 3. Synthesis / clustering — `convex/ai/synthesize.ts` (the #1 product risk)

One-shot, cross-participant clustering. `max_tokens: 4096`, `temperature: 0.3` (reduce drift between runs). Budget ~1 hour in Phase C to iterate with 2–3 real multi-participant test runs before considering this shippable.

```
You are helping a ${functionName} team see where their AI ideas overlap.

${participantCount} participants each starred their 5-10 favorite AI use case ideas. Below is the raw list.

RAW STARRED IDEAS (${totalStars} total, across ${participantCount} people):

[Content Creation]
- (Jordan) Draft first-pass QBR decks from CRM pipeline data
- (Priya) Turn win/loss notes into personalized outreach scripts
- (Alex) Auto-generate campaign one-pagers from brief + brand guide
...

[Task Automation]
- (Jordan) ...
...

YOUR JOB:
Cluster ideas that mean roughly the same thing, even when worded differently. Each cluster should represent ONE distinct AI application. Keep clusters surprising and specific — do not merge genuinely different ideas just because they share a keyword.

Rules:
- Two ideas belong in the same cluster only if a ${functionName} leader would pick ONE of them over the other (they're interchangeable), not if they're merely related.
- Ideas starred by only one person are valid single-member clusters — include them.
- Write a short cluster TITLE (max 8 words) and SUMMARY (1-2 sentences) that captures what the cluster actually IS, concretely.
- Pick the dominant categoryId: one of content | automation | research | data | coding | ideation.
- List the exact source ideas verbatim so we can trace them back to their ideaId.

Never invent experiences, metrics, or outcomes.

Respond in this exact JSON format (no markdown fences):
{
  "clusters": [
    {
      "title": "Auto-draft QBR decks from CRM data",
      "summary": "Generate first-pass customer review presentations from structured pipeline and account data, ready for human polish.",
      "categoryId": "content",
      "sources": [
        {"participantName": "Jordan", "text": "Draft first-pass QBR decks from CRM pipeline data"},
        {"participantName": "Alex", "text": "Build QBR slides from Salesforce export"}
      ]
    }
  ]
}

Sort clusters by number of sources descending. Do not invent ideas. Every `sources[i].text` MUST appear verbatim from the raw list above so we can map it back to an ideaId.
```

**Source-mapping fallback:** if any `sources[i].text` doesn't exact-match an idea in the raw list, fall back to case-insensitive + whitespace-normalized match. If still unmatched, include the cluster but surface orphan sources in the UI (don't silently drop).

### Chat behavior constraints (preserve from original CLAUDE.md)

These come from the original app's hard-learned lessons — do NOT regress:

- **Static chat openers** — `ChatDrawer` does NOT fire an LLM call on drawer open. Show a static greeting ("Let's explore ${category.title}. What would be most useful to dig into?") and let the user speak first. Eliminates 4–6s of latency and lets the user drive direction.
- **Anti-hallucination constraint** — present in all three prompts above ("Never invent experiences, metrics, or outcomes"). Without this, the model fabricates anecdotes when intake is thin.
- **60-word hard limit** for chat prose — reinforced by `max_tokens: 250`. Both are required; prompt-only instructions don't work reliably.
- **Prompt brevity > prompt stuffing** — when the model gets verbose, TRIM the prompt (model mirrors input energy). Do not add "be brief" instructions on top of a long prompt.

---

## Routes

```
/                                   → AdminCreate
/s/:code/admin?k=:adminKey          → AdminBoard  (invalid adminKey → redirect /)
/s/:code/join                       → Join
/s/:code/p/:slug                    → Participant shell
    phase "intake"                    → IntakeView
    phase "canvas"                    → CanvasView (editable)
    phase "locked"                    → MyBoardView (read-only)
                                        — if synthesis ready: toggle to team board
                                        — if voting open: toggle to voting view
                                        — if voting completed: toggle to final ranked list
/owner?k=:superKey                  → OwnerDashboard  (Phase G; invalid superKey → redirect /)
/*                                  → NotFound
```

---

## Build sequence (MVP-first)

**Total realistic estimate: 6–7 days** for solo build including simulation harness and super-admin dashboard. Breakdown: Phases A–E (core app) = 4–5 days; Phase F (simulator) = ~1 day; Phase G (super-admin dashboard) = ~1 day. Original "half day" estimates per phase were optimistic — they don't account for Anthropic prompt tuning, real-world multi-tab testing, or edge-case polish.

**Phase A — scaffold (~1 day):**
1. `npm create vite@latest` → copy original's package.json deps + add `convex`, `react-router-dom@7`
2. `npx convex dev` to init Convex deployment; set `ANTHROPIC_API_KEY` via `npx convex env set`
3. Copy design files (`index.html`, `index.css`, Design Bible, eslint, `config/categories.js`)
4. Write `convex/schema.ts`, `convex/lib/anthropic.ts`, `convex/lib/ids.ts`
5. Wire `main.jsx` with `ConvexProvider` + `BrowserRouter`; stub 4 routes

**Phase B — single-participant happy path (~1 day):**
6. `convex/sessions.ts` + `AdminCreate.jsx` → admin URL created, session row in dashboard
7. `convex/participants.ts` + `Join.jsx` → participant joins, localStorage seeded
8. Adapt `IntakeView.jsx` → 3 questions → `submitIntake` mutation → triggers `generateCanvas` action
9. Port `generateCanvas.ts` action from `api/primitives-generate.js`; verify 6-category output in `ideas` table
10. Adapt `PrimitivesView.jsx` → `CanvasView.jsx`; replace `dispatch` with `useCanvasDispatch` adapter; star/edit/delete/add all write to Convex
11. Adapt `ChatDrawer.jsx`; port `chatRefine.ts`; verify per-category chat works
12. `finalizeStars` mutation + submit button (5 ≤ stars ≤ 10)
13. `MyBoardView.jsx` — read-only recap with personal export button (`exportParticipantDocx`)

**Phase C — admin board + synthesis (~1 day, plus ~1 hour prompt iteration):**
14. `AdminBoard.jsx` shell with `ShareLinkPanel`, `RosterPanel`, `RawStarredList`, `SynthesizeButton`
15. `listParticipants` and `listRawStarred` queries
16. `synthesize.ts` action + prompt — THIS IS THE ITERATION-HEAVY STEP; expect prompt tweaks
17. `ClusterCard.jsx` renders clusters with title/summary/category badge/source count/attribution
18. Wire participant `MyBoardView` to show team board toggle when `latestSynthesis.status === "ready"`

**Phase D — voting round (~1 day):**
19. Admin controls: `votesPerParticipant` input (number, default 3) + `openVoting` / `closeVoting` mutations
20. `VoteView.jsx` (participant) — shows all starred ideas grouped visually by cluster (cluster title as section header, ideas as voteable cards underneath); vote budget counter at top; one-vote-per-idea checkbox/toggle
21. `castVote` / `removeVote` mutations with server-side budget check (count < votesPerParticipant) and uniqueness check (no duplicate vote on same idea by same participant)
22. Live admin view while voting open: tally per idea (admin-only visibility); participant view shows "voting in progress — results hidden until closed"
23. On `closeVoting`: reveal ranked list to all participants; ideas sorted by vote count; cluster badge as metadata on each idea
24. `RankedIdeasView.jsx` — shared display component used by admin AND locked participants post-vote

**Phase E — export + polish (~1 day):**
25. `exportTopIdeasDocx` — primary deliverable; ranked ideas list with vote count + attribution + cluster badge
26. `exportSynthesisDocx` — secondary/full-board export (clusters + raw breakdown per participant); keep as optional download
27. `exportParticipantDocx` — personal board export (already built in Phase B step 13)
28. Empty states (admin board before anyone joins, "no stars yet" synthesize disabled, "no votes yet" ranking hidden, etc.)
29. Admin "Close session" toggle
30. "Not you? Reset" link on participant to clear localStorage entry
31. Write new CLAUDE.md for the repo

**Phase F — Workshop Simulation harness (~1 day):**
32. Set up a second Convex deployment for staging (`npx convex dev --configure team-primitives-staging`). Simulator targets staging; prod is never polluted by test data.
33. Add `sessions.origin: "user" | "simulation"` field to schema; default `"user"` on live app, `"simulation"` when script creates sessions (via a `create-for-simulation` mutation gated by an env-var key).
34. Build `scripts/simulate-workshop.mjs` — orchestrator. See file structure + behavior below.
35. Build `scripts/personas/*.json` — 10 function briefs (HR, Product Marketing, Sales, Finance, Engineering, Legal, Customer Success, Ops, Marketing, People Ops), each with 5–8 persona archetypes (sub-role + voice sample).
36. Build `scripts/lib/persona-llm.mjs` — wraps Anthropic SDK; given a function brief + persona archetype, generates persona-appropriate intake answers and chat messages. This is the "second LLM" that roleplays each participant.
37. Build `scripts/lib/convex-client.mjs` — thin wrapper around Convex SDK for all mutations/actions needed by the simulator.
38. Build `scripts/lib/playwright-spotcheck.mjs` (optional, uses Playwright MCP if available) — drives ONE real browser through the participant flow in parallel with the Node script, catches UI race conditions the API-level simulator can't see.
39. Report writer: creates `reports/YYYY-MM-DD-<run-id>/index.md` + per-session `data.json` + both `.docx` exports + `run-summary.md` (timing, token usage, errors).
40. Add npm scripts: `simulate:single` (1 session × 6 personas, ~$2, ~2 min), `simulate` (3 × 5, ~$8, ~5 min), `simulate:full` (10 × 6, ~$20, ~10–15 min).

**Phase G — Super-admin dashboard (~1 day):**
41. Add `SUPER_ADMIN_KEY` env var to Convex (via `npx convex env set`). Generate a 32-char random secret. Never exposed to client.
42. Add Convex queries gated by this key: `listAllSessions`, `getSessionSummary(sessionId, superKey)`, `getAdminKeyForSession(sessionId, superKey)` (returns per-session admin key for deep-link), `getSessionExportBundle(sessionId, superKey)`.
43. New route `/owner?k=:superKey` → `OwnerDashboard.jsx`. Validates key via `getSessionForOwner` query; invalid → redirect `/`.
44. Table UI: sortable columns — function, created, origin (user/simulation), participants, ideas total, stars total, synthesis status, voting status, top-voted idea preview (truncated). Row click → new tab to that session's admin URL (super-admin query returns the embedded `adminKey`).
45. Filters: hide simulation runs (toggle), date range, origin, function.
46. Bulk export: "Download selected as ZIP" — Convex action fetches each session's data, generates both `.docx` files per session, zips, returns a download URL. Uses `jszip` (new dep).
47. Known limitation to document: super-admin can see all sessions including participant names + content. Acceptable for Yonatan-as-owner model; would need consent flow if productized.

---

## Simulation harness — file structure + behavior

```
scripts/
├── simulate-workshop.mjs              # orchestrator; npm scripts call this
├── personas/
│   ├── hr.json                        # { function, brief, archetypes: [{ subRole, voice }] }
│   ├── product-marketing.json
│   ├── sales.json
│   ├── finance.json
│   ├── engineering.json
│   ├── legal.json
│   ├── customer-success.json
│   ├── ops.json
│   ├── marketing.json
│   └── people-ops.json
└── lib/
    ├── convex-client.mjs              # Convex SDK wrapper (mutations + actions)
    ├── persona-llm.mjs                # Anthropic SDK → generates persona answers
    ├── report-writer.mjs              # writes reports/ folder contents
    └── playwright-spotcheck.mjs       # optional: drives 1 real browser via Playwright MCP
reports/                               # gitignored; per-run outputs
```

**Per-session flow driven by the simulator:**
1. Create session (`origin: "simulation"`, function from JSON, random team size + industry)
2. For each persona archetype: `joinSession` → `submitIntake` (persona-LLM generates answers) → wait for `generateCanvas` action → 2–3 `chatRefine` turns (persona-LLM generates push-back and follow-ups) → star random 5–8 ideas → `finalizeStars`
3. After all personas locked: `synthesize` action → `openVoting` with random `votesPerParticipant` (3/5/7) → each persona casts votes (persona-LLM picks top ideas aligned with their persona's priorities) → `closeVoting`
4. Call `getSessionExportBundle` → save `top-ideas.docx`, `full-board.docx`, `data.json` to `reports/<run-id>/<session-id>/`
5. Append line to `reports/<run-id>/index.md`: `- [HR session abc123](admin URL) — 6 participants, 47 ideas, 12 clusters, top-voted: "Draft candidate rejection emails from ATS data" (8 votes)`

**Concurrency:** `p-limit(3)` by default — max 3 sessions running simultaneously. Prevents Anthropic rate-limit hits (50 RPM tier 1) and Convex write contention. `--max-concurrency` flag to tune.

**Verification checklist for each simulation run:**
- [ ] All sessions completed without unrecovered errors
- [ ] No Anthropic 429s hit without graceful retry
- [ ] Each `docx` opens in Word without corruption
- [ ] Spot-check 3 random sessions: do the synthesis clusters make sense? Do the top-voted ideas feel like real workshop priorities?
- [ ] Re-run same simulation with identical inputs (seeded persona LLM) — do outputs differ substantially? Flags prompt determinism issues.
- [ ] Total cost and token usage match expectations (within 2×).

---

## Super-admin dashboard — sketch

Route: `/owner?k=:superKey`

Table columns (all sortable):
```
| Function         | Created       | Origin | Parts | Ideas | Stars | Synth? | Voting | Top Idea (8 votes)                  | Actions           |
|------------------|---------------|--------|-------|-------|-------|--------|--------|-------------------------------------|-------------------|
| HR               | 2026-04-24    | sim    |   6   |  47   |  32   |  ✓     | closed | Draft rejection emails from ATS...  | [Open] [Export]   |
| Product Marketing| 2026-04-24    | user   |   5   |  38   |  28   |  ✓     | open   | Auto-generate campaign one-pagers...| [Open] [Export]   |
```

Filters above table: [ ] Hide simulations | [ ] Last 30 days | Function: [any ▾] | Status: [any ▾]

Below table: `[Export all visible as ZIP]` button.

Row click "[Open]" → new tab to `/s/:code/admin?k=<that session's adminKey>` (super-admin query returns it). Same per-session admin board as today, no changes.

"[Export]" in the row → downloads that session's `top-ideas.docx` directly.

"Export all visible as ZIP" → Convex action assembles a ZIP of docx files, returns a signed URL; browser downloads.

Sessions accumulate forever in MVP. If you ever get to hundreds of sessions, add a "Archive" toggle that sets `status: "archived"` and hides from default view.

---

## Key existing code to reuse (paths relative to original `AI Playbook\`)

| Purpose | Source path | Reuse |
|---|---|---|
| 6 primitives + copy | `src/config/categories.js` | Copy verbatim |
| Design tokens | `src/index.css` + `AI_PLAYBOOK_BOLD_MODERN_DESIGN_BIBLE.md` | Copy verbatim |
| Canvas UI (cards, sections, chat trigger) | `src/components/views/PrimitivesView.jsx` | Adapt: swap `dispatch`→`useCanvasDispatch`, `state.primitives`→`useQuery`. Replace `onContinue` prop handler with `finalizeStars` mutation call; drop `onStartOver` prop entirely (no participant-level restart in team app) |
| Idea card interactions | `src/components/primitives/IdeaCard.jsx`, `AddIdeaInput.jsx`, `CategorySection.jsx` | Copy verbatim (work through dispatch adapter) |
| Per-category chat | `src/components/shared/ChatDrawer.jsx` | Adapt data source only; UI unchanged |
| Generation loading animation | `src/components/shared/GeneratingIndicator.jsx` | Copy, parameterize step list |
| Canvas LLM call | `api/primitives-generate.js` | Adapt prompt + port to Convex action |
| Chat LLM call (primitives branch) | `api/chat.js` lines 9-41 (system prompt), 159-167 (parser) | Adapt prompt + port to Convex action |
| Word export | `src/utils/export.js` (esp. `exportPrimitivesDocx`) | Reuse as basis for `exportParticipantDocx` and `exportSynthesisDocx` |
| Intake layout + validation | `src/components/views/IntakeView.jsx` | Adapt to 3 questions; keep word-count hint, gate-bar pattern |
| Toast system | `src/context/ToastContext.jsx`, `src/components/shared/Toast.jsx` | Copy verbatim |
| Confirmation modal | `src/components/shared/ConfirmModal.jsx` | Copy verbatim |

---

## MVP defaults (Plan agent's open questions, decided)

- **Min participants to enable Synthesize:** 2 (hardcoded)
- **Re-generate personal canvas:** not in MVP (no "start over")
- **Admin can kick participant:** not in MVP
- **Min stars is strict (5).** Server-side validated; button disabled client-side.
- **Participants see team board:** yes, toggle between "My board" and "Team board" once admin has run synthesis at least once
- **Voting phase:** default ON; admin can skip by not clicking "Open voting" (session ends at synthesized board if skipped)
- **Default votes per participant:** 3 (admin can override when opening the vote round)
- **Vote unit = individual idea** (not cluster). One vote max per idea per participant. No stacking.
- **Vote visibility:** hidden from participants while open; revealed once admin closes voting

---

## Verification plan (end-to-end)

**Setup:** `npx convex dev` + `npm run dev` in separate terminals. `ANTHROPIC_API_KEY` set in Convex env.

Four browser windows (use incognito to simulate different users):

1. **Admin:** open `/`, create session ("Product Marketing", team size 8, B2B SaaS). Verify redirect to `/s/PM-XXXX/admin?k=...`, roster shows 0 participants, share link panel renders copyable URL.
2. **Participant "Jordan":** paste join URL → name entry → intake (3 questions referencing Product Marketing) → submit. GeneratingIndicator ~4–8s → CanvasView with 6 categories × 2–3 ideas. Admin roster updates live showing "Jordan — canvas, 12 ideas".
3. **Participant "Jordan":** star 6 cards, edit one, delete one, add manual card, open Task Automation chat, send a refinement message, click "Add" on one suggested idea, verify card appears. Counter updates live in admin roster.
4. **Participants "Priya" and "Alex":** repeat step 2–3 with different answers. Star 5 and 8 cards respectively.
5. All three participants click "Submit stars" → `MyBoardView` renders read-only. Each can download personal .docx. Roster shows all three as locked.
6. **Admin:** click Synthesize → 6–15s indicator → cluster view shows ~8–15 clusters, each with title/summary/category/source count/attribution. Spot-check 3 clusters for semantic quality: do similar ideas from different people actually merge? Do distinct ones stay separate?
7. **Participants:** refresh their tabs → toggle to "Team board" → see synthesized clusters (with source-count badges, NOT vote counts).
8. **Admin:** set `votesPerParticipant = 3`, click Open voting. Participants see vote view; admin tally panel shows zeros.
9. **All three participants cast votes.** Jordan puts 3 votes on 3 different ideas. Priya puts 2 on ideas in cluster X, 1 on a standalone idea. Alex tries to vote twice on the same idea (should be rejected; vote count stays at 1). Alex tries to cast a 4th vote (budget exhausted; rejected). All three stop with their budgets exhausted. Admin tally updates live.
10. **Admin:** click Close voting. Ranked list reveals on participant board AND admin board — ideas ordered by vote count, cluster badge as metadata on each.
11. **Admin:** click Export → choose "Top Ideas (ranked list)" → downloads .docx with just the ranked ideas (position, text, vote count, contributor name, cluster badge). Optionally downloads "Full board" for the detailed breakdown.
12. **Resilience:** refresh participant mid-canvas (state persists), open participant URL in second tab (stays in sync on stars AND votes), re-synthesize mid-voting (clusters update but votes on existing ideas persist because votes reference `ideaId`).
13. **Edge cases:** two joiners named "Jordan" (second becomes `jordan-2`), try to star 11 cards (rejected), try to finalize with 4 stars (button disabled + server rejects), admin URL without `k=` (redirect home), synthesize with 0 locked (button disabled), try to open voting before synthesis (button disabled), try to vote when voting closed (mutation rejects), re-open voting after closing (allowed — resets `votingStatus` to "open"; existing votes preserved; admin can change `votesPerParticipant` but must handle case where existing votes exceed new budget — MVP: reject reducing below current max).

### Phase F verification (simulation harness)
14. Run `npm run simulate:single` — expect: 1 session × 6 personas completes end-to-end in ~2 min, costs ~$2 in Anthropic usage, outputs `reports/<date>/index.md` linking to 1 session, per-session folder has `data.json` + 2 `.docx` files.
15. Run `npm run simulate:full` — expect: 10 sessions × 6 personas, ~10–15 min, ~$20. Spot-check 3 random sessions in the real UI via their admin URLs: do synthesis clusters make sense? Do top-voted ideas feel workshop-appropriate?
16. Cross-deployment check: simulated sessions land in `team-primitives-staging` deployment; prod deployment stays empty of `origin: "simulation"` rows.
17. Re-run same simulation twice; diff the outputs. Expect: some variation in LLM outputs but overall themes consistent. If outputs differ dramatically run-to-run, that's a prompt-determinism red flag to address.

### Phase G verification (super-admin dashboard)
18. Open `/owner?k=<SUPER_ADMIN_KEY>` — table shows all sessions from Phase F simulation run + any real sessions created via Phase B-E testing.
19. Invalid superKey (`/owner?k=wrong`) → redirect home. No data leaked to client.
20. Click "Open" on a simulated HR session → new tab opens the admin board for that session (super-admin query returned the embedded adminKey).
21. Sort table by vote count descending — top-voted ideas surface across all sessions.
22. Filter to hide simulations → only `origin: "user"` sessions visible.
23. Click "Export" on one row → downloads that session's `top-ideas.docx`.
24. Select 3 rows → "Export selected as ZIP" → downloads a ZIP with 3 session folders, each with its 2 `.docx` files.
25. Verify `SUPER_ADMIN_KEY` is never visible in client bundle (`grep` the Vite output after `npm run build` — should be 0 hits on the actual secret value).

---

## Critical files for implementation

Highest-leverage files to build carefully; the rest cascades from these:

- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\convex\schema.ts`
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\convex\ai\synthesize.ts` (prompt is the #1 product risk)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\convex\ai\generateCanvas.ts`
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\convex\votes.ts` (NEW — cast/remove vote mutations with budget + uniqueness checks)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\hooks\useCanvasDispatch.js` (key to reusing PrimitivesView components unchanged)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\routes\AdminBoard.jsx`
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\components\views\MyBoardView.jsx`
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\components\views\VoteView.jsx` (NEW — participant voting UI)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\components\views\RankedIdeasView.jsx` (NEW — shared post-voting display)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\utils\export.js` (adapt: add `exportTopIdeasDocx` as primary post-vote artifact)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\scripts\simulate-workshop.mjs` (NEW — Phase F orchestrator)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\scripts\lib\persona-llm.mjs` (NEW — Anthropic-driven persona responses)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\routes\OwnerDashboard.jsx` (NEW — Phase G super-admin dashboard)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\convex\ownerQueries.ts` (NEW — super-admin-gated queries + bulk export action)

---

## Mobile support

The app targets both desktop and mobile. Workshops happen in-person (facilitator on laptop, participants on phones) and async (everyone on their own device).

**What comes for free from the original:**
- Original design system is responsive (Tailwind breakpoints at 992px / 768px / 576px per the Design Bible). Card grids reflow to single column on mobile. IdeaCard, CategorySection, ChatDrawer, IntakeView all inherit these responsive patterns when copied/adapted.
- Montserrat renders well at mobile sizes. Touch targets on IdeaCard (star, edit, delete) are already sized for thumb use in the original.

**What needs explicit mobile treatment in the new components:**
- **`AdminBoard.jsx`** (NEW) — has the most density (roster + raw starred + synthesize button + cluster view + voting controls + export). Use a tabbed layout on mobile (<768px): tabs for "Roster", "Ideas", "Synthesis", "Voting", "Export". On desktop, all sections visible simultaneously.
- **`VoteView.jsx`** (NEW) — with 80+ voteable ideas, mobile needs:
  - Sticky vote-budget counter at top (shows `{used}/{budget} votes`)
  - Sticky cluster section headers so user knows which cluster they're scrolling through
  - Large tap targets on vote toggles (minimum 44×44px)
  - Vote checkbox on the right edge of each idea card (thumb-friendly reach)
- **`RankedIdeasView.jsx`** (NEW) — simple vertical list; naturally mobile-friendly. Just ensure vote-count chip and cluster badge remain legible at small widths.
- **`Join.jsx`** (NEW) — single name input; trivially mobile-friendly, just use `autoComplete="off"`, `autoFocus`, and appropriate keyboard via `inputMode="text"`.

**What to verify during Phase E polish:**
- Participant flow end-to-end on 375×812 (iPhone SE size) — intake fields, canvas, chat drawer, vote view all usable with one thumb.
- Chat drawer on mobile should be full-screen overlay (not side panel) — check the original ChatDrawer already handles this; if not, add media query.
- Admin flow at ≥768px only is acceptable for MVP (workshops are typically admin-on-laptop). Flag in CLAUDE.md for the new repo.

**Out of MVP scope:** tablet-specific optimizations, landscape-phone optimizations, PWA/install, offline support.

---

## Risks to watch during build

1. **Synthesis prompt quality.** Mushy clusters = bad product. Budget an hour in Phase C to iterate against 2–3 real multi-participant test runs. `temperature: 0.3` to reduce drift. Keep raw starred list visible as a safety net.
2. **LLM latency masking.** Canvas gen can hit 8–12s cold. The existing `GeneratingIndicator` 6-step animation already masks this well; do NOT swap it for a bare spinner.
3. **Admin URL loss.** Admin key only lives in URL. Surface a "Bookmark this — only way back" banner on session creation. Optional: auto-copy admin URL to clipboard on create. No recovery path in MVP — accept this limitation explicitly.
4. **Verbatim source match in synthesis.** If LLM paraphrases source cards, we can't map to `ideaId`. Fallback: case/whitespace-normalized match; surface unmatched sources rather than dropping.
5. **Multi-tab same-participant:** make `finalizeStars` idempotent (no-op if already locked). Same for `openVoting`, `closeVoting`, and `castVote` — every state-changing mutation must handle the "already in that state" case as a no-op, not an error.
6. **`castVote` vs. `closeVoting` race.** If participant sends castVote at the same moment admin sends closeVoting, both hit Convex within milliseconds. Design: `closeVoting` mutation reads `sessions.votingStatus`, sets to `"closed_with_results"`, writes. `castVote` reads `sessions.votingStatus` first and rejects if !== `"open"`. Convex serializes mutations per-document, so this works cleanly if both operate on `sessions`. Verify in testing.
7. **Re-synthesis mid-voting.** Votes reference `ideaId` (stable), so votes persist across synthesis re-runs. But clusters may change — the ranked list UI must handle "voted idea now has no cluster membership" gracefully (show as `[Uncategorized]`).
8. **Vote UI at scale.** 10 participants × 8 stars = up to 80 voteable ideas (fewer if starred ideas overlap). UI needs sticky cluster headers + smooth scroll. Virtualization not required at this scale, but flag if usage grows.
9. **Participant identity is "whoever holds the slug + localStorage entry."** Two people sharing a laptop both become "Jordan" unless different browser profiles. Mitigation: prominent participant name displayed in Header; "Not you? Reset" link clears localStorage and re-routes to `/join`.
