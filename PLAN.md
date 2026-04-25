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

## Build status (2026-04-25)

| Phase | Status | Reference |
|---|---|---|
| A. Scaffold | ✅ Done | commit `28a06a2` |
| B. Single-participant happy path | ✅ Done — intake, animated GeneratingIndicator (6-step), canvas with star/edit/delete/add, ChatDrawer, finalizeStars, MyBoardView | commits up to `bb734a8` |
| C. Admin board + synthesis | ✅ Done — roster with idle indicators, raw starred list, synthesize action, cluster output | commit `6dd410b` |
| D. Voting + ranked-results reveal | ✅ Done — votesPerParticipant input, VoteView, castVote/closeVoting, RankedIdeasView | commit `1a177d3` |
| Presentation view (`/s/:code/present`) | ✅ Done — added per user feedback during build; light-mode editorial broadcast layout; live-mirrors session state | commits `de07932`, `d538d67` |
| Editorial design pass (all pages) | ✅ Done — broadcast hierarchy applied to Join, IntakeView, OwnerDashboard, AdminBoard, VoteView, MyBoardView tabs | commit `ef77a58` |
| E. Word export wiring | ✅ Done — three exports (Top Ideas, Full Board, Personal) wired into MyBoardView, AdminBoard, and OwnerDashboard per-row | commit `da619a6` |
| G. Owner library extras | ✅ Done — bulk ZIP "Export all as ZIP" button at top of dashboard, fetches each session's bundle and zips top-ideas docx files | commit `4818135` |
| F. Simulation harness | ✅ Done — `scripts/simulate-workshop.mjs` with persona-LLM (Anthropic-driven), 3 function briefs, full end-to-end flow, report writer | commit `2c7b699` |

### Key divergences from the original plan

These came up during build and the plan above doesn't fully reflect them — here's the canonical record:

**1. AdminCreate merged into OwnerDashboard.** The plan had AdminCreate at `/` as a one-shot "create a session" form that redirects to the new admin board. During build the user pushed back: *"why do I need a specific screen? Let's just have one dashboard where I create everything."* Now `/owner#k=...` is the home — see all sessions in a table, click "+ New workshop" to open a modal, on submit the new session appears in the table immediately. AdminCreate at `/` is now a minimal landing pointing owners and participants to their bookmarks/links.

**2. "Cluster" dropped as a user-facing concept.** The plan modeled synthesis output as named clusters with titles + summaries that voters interacted with. During build the user pushed back: *"we don't need clusters at all. The 6 primitives are already the structure. The only thing that matters is removing duplicates."* Internal data shape unchanged (`synthesis.clusters[]` is still how the row is stored), but every user-facing label flipped from "Synthesized clusters" to "Team's ideas — duplicates removed". `cluster.title` is now interpreted as the canonical idea text after dedup; `cluster.summary` is supporting copy when 2+ sources merged.

**3. Voting unit = deduplicated idea, not raw individual stars.** The plan said vote per individual idea, with clusters as visual organization only. Once clusters were dropped as user-facing, voting on raw stars made no sense (split votes between near-duplicates). The implementation casts votes against each cluster's first `memberIdeaIds[0]` (the "anchor"); cluster vote counts aggregate across all `memberIdeaIds`. Side benefit: re-synthesis preserves vote attribution naturally (votes follow ideas, not clusters).

**4. Presentation view added (`/s/:code/present?k=adminKey`).** Not in the original plan. Added when user asked for *"a more visual way to present on screen, like Miro."* Live-mirrors session state via the same Convex queries the admin board uses. Three states: pre-stars/pre-synthesis waiting message, deduped sticky-note grid, post-vote ranked-results reveal. Designed for projection.

**5. Light mode (not dark) for presentation view.** Initial build was dark — user pushed back: *"light is easier to read at distance."* Now uses white background + black text + the original AI Playbook color tokens (red, electricBlue, starredBg, surface, lightGray) consistently.

**6. Editorial design language adopted across all pages.** Each page uses the same pattern: red kicker tick + small-caps tracked label + display title + supporting copy + hairline rule + content. Stagger fade reveals on first mount via inline CSS `@keyframes` + `animationDelay` (60–80ms between elements, 600–800ms duration). See CLAUDE.md → "Design Language" for the full pattern.

