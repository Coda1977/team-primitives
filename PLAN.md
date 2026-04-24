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
- **Participant** = possession of `participantId` stored in localStorage keyed by session code. Every participant mutation validates it.
- **Duplicate names** within a session get `-2`, `-3` slug suffixes.

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
└── (no api/ directory — all server logic in Convex)
```

**Dropped from original:** `src/components/views/PlaybookView.jsx`, `src/components/views/CommitmentView.jsx`, `src/components/playbook/*`, `src/config/rules.js`, `api/playbook-generate.js`, playbook branch of `api/chat.js`, `src/context/AppContext.jsx` (replaced by Convex), `src/utils/storage.js` (replaced), `src/utils/api.js` (replaced).

**Reuse estimate:** ~70% of UI code is copy or near-copy; 100% of CSS / design system; prompts keep structural skeleton with functional-level copy changes.

---

## Convex schema (high-level)

```
sessions                      { code, functionName, teamSize?, industry?, adminKey, status, createdAt,
                                votingStatus: "closed"|"open"|"completed", votesPerParticipant: number? }
                              index by_code

participants                  { sessionId, name, slug, phase: "intake"|"canvas"|"locked",
                                canvasGeneratedAt?, starsLockedAt?, createdAt }
                              indexes by_session, by_session_and_slug

intakeAnswers                 { sessionId, participantId, strengths, blockers, oneWish, updatedAt }
                              index by_participant

ideas                         { sessionId, participantId, categoryId, text, starred, source, order, createdAt }
                              indexes by_participant, by_participant_and_category, by_session_starred

chatMessages                  { sessionId, participantId, categoryId, role, content, ideas?, createdAt }
                              index by_participant_category

synthesis                     { sessionId, status, ranAt, error?, clusters: [{ id, title, summary,
                                categoryId, memberIdeaIds, participantIds, sourceCount }] }
                              index by_session_ran
                              (NOTE: `sourceCount` replaces earlier `voteCount` naming —
                               it represents how many participants' starred ideas fed this cluster;
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

---

## LLM prompts (key points)

Detailed prompts live in the Plan agent's blueprint (above in conversation). Key specs:

1. **Canvas generation** (`convex/ai/generateCanvas.ts`) — mirrors `api/primitives-generate.js`. Inputs: function name + industry + team size + 3 intake answers. Output JSON: `{content, automation, research, data, coding, ideation}` arrays. `max_tokens: 2048`. Adds strict "functional level, not personal role" framing and "never invent experiences/metrics/outcomes" guardrail.

2. **Chat refinement** (`convex/ai/chatRefine.ts`) — mirrors `api/chat.js` primitives branch. Keeps the `---IDEAS---` separator parsing at `api/chat.js:159-167`. `max_tokens: 250` (proven brevity lever per original CLAUDE.md — do not change).

3. **Synthesis / clustering** (`convex/ai/synthesize.ts`) — NEW prompt. Clusters all starred cards across all participants. Explicit rule: "two ideas go in the same cluster only if a leader would pick ONE over the other." Instructed to echo sources verbatim so we can map back to `ideaId`. `max_tokens: 4096`, suggested `temperature: 0.3` to reduce run-to-run drift. Synthesis quality is the #1 product risk — budget an hour to iterate on this prompt with real session data.

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
/*                                  → NotFound
```

---

## Build sequence (MVP-first)

**Phase A — scaffold (half day):**
1. `npm create vite@latest` → copy original's package.json deps + add `convex`, `react-router-dom@7`
2. `npx convex dev` to init Convex deployment; set `ANTHROPIC_API_KEY` via `npx convex env set`
3. Copy design files (`index.html`, `index.css`, Design Bible, eslint, `config/categories.js`)
4. Write `convex/schema.ts`, `convex/lib/anthropic.ts`, `convex/lib/ids.ts`
5. Wire `main.jsx` with `ConvexProvider` + `BrowserRouter`; stub 4 routes

**Phase B — single-participant happy path (half day):**
6. `convex/sessions.ts` + `AdminCreate.jsx` → admin URL created, session row in dashboard
7. `convex/participants.ts` + `Join.jsx` → participant joins, localStorage seeded
8. Adapt `IntakeView.jsx` → 3 questions → `submitIntake` mutation → triggers `generateCanvas` action
9. Port `generateCanvas.ts` action from `api/primitives-generate.js`; verify 6-category output in `ideas` table
10. Adapt `PrimitivesView.jsx` → `CanvasView.jsx`; replace `dispatch` with `useCanvasDispatch` adapter; star/edit/delete/add all write to Convex
11. Adapt `ChatDrawer.jsx`; port `chatRefine.ts`; verify per-category chat works
12. `finalizeStars` mutation + submit button (5 ≤ stars ≤ 10)
13. `MyBoardView.jsx` — read-only recap with personal export button (`exportParticipantDocx`)

**Phase C — admin board + synthesis (half day):**
14. `AdminBoard.jsx` shell with `ShareLinkPanel`, `RosterPanel`, `RawStarredList`, `SynthesizeButton`
15. `listParticipants` and `listRawStarred` queries
16. `synthesize.ts` action + prompt — THIS IS THE ITERATION-HEAVY STEP; expect prompt tweaks
17. `ClusterCard.jsx` renders clusters with title/summary/category badge/source count/attribution
18. Wire participant `MyBoardView` to show team board toggle when `latestSynthesis.status === "ready"`

**Phase D — voting round (half day):**
19. Admin controls: `votesPerParticipant` input (number, default 3) + `openVoting` / `closeVoting` mutations
20. `VoteView.jsx` (participant) — shows all starred ideas grouped visually by cluster (cluster title as section header, ideas as voteable cards underneath); vote budget counter at top; one-vote-per-idea checkbox/toggle
21. `castVote` / `removeVote` mutations with server-side budget check (count < votesPerParticipant) and uniqueness check (no duplicate vote on same idea by same participant)
22. Live admin view while voting open: tally per idea (admin-only visibility); participant view shows "voting in progress — results hidden until closed"
23. On `closeVoting`: reveal ranked list to all participants; ideas sorted by vote count; cluster badge as metadata on each idea
24. `RankedIdeasView.jsx` — shared display component used by admin AND locked participants post-vote

**Phase E — export + polish:**
25. `exportTopIdeasDocx` — primary deliverable; ranked ideas list with vote count + attribution + cluster badge
26. `exportSynthesisDocx` — secondary/full-board export (clusters + raw breakdown per participant); keep as optional download
27. `exportParticipantDocx` — personal board export (already built in Phase B step 13)
28. Empty states (admin board before anyone joins, "no stars yet" synthesize disabled, "no votes yet" ranking hidden, etc.)
29. Admin "Close session" toggle
30. "Not you? Reset" link on participant to clear localStorage entry
31. Write new CLAUDE.md for the repo

---

## Key existing code to reuse (paths relative to original `AI Playbook\`)

| Purpose | Source path | Reuse |
|---|---|---|
| 6 primitives + copy | `src/config/categories.js` | Copy verbatim |
| Design tokens | `src/index.css` + `AI_PLAYBOOK_BOLD_MODERN_DESIGN_BIBLE.md` | Copy verbatim |
| Canvas UI (cards, sections, chat trigger) | `src/components/views/PrimitivesView.jsx` | Adapt: swap `dispatch`→`useCanvasDispatch`, `state.primitives`→`useQuery` |
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

---

## Risks to watch during build

1. **Synthesis prompt quality.** Mushy clusters = bad product. Budget an hour in Phase C to iterate against 2–3 real multi-participant test runs. `temperature: 0.3` to reduce drift. Keep raw starred list visible as a safety net.
2. **LLM latency masking.** Canvas gen can hit 8–12s cold. The existing `GeneratingIndicator` 6-step animation already masks this well; do NOT swap it for a bare spinner.
3. **Admin URL loss.** Admin key only lives in URL. Surface a "Bookmark this — only way back" banner on session creation.
4. **Verbatim source match in synthesis.** If LLM paraphrases source cards, we can't map to `ideaId`. Fallback: case/whitespace-normalized match; surface unmatched sources rather than dropping.
5. **Multi-tab same-participant:** make `finalizeStars` idempotent (no-op if already locked).