**7. No upfront frontend-design reflection.** User opted to inherit the AI Playbook design system as-is rather than running a visual identity reflection. The `frontend-design` skill was invoked later (after Phase D) for the editorial pass — to refine hierarchy and breathing room within the inherited palette/type, not to choose new tokens.

**8. `useEffect` strict-mode bug fix in OwnerDashboard.** React 19 strict mode runs `useEffect` twice in dev. The OwnerDashboard's hash-key parser was redirecting on the second run because the URL fragment had been stripped. Fix: module-scoped `KEY_CACHE` + `processed.current` ref to make hash parsing idempotent across remounts.

**9. `"use node"` files cannot contain mutations.** The first attempt put `writeGeneratedIdeas` (an `internalMutation`) in `convex/ai/generateCanvas.ts` (which is `"use node"` for Anthropic SDK). Convex rejected the push. Fix: internal mutations live in `convex/aiInternal.ts` (V8 runtime); only `action`s live in `convex/ai/*.ts` (Node runtime). Action calls mutation via `ctx.runMutation(internal.aiInternal.writeGeneratedIdeas, ...)`.

### Working end-to-end test data (PM-P602)

The PM-P602 session in the dev deployment has the full post-vote state for testing:
- 2 participants locked (Jordan, alex) with 5 stars each
- 8 deduplicated ideas across 5 categories
- Voting closed: "Generate positioning angle variations from features" won with 2 votes (cross-team consensus from Jordan + alex)
- Other clusters: 5 tied at #2 (1 vote each), 3 tied at #6 (0 votes)

Walk it: `/owner#k=<OWNER_KEY>` → click PM-P602 row → admin board → "Open presentation" button.

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

### Live-workshop admin view (during the workshop, NOT post-processing)
While participants are working, the admin needs activity signals to facilitate effectively. The roster panel must show, per participant row:
- **Name + slug**
- **Current phase** with chip styling: `Intake` (gray) | `Canvas` (blue) | `Locked` (green)
- **Counts:** ideas total, starred so far (e.g., "12 ideas, 4 starred")
- **Time in current phase** computed from `phaseEnteredAt` (= max of `createdAt`, `canvasGeneratedAt`, `starsLockedAt`): "8 min in Canvas"
- **Idle indicator** when `now - lastActivityAt > 90s`: subtle yellow dot or "idle 4 min" text. Helps admin spot stuck participants.

Sort options: by phase (default — groups stuck/done together), by name, by last activity desc. Default sort surfaces participants who haven't moved phases recently.

Roster query updates reactively via Convex subscription — admin sees changes within ~1s of any participant mutation.

No "preview participant's canvas" feature in MVP (privacy + scope). If admin wants to peek, they can open the participant URL in a new tab as themselves.

### Team voting phase (new)
After synthesis, admin opens a voting round. Key rules:
- **Unit of voting = individual idea**, not cluster. Clusters are a visual organizing tool only. If two similar ideas sit in one cluster, voters pick the specific idea with the wording they prefer.
- **One vote maximum per idea per person.** No stacking multiple dots on a single idea.
- **Vote budget is admin-configurable per session** (default 3; admin can pick any positive integer when opening voting). Participants can distribute their N votes across any N distinct ideas.
- Participants can change their votes while voting is open; votes lock when admin closes the round.
- **Vote counts hidden from participants while voting is open** (reduces bandwagon bias); admin sees live tallies.
- When admin closes voting → final ranked list is revealed to all participants on the team board.
- **Final output:** ideas sorted by vote count, with cluster badge as metadata. Participant attribution retained. This is what goes into the "Top Ideas" export.

### Workshop duration & facilitation tempo
Reference times for facilitators planning a session (assumes 6 participants):
- **Pre-session setup (admin only):** ~2 min — create session, copy participant URL, share via Zoom/Slack/email.
- **Phase 1: Join + intake** (each participant): ~5 min — join via URL, enter name, answer 3 questions.
- **Phase 2: Canvas generation** (per participant, parallel): ~6–10s LLM latency, then ~10–15 min for refinement (chat per category, edit/add/delete cards) and starring 5–10 favorites.
- **Phase 3: Synthesis** (admin click + LLM): ~10–20s of synthesis runtime, then admin spends ~2–3 min reviewing clusters.
- **Phase 4: Voting** (admin opens, participants vote): ~5 min for participants to cast votes, then admin closes.
- **Phase 5: Wrap-up** (admin export + sharing): ~2 min.

**Total session duration:** ~30–40 minutes from first participant joining to ranked list ready. Facilitator should plan for 45 min including buffer.

Activity signals in the live admin view (idle indicator, time-in-phase) help facilitators decide when to verbally nudge ("everyone please wrap up your stars in 2 min") — the app does NOT enforce timeboxes.

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

## Copy deck (participant + admin user-facing strings)

The plan specifies components and flow but the participant experience depends heavily on the words on screen. Below are MVP strings — implementer should treat these as the canonical copy and not invent ad-hoc.

### Join screen (`Join.jsx`)
- Page header: `Team Primitives`
- Subtitle: `${functionName} workshop — brainstorm where AI fits in your function`
- Body line: `Enter your name to start. This will take about 20 minutes — make sure you have time to focus.`
- Input label: `Your name`
- Input placeholder: `e.g. Jordan, Priya, Alex`
- Submit button: `Join workshop →`
- Footer: `${participantCount} ${participantCount === 1 ? "person" : "people"} already joined`

### Intake screen (`IntakeView.jsx`)
- Header: `Tell us about ${functionName}`
- Subheader: `Three questions about your function — not your personal role. Answer however you'd describe it to a colleague. ~3 min.`
- Question 1 label: `What does ${functionName} do well that AI could help you do 10x more of?`
- Question 1 helper: `Strengths AI could amplify. List things you're already good at.`
- Question 2 label: `Where does ${functionName} get stuck or slowed down that AI could help unblock?`
- Question 2 helper: `Bottlenecks, handoffs, waiting time, things that drain energy.`
- Question 3 label: `If you could snap your fingers and have AI handle one thing in ${functionName} tomorrow, what would it be?`
- Question 3 helper: `The one thing you'd offload first.`
- Word-count chip (per textarea): `0–5 words: "Add a bit more"` / `6–15: "Good start"` / `16+: "Great detail"`
- Submit button (disabled state): `Fill all 3 to continue`
- Submit button (enabled): `Generate my AI canvas →`

### Generating state (`GeneratingIndicator.jsx` for canvas gen)
- Header: `Generating your AI canvas…`
- Subline: `This takes 6–10 seconds. We're brainstorming use cases across all 6 primitive categories based on your answers.`
- Step rotator: reuses `PRIMITIVES_GEN_STEPS` from `src/config/categories.js` unchanged.

### Canvas screen (`CanvasView.jsx`)
- Header: `Your ${functionName} AI canvas`
- Subheader: `Six categories. Edit, refine via chat, or add your own. **Star 5–10 favorites** to send to the team board.`
- Category section header (per primitive): `${number}. ${title}` + `${description}` (italic)
- "Go Deeper" button text: `💬 Go deeper on ${title}`
- Add idea input placeholder: `Add your own idea for ${title}…`
- Star tooltip: `Star to include in team board (5–10)`
- Stats bar: `${total} ideas | ${categoriesFilled}/6 categories | ${starred} starred`
- Submit-stars button (disabled below 5): `Star ${5 - starred} more to continue`
- Submit-stars button (enabled): `Submit stars to team →`
- Submit-stars confirm modal: `Submit ${starred} starred ideas to the team board? You won't be able to add or change ideas after this — but you can still vote later.`

### My Board (locked) screen (`MyBoardView.jsx`)
- Header: `Your contribution is locked in ✓`
- Subheader (no synthesis yet): `Waiting for ${remaining} more teammate${remaining === 1 ? "" : "s"} to finish, then your admin will synthesize the team's ideas.`
- Subheader (synthesis ready, no voting): `The team board is ready. Click "Team board" to see how everyone's ideas come together.`
- Subheader (voting open): `Voting is open! You have ${budget} votes. Click "Vote" to choose your team's priorities.`
- Subheader (voting closed): `Voting is complete. Click "Final results" to see the team's top ideas.`
- Toggle tabs: `My board` | `Team board` | `Vote` | `Final results` (only shown when relevant)
- Personal export button: `Download my ideas as Word`
- "Not you?" link (footer): `Not you? Reset and re-enter your name`

### Vote view (`VoteView.jsx`)
- Header: `Vote for your team's top ideas`
- Subheader: `You have ${budget} votes. One vote per idea. Pick the ideas you most want to see ${functionName} actually do.`
- Sticky budget chip (top): `${used}/${budget} votes used`
- Cluster section header: `${cluster.title}` (with optional `(${cluster.summary})` tooltip)
- Vote button (off): `Vote`
- Vote button (on): `✓ Voted`
- Footer: `Votes remain hidden from the team until the admin closes voting.`

### Ranked list / final results (`RankedIdeasView.jsx`)
- Header: `Your team's top AI ideas`
- Subheader: `Ranked by votes from all ${participantCount} teammates.`
- Per-row format: `${rank}. ${ideaText} — ${voteCount} votes — ${contributorName} — ${clusterTitle}`
- Tie note (when ties exist): `Ties broken by who first contributed the idea.`
- Owner/admin export buttons: `Download ranked list (Word)` | `Download full board (Word)`

### Admin board (`AdminBoard.jsx`)
- Header: `${functionName} workshop — admin`
- Pre-synthesis empty state: `Waiting for participants to join and lock their stars. You'll be able to synthesize once at least 2 are done.`
- Synthesize button (disabled): `Synthesize (need at least 2 locked participants)`
- Synthesize button (enabled): `Synthesize team ideas`
- Re-synthesize button: `Re-synthesize (incorporate latest stars)`
- Open voting button: `Open voting round`
- Vote budget input label: `Votes per participant`
- Close voting button: `Close voting & reveal results`
- Bookmark banner (top, dismissible): `🔖 Bookmark this URL — it's the only way back to this admin view.`

### Admin landing (`AdminCreate.jsx`)
- Header: `New workshop`
- Subheader: `Create a session, share the participant URL with your team, and run the workshop together.`
- Function input label: `Function (required)` — placeholder: `HR, Product Marketing, Sales…`
- Team size label (optional): `Team size`
- Industry label (optional): `Industry / company context`
- Submit button: `Create workshop`
- Post-create banner: `Workshop created. Share this URL with participants:` + `[copy button]` + admin-URL bookmark prompt.

### Generic strings
- 404: `Workshop not found. Check the URL with whoever invited you.`
- LLM error: `Hmm, that didn't work. Try again?`
- Network offline indicator: `Offline — changes will save when you reconnect.`
- Network reconnected: `Back online ✓`

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
│   ├── ownerQueries.ts                             [NEW] owner-gated: listAllSessions, downloadSessionDocx, downloadAllDocxZip (action), deleteSession (mutation). All require OWNER_KEY env var.
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
│   │   ├── OwnerDashboard.jsx                      [NEW] owner cross-session dashboard; sortable table; per-row actions + Export all ZIP; Delete session
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
                                votesPerParticipant: number? }
                              indexes by_code, by_created_at (for owner dashboard sort)
                              (NOTE: simulation runs use a SEPARATE Convex deployment
                               (team-primitives-staging), so no `origin` tag needed to
                               distinguish sim from real data — it's enforced by
                               deployment boundary.)

participants                  { sessionId, name, slug, phase: "intake"|"canvas"|"locked",
                                canvasGeneratedAt?, starsLockedAt?,
                                lastActivityAt: number, createdAt }
                              indexes by_session, by_session_and_slug
                              (NOTE: `lastActivityAt` is updated by every mutation
                               this participant sends — joinSession, submitIntake,
                               addIdea, updateIdea, deleteIdea, toggleStar,
                               appendChatMessage, finalizeStars, castVote, removeVote.
                               Used by admin roster to compute "idle for X min"
                               and surface stuck participants.)

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
- **Cascading deletes** from `deleteSession(sessionId)` (owner-only): in this order — votes (by_session), chatMessages (filter by sessionId), ideas (filter by sessionId), intakeAnswers (filter by sessionId), synthesis (by_session_ran), participants (by_session), then sessions itself. All in one mutation transaction. No soft-delete in MVP; deletion is irreversible by design.

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

### Rate-limit handling (Anthropic 429s)

Anthropic tier 1 = 50 RPM. A 10-person workshop joining simultaneously generates 10 concurrent canvas-gen calls in the first minute, plus chat turns layered on top. Real workshops WILL hit 429s without a strategy.

**Server-side (Convex actions):**
- All three LLM actions wrap the Anthropic fetch in retry-with-jitter on 429:
  - 1st retry after `1s + random(0–500ms)`
  - 2nd retry after `3s + random(0–1000ms)`
  - 3rd retry after `8s + random(0–2000ms)`
  - Give up after 3 retries; return error to client with code `RATE_LIMITED`
- 5xx from Anthropic uses the same backoff (transient errors).
- 4xx other than 429 (e.g., bad API key, content policy) → fail fast, no retry.

**Client-side UX during retry:**
- `generateCanvas` running >12s: change loading copy from `Generating your AI canvas…` to `Generating… (retrying due to high load)` after 12s. Don't show this earlier — most calls succeed in 6–10s and changing copy too early creates anxiety.
- `chatRefine`: keep "Thinking…" bubble; if action fails after retries, show error toast.
- `synthesize`: GeneratingIndicator continues; if it errors after retries, show retry panel on admin board.

**Admin visibility:**
- If 3+ rate-limit retries hit within 60s across the whole session, show a banner on admin board: `⚠️ API throttling. Some participants may see slower generation. Consider upgrading Anthropic tier.`
- Token usage per session computed in `ownerQueries.ts` and displayed on owner dashboard (column or per-row drilldown — TBD in Phase G polish).

**Pre-launch:** request Anthropic tier 2 before first real workshop. Tier 2 lifts to 1000 RPM and 80K input tokens/min — eliminates the throttling concern entirely for a 10-person workshop.

### Export format spec (`exportTopIdeasDocx`)

The primary post-vote deliverable. Structure:

1. **Cover page**
   - Title: `${functionName} — Team AI Priorities`
   - Subtitle: `${participantCount} teammates voted on ${ideaCount} ideas`
   - Date: workshop date (session.createdAt formatted as "April 25, 2026")
   - Footer: `Generated by Team Primitives`

2. **Top 3 priorities (highlighted block)**
   - Heading: `Top 3 priorities`
   - Each: large heading with rank + idea text, then small line `${voteCount} votes · ${contributorName} · ${clusterTitle}`

3. **Full ranked list**
   - Heading: `All ranked ideas`
   - Numbered list, position 1–N
   - Per row: `${ideaText}` (bold) — `${voteCount} votes` — `${contributorName}` — `${clusterTitle}` (italic)
   - Ties shown with same rank number, sorted by `createdAt` asc as the tie-break

4. **Methodology footer (small text)**
   - `${participantCount} participants each starred 5–10 favorite ideas. ${totalStars} starred ideas were clustered by AI into ${clusterCount} themes. Each participant then voted with ${votesPerParticipant} votes (one per idea, one vote max per idea). This list is ranked by total votes; ties broken by which idea was contributed first.`

Use the original's `docx` patterns from `src/utils/export.js → exportPrimitivesDocx` as the structural template — same heading styles, same brand-aligned color usage. Just different content.

`exportSynthesisDocx` (the secondary "full board" export) follows the same cover + adds:
- Synthesized clusters section (cluster title + summary + member ideas with attribution)
- Raw breakdown by participant (per-participant section with their intake answers + their starred ideas)
- Same methodology footer.

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
/owner#k=:ownerKey                  → OwnerDashboard  (Phase G; invalid ownerKey → redirect /)
                                       (KEY IN URL FRAGMENT, NOT QUERY STRING — fragments are
                                        not sent in referrer headers or upstream server logs.
                                        Parse via window.location.hash on mount.)
/*                                  → NotFound
```

---

## Build sequence (MVP-first)

**Total realistic estimate: ~6 days** for solo build including simulation harness and owner dashboard. Breakdown: Phases A–E (core app) = 4–5 days; Phase F (simulator) = ~1 day; Phase G (owner dashboard) = ~4 hours (slimmed per operating model — see Phase G section). Original "half day" estimates per phase were optimistic — they don't account for Anthropic prompt tuning, real-world multi-tab testing, or edge-case polish.

**Phase A — scaffold (~1 day):**
1. `npm create vite@latest` → copy original's package.json deps + add `convex`, `react-router-dom@7`
2. `npx convex dev` to init Convex deployment; set `ANTHROPIC_API_KEY` via `npx convex env set`
3. Copy design files (`index.html`, `index.css`, Design Bible, eslint, `config/categories.js`)
4. Write `convex/schema.ts`, `convex/lib/anthropic.ts`, `convex/lib/ids.ts`
5. Wire `main.jsx` with `ConvexProvider` + `BrowserRouter`; stub 4 routes

**Phase B — single-participant happy path (~1 day):**
6. `convex/sessions.ts` + `AdminCreate.jsx` → admin URL created, session row in dashboard
7. `convex/participants.ts` + `Join.jsx` → participant joins, localStorage seeded. Use Copy deck strings for all UI text.
8. Adapt `IntakeView.jsx` → 3 questions → `submitIntake` mutation → triggers `generateCanvas` action. Use Copy deck for question labels, helper text, button copy, word-count chips.
9. Port `generateCanvas.ts` action from `api/primitives-generate.js`; add 429/5xx retry-with-jitter wrapper (see "Rate-limit handling" section); verify 6-category output in `ideas` table.
10. Adapt `PrimitivesView.jsx` → `CanvasView.jsx`; replace `dispatch` with `useCanvasDispatch` adapter; star/edit/delete/add all write to Convex. Use Copy deck strings for all UI text.
11. Adapt `ChatDrawer.jsx`; port `chatRefine.ts` (with retry wrapper); verify per-category chat works. Preserve static-opener pattern from original (no LLM call on drawer open).
12. `finalizeStars` mutation + submit button (5 ≤ stars ≤ 10) with Copy deck confirm-modal text.
13. `MyBoardView.jsx` — read-only recap with personal export button (`exportParticipantDocx`). Use Copy deck for the four state-dependent subheaders (no synthesis / synthesis ready / voting open / voting closed).
14. **Activity tracking:** every participant mutation (`joinSession`, `submitIntake`, `addIdea`, `updateIdea`, `deleteIdea`, `toggleStar`, `appendChatMessage`, `markChatIdeaAdded`, `finalizeStars`, future `castVote`/`removeVote`) writes `participants.lastActivityAt = now`. Implement as a small helper `bumpActivity(participantId)` called from each mutation.

**Phase C — admin board + synthesis (~1 day, plus ~1 hour prompt iteration):**
15. `AdminBoard.jsx` shell with `ShareLinkPanel`, `RosterPanel`, `RawStarredList`, `SynthesizeButton`. Use Copy deck for headers, button text, empty states, bookmark banner.
16. `listParticipants` query — return per-row `{ name, slug, phase, ideaCount, starCount, phaseEnteredAt, lastActivityAt }`. Compute "time in phase" + "idle for X min" client-side from these timestamps. Sort options: by phase | by name | by activity desc.
17. `listRawStarred` query.
18. `synthesize.ts` action + prompt (with retry wrapper) — THIS IS THE ITERATION-HEAVY STEP; expect prompt tweaks. Keep raw starred list visible to admin throughout as a safety net.
19. `ClusterCard.jsx` renders clusters with title/summary/category badge/source count/attribution.
20. Wire participant `MyBoardView` to show team board toggle when `latestSynthesis.status === "ready"`. Use Copy deck for the toggle tabs and state-dependent subheaders.

**Phase D — voting round (~1 day):**
21. Admin controls: `votesPerParticipant` input (number, default 3) + `openVoting` / `closeVoting` mutations
22. `VoteView.jsx` (participant) — shows all starred ideas grouped visually by cluster (cluster title as section header, ideas as voteable cards underneath); vote budget counter at top; one-vote-per-idea checkbox/toggle. Use Copy deck for header, sticky-budget chip, footer.
23. `castVote` / `removeVote` mutations with server-side budget check (count < votesPerParticipant) and uniqueness check (no duplicate vote on same idea by same participant). Both call `bumpActivity(participantId)`.
24. Live admin view while voting open: tally per idea (admin-only visibility); participant view shows "voting in progress — results hidden until closed"
25. On `closeVoting`: reveal ranked list to all participants; ideas sorted by vote count; cluster badge as metadata on each idea
26. `RankedIdeasView.jsx` — shared display component used by admin AND locked participants post-vote. Use Copy deck for header, subheader, per-row format, tie note.

**Phase E — export + polish (~1 day):**
27. `exportTopIdeasDocx` — primary deliverable; follow the "Export format spec" section above for cover/top-3/full-list/methodology structure
28. `exportSynthesisDocx` — secondary/full-board export (clusters + raw breakdown per participant); keep as optional download
29. `exportParticipantDocx` — personal board export (already built in Phase B step 13)
30. Empty states (admin board before anyone joins, "no stars yet" synthesize disabled, "no votes yet" ranking hidden, etc.) — use Copy deck strings throughout
31. Admin "Close session" toggle
32. "Not you? Reset" link on participant to clear localStorage entry (Copy deck has the exact wording)
33. Write new CLAUDE.md for the repo

**Phase F — Workshop Simulation harness (~1 day):**
34. Set up a second Convex deployment for staging (`npx convex dev --configure team-primitives-staging`). Simulator targets staging; prod is never polluted by test data. Deployment boundary is the only separator — no `origin` tag on sessions.
35. Build `scripts/simulate-workshop.mjs` — orchestrator. See file structure + behavior below.
36. Build `scripts/personas/*.json` — 10 function briefs (HR, Product Marketing, Sales, Finance, Engineering, Legal, Customer Success, Ops, Marketing, People Ops), each with 5–8 persona archetypes (sub-role + voice sample).
37. Build `scripts/lib/persona-llm.mjs` — wraps Anthropic SDK; given a function brief + persona archetype, generates persona-appropriate intake answers and chat messages. This is the "second LLM" that roleplays each participant.
38. Build `scripts/lib/convex-client.mjs` — thin wrapper around Convex SDK for all mutations/actions needed by the simulator.
39. Build `scripts/lib/playwright-spotcheck.mjs` (optional, uses Playwright MCP if available) — drives ONE real browser through the participant flow in parallel with the Node script, catches UI race conditions the API-level simulator can't see.
40. Report writer: creates `reports/YYYY-MM-DD-<run-id>/index.md` + per-session `data.json` + both `.docx` exports + `run-summary.md` (timing, token usage, errors).
41. Add npm scripts: `simulate:single` (1 session × 6 personas, ~$2, ~2 min), `simulate` (3 × 5, ~$8, ~5 min), `simulate:full` (10 × 6, ~$20, ~10–15 min).

**Phase G — Owner dashboard (~4 hours, slimmed):**

Operating model: the user (tool owner) creates sessions and hands admin URLs to group leads who run the workshops. Once handed off, the user needs a way to see what happened across all sessions without asking for each admin URL back. This is a simple "my sessions" index — NOT a new permission level.

42. Add `OWNER_KEY` env var to Convex (`npx convex env set OWNER_KEY <32-char-random>`). Never exposed to client. Generate with `openssl rand -hex 16` or equivalent.
43. Add Convex queries/mutations/action in `convex/ownerQueries.ts` (all gated by `ownerKey` argument compared to env):
    - `listAllSessions(ownerKey)` → rows of `{ sessionId, code, functionName, createdAt, participantCount, ideaCount, starCount, votingStatus, topVotedIdea: { text, voteCount }?, adminUrl }`
    - `downloadSessionDocx(sessionId, ownerKey)` → returns top-ideas.docx bytes
    - `downloadAllDocxZip(ownerKey)` → Convex action: fetches all sessions, generates docx per session, zips with `jszip`, returns download URL
    - `deleteSession(sessionId, ownerKey)` → mutation: cascades through votes, chatMessages, ideas, intakeAnswers, synthesis, participants, then sessions. Returns count of deleted rows for confirmation toast.
44. New route `/owner#k=:ownerKey` → `OwnerDashboard.jsx`. **Key lives in URL fragment, NOT query string.** Parse via `window.location.hash` on mount; strip from URL bar after parsing (so screenshots don't expose key). On mount, calls `listAllSessions(k)`; invalid key → redirect `/`.
45. Single sortable table — columns: Function | Created | Participants | Ideas | Votes | Top voted idea | Actions. Sort click on any column header. No filter toggles, no date pickers. Default sort: createdAt desc.
46. Actions column per row: `[Open admin]` (new tab, deep-link to that session's admin URL using the embedded adminKey) | `[Download]` (fetches that session's top-ideas.docx) | `[Delete]` (opens ConfirmModal with explicit confirmation copy → calls `deleteSession`).
47. Top of table: `[Export all as ZIP]` button — calls `downloadAllDocxZip`. For <100 sessions, sync response is fine; larger scale → defer to an email later (not MVP).
48. Bookmark prompt on first load: "Bookmark this URL — it's the only way back to your sessions." Auto-copy to clipboard on first load.
49. Known limitation to document: owner can read and delete all session data. Acceptable for single-tenant Yonatan-as-owner model; would need consent flow + role separation if productized.

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

## Owner dashboard — sketch

Route: `/owner#k=:ownerKey` (fragment-based, see Security notes). Staging and prod run on separate Convex deployments, so sim data is physically separated from real workshops (no filter needed).

Single sortable table:
```
| Function         | Created       | Parts | Ideas | Votes | Top voted idea                      | Actions                       |
|------------------|---------------|-------|-------|-------|-------------------------------------|-------------------------------|
| HR               | 2026-04-25    |   6   |  47   |  12   | Draft rejection emails from ATS...  | [Open] [Download] [Delete]    |
| Product Marketing| 2026-04-22    |   5   |  38   |  15   | Auto-generate campaign one-pagers...| [Open] [Download] [Delete]    |
```

Above the table: `[Export all as ZIP]` button (downloads docx per session as a single zip).

Row "[Open]" → new tab to `/s/:code/admin?k=<that session's adminKey>` (owner query embeds it). Same per-session admin board as today; admin duties (synthesize/open voting/close voting) still live there. Owner dashboard is a read-through index + delete tool, not a new admin UI.

Row "[Download]" → downloads that session's `top-ideas.docx` directly.

Row "[Delete]" → ConfirmModal: "Delete session ${functionName} (${code})? This permanently deletes ${N} participants' data and cannot be undone." Confirms → cascading delete via `deleteSession` mutation. Toast: "Session deleted (${count} rows)."

Sessions accumulate forever in MVP unless explicitly deleted. If you ever hit hundreds of sessions, add an "Archive" action that hides rows from the default view (not required at MVP scale).

**Security notes:**
- `OWNER_KEY` lives in Convex env, never sent to client.
- **URL fragment, not query string.** Routes use `/owner#k=...` — fragments are NOT included in the HTTP request to the server, NOT logged in server access logs, NOT sent in `Referer` headers when clicking outbound links from the dashboard. This dramatically reduces leak surface vs. `?k=...`.
- Client parses key from `window.location.hash` on mount, then strips it from the URL bar (so screenshots of the dashboard don't expose the key). Stores in React state only; passes to every ownerQueries call.
- Per-session admin keys embedded in the dashboard's deep-links are fine to show to the owner — they're just navigation aids. The owner already has authority to see these via their OWNER_KEY.

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

### Phase G verification (owner dashboard)
18. Open `/owner#k=<OWNER_KEY>` on the prod deployment — table shows real sessions created during Phase B-E testing (sim data lives on staging deployment, physically separated). Verify URL fragment is stripped from address bar after mount.
19. Invalid key (`/owner#k=wrong`) → redirect home. No data leaked to client.
20. Click "Open admin" on a session row → new tab opens that session's admin board (owner query returned the embedded adminKey).
21. Sort table by Votes descending — top-voted ideas surface across all sessions.
22. Click "Download" on one row → downloads that session's `top-ideas.docx`. Open in Word: verify cover page, top-3 highlighted block, full ranked list, methodology footer all present per the export format spec.
23. Click "Export all as ZIP" → downloads a ZIP containing one `.docx` per session.
24. Click "Delete" on a test session → ConfirmModal shows expected copy → confirm → toast appears with deleted-row count → row vanishes from table → re-open admin URL of deleted session: 404.
25. Verify `OWNER_KEY` is never visible in client bundle (`grep` the Vite build output — 0 hits on the actual secret value). Verify URL fragment is NOT in browser history (`history.replaceState` was called to remove it).
26. Bookmark prompt appears on first load; URL auto-copied to clipboard.

### Live admin view + microcopy verification (cross-cutting)
27. **Activity tracking:** during a live workshop test, leave one participant idle (don't type anything for 2 min). Admin roster shows "idle 2 min" with yellow indicator next to that participant. Have them resume → indicator clears within 1s.
28. **Time-in-phase:** participant in intake for 5 min → admin roster shows "5 min in Intake". After they advance to canvas → roster shows "0 min in Canvas" → grows over time.
29. **Microcopy spot-check:** walk the participant flow as a non-developer (or have someone unfamiliar with the project try) and verify every screen has clear copy from the Copy deck — no Lorem ipsum, no leftover "[TODO]" placeholders, no "undefined" appearing in interpolations. Specifically check the four MyBoardView state-dependent subheaders.
30. **Rate-limit retry:** stub the Anthropic SDK locally to return 429 on first 2 calls, success on 3rd. Run a generateCanvas and verify it succeeds after retries (~4s additional latency); copy on the participant screen flips to "retrying due to high load" after 12s.

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
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\src\routes\OwnerDashboard.jsx` (NEW — Phase G owner dashboard)
- `C:\Users\yonat\OneDrive\AI\Apps\Team Primitives\convex\ownerQueries.ts` (NEW — owner-gated queries + bulk export action + deleteSession mutation)

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
