# Team Primitives — Project Guidelines

## Overview

Team-based AI brainstorming workshop tool. Forks the design system + 6-primitive framework from `AI Playbook` (`C:\Users\yonat\OneDrive\AI\Apps\AI Playbook`). Replaces localStorage + Vercel serverless functions with Convex for shared real-time state.

See `PLAN.md` for the full implementation plan and `DESIGN_BRIEF.md` for the design system.

## Tech Stack

React 19 + Vite 7 + Tailwind CSS 4 + React Router 7 + Convex backend. Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) called via Convex actions. `docx` + `file-saver` for Word export. `jszip` for bulk export.

No Vercel serverless functions — all server logic lives in `convex/`.

## Design System

- **Aesthetic**: Bold modern — black/white/red, magazine editorial. Forked from AI Playbook.
- **Typography**: Montserrat only (weights 400–700). No Roboto Condensed.
- **Palette**: `#000000` bg/text, `#e30613` accent/CTAs/stars, `#00a3e0` category badges, `#fff2f3` starred bg, `#f5f5f5` surface.
- **Presentation view is light, not dark.** Tested and confirmed — light is easier to read at projection distance.

## Design Language (editorial broadcast)

Every page in this app uses the same typographic pattern. Match it when adding new pages.

1. **Red kicker tick** (`<span>` with width 1px, height 4–5px, background C.red) + **small-caps tracked label** (e.g., "WORKSHOP CONTROL", "INTAKE · ~3 MIN", "TEAM PRIMITIVES · WORKSHOP"). Letter-spacing 0.28–0.32em, color C.darkGray or gray500, weight 700, 11px.
2. **Display title** scaled to context: 4–6rem hero on Join/PresentView, 2.25–2.75rem on AdminBoard/OwnerDashboard, 2.5–4rem on IntakeView. Always with `letter-spacing: -0.025em` for tight modernist feel.
3. **Supporting copy** below: clamp(1rem, 1.2vw, 1.2rem), color C.darkGray, max-w-xl or max-w-2xl. Sometimes the function name within is highlighted in C.red.
4. **Hairline rule** (1px, C.lightGray) as section divider — extending under labels or full-width as architectural anchor.
5. **Generous vertical rhythm**: mb-12 between secondary sections; mb-16 to mb-32 between major sections. The post-vote presentation uses mb-32 between hero / runners-up / ranked-list to feel ceremonial.
6. **Stagger fade reveals** on first mount via inline `<style>` tags with `@keyframes` (named `presentReveal` / `intakeReveal` / `ownerReveal` etc.) + `style={{ animationDelay: ${n}ms }}`. 60–80ms between elements, 600–800ms duration each.
7. **Section labels** as their own components: small-caps tracked uppercase + extending hairline rule (`<span className="flex-1 h-px" style={{ background: C.lightGray }}/>`).
8. **Tabular numerals** (`tabular-nums` Tailwind class) on all counts, ranks, and stats so they align across rows.
9. **Hover states** on action buttons: outline → fill on hover (e.g., black border → black background + white text).
10. **Tailwind margin classes (`mr-2`) sometimes don't render reliably** in this codebase — when adjacent text appears stuck together, use inline `style={{ marginRight: "0.5rem" }}` instead.

The PresentView post-vote reveal sets the ceiling: huge red #1 hero numeral (clamp 8–14rem), asymmetric 12-col layout, all-caps section labels with hairline rules, ranked credits-roll list. Other pages echo this at smaller scales.

## Critical Constraints (carried from AI Playbook)

**Chat brevity** (`convex/ai/chatRefine.ts`): 60-word hard limit, no preamble/recap/filler, max_tokens 250 (tested: 200 cuts off ideas JSON, 512 allows verbose prose). Verbosity creep is the #1 issue — preserve constraints when modifying prompts. Adding more prompt text makes verbosity WORSE. Use max_tokens as the hard ceiling.

**Static chat openers**: ChatDrawer does NOT fire an LLM call on drawer open. Show a static greeting; user speaks first.

**Anti-hallucination**: AI must never fabricate experiences, metrics, or outcomes. Constraint present in all 3 prompts (canvas-gen, chat-refine, synthesize).

**No `transition: all`** on `.canvas-rules` (breaks layout on chat panel close).

**Functional level, not personal role**: intake questions and AI prompts always frame around the function (HR, Product, Sales), never around an individual's role.

## Synthesis & Voting Model

**Synthesis = dedup, not categorization.** The 6 primitives ARE the categorization; synthesis just removes duplicates. User-facing label: "Team's ideas — duplicates removed". Internal data shape (`synthesis.clusters[]`) keeps the cluster name for code clarity, but never expose "cluster" in UI copy. `cluster.title` is the canonical idea text after dedup; `cluster.summary` is supporting copy when 2+ sources merged. `cluster.memberIdeaIds` lists the original `Id<"ideas">` rows that fed it.

**Voting unit = deduplicated idea (cluster), not raw stars.** UI casts votes against `cluster.memberIdeaIds[0]` (the "anchor"). Cluster vote count = sum of votes whose `ideaId` is in `memberIdeaIds`. This means re-synthesis preserves vote attribution naturally — votes follow ideas, not clusters.

**Tie-breaking** in ranked output: vote count desc, then `ideas.createdAt` asc (first-contributed tie-wins).

**`votingStatus` state machine:** `"idle"` → `"open"` → `"closed_with_results"`. Re-opening allowed but new `votesPerParticipant` budget must be ≥ the most votes any one participant already cast.

## Convex runtime gotchas

**`"use node"` files cannot contain mutations or queries — only actions.** Internal mutations called from Node-runtime actions live in `convex/aiInternal.ts` (V8 runtime). Actions invoke them via `ctx.runMutation(internal.aiInternal.writeGeneratedIdeas, ...)`.

**Retry-with-jitter** is implemented in `convex/lib/anthropic.ts` for all 429s and 5xx. Retries at 1s/3s/8s + random jitter, max 3 retries.

**React 19 strict mode runs `useEffect` twice in dev.** OwnerDashboard's hash-key parser uses a module-scoped `KEY_CACHE` Map + `processed.current` ref so the second invocation reads the cached key instead of seeing the stripped URL fragment and redirecting.

## Architecture

```
src/components/views/        # IntakeView, CanvasView, MyBoardView, VoteView, RankedIdeasView
src/components/shared/       # Header, Toast, ConfirmModal, GeneratingIndicator, ChatDrawer
src/components/primitives/   # IdeaCard, CategorySection, AddIdeaInput
src/components/admin/        # RosterPanel, RawStarredList, SynthesizeButton, ClusterCard, VotingControlsPanel
src/config/                  # categories.js (6 primitives), constants.js (MIN_STARS=5, MAX_STARS=10)
src/context/                 # ToastContext
src/hooks/                   # useCanvasDispatch
src/routes/                  # AdminCreate, AdminBoard, Join, Participant, OwnerDashboard, NotFound
src/utils/                   # export.js, localParticipant.js
convex/                      # schema.ts, sessions.ts, participants.ts, intake.ts, canvas.ts, synthesis.ts, votes.ts, ownerQueries.ts
convex/ai/                   # generateCanvas.ts, chatRefine.ts, synthesize.ts (LLM actions)
convex/lib/                  # anthropic.ts (with retry-with-jitter), ids.ts
scripts/                     # simulate-workshop.mjs (Phase F harness)
```

## Identity model

- **Admin** = possession of `adminKey` in the URL fragment (`/s/:code/admin#k=...`, also `/s/:code/present#k=...`). Same logic as owner: fragment isn't sent in Referer / server logs / browser history. Each session has its own. Admin has full session control: synthesize, open/close voting, re-synthesize. Parsed via `src/utils/adminKey.js` which strips the fragment from the address bar after read.
- **Participant** = `participantId` stored in localStorage keyed by `teamprimitives:${sessionCode}:participantId`. localStorage is per-device; resumption only works on the same device.
- **Owner** = possession of `OWNER_KEY` env-var-validated key. **Lives in URL fragment, not query string** (`/owner#k=...`). Fragment is never sent in HTTP requests / referer headers / server logs. Owner sees ALL sessions; can create/delete; deep-links into any session's admin URL.

All bearer-key comparisons (adminKey + OWNER_KEY) go through `timingSafeEqual` in `convex/lib/auth.ts` rather than `===`.

No accounts, no auth servers.

The owner dashboard at `/owner` is THE home page. AdminCreate at `/` is just a minimal landing telling owners and participants where to go. Sessions are created from the owner dashboard's "+ New workshop" modal.

**Owner URL recovery.** The dashboard has a "Save backup" button that downloads a JSON file (`team-primitives-owner-<date>.json`) containing the OWNER_KEY + Convex URL. Store it in 1Password / encrypted notes / a private repo. If the bookmark URL is ever lost, visit `/owner/restore`, drop the file in, and the validated key redirects to the dashboard. Backup files are plaintext — treat them like any other secret. CLI fallback: `npx convex env set OWNER_KEY $(openssl rand -hex 16)` rotates the key, then visit `/owner#k=<new-key>` and download a fresh backup immediately.

## Build phases (per PLAN.md → see PLAN.md "Build status" for the canonical record)

- **Phase A** (scaffold) — ✅ DONE
- **Phase B** (single-participant happy path: intake → animated 6-step generator → canvas → ChatDrawer → finalizeStars → MyBoardView) — ✅ DONE
- **Phase C** (admin board + synthesis with dedup output) — ✅ DONE
- **Phase D** (voting on dedup'd ideas + ranked-results reveal) — ✅ DONE
- **Presentation view** (`/s/:code/present`) — ✅ DONE (light-mode editorial broadcast; not in original plan, added per user feedback)
- **Editorial design pass** (Join, IntakeView, OwnerDashboard, AdminBoard, VoteView, MyBoardView tabs) — ✅ DONE
- **Phase E** (Word export wiring: `exportTopIdeasDocx`, `exportSynthesisDocx`, `exportParticipantDocx`) — ✅ DONE
- **Phase G** (owner library: dashboard, create, delete cascade, per-row Word export, bulk ZIP) — ✅ DONE
- **Phase F** (simulation harness `scripts/simulate-workshop.mjs` with persona-LLM, 3 function briefs, full end-to-end flow, report writer in `reports/<date>-<runId>/`) — ✅ DONE
- **Owner URL recovery** (not in original plan): "Save backup" JSON download + `/owner/restore` route + recovery link on `/` landing — ✅ DONE

**All planned phases (A–G) plus two ad-hoc additions (presentation view, owner URL recovery) shipped.** Genuinely outstanding work:
- Production deployment (Convex prod + Vercel + prod env vars)
- Mobile flow verification at 375×812 on real device
- Anthropic tier 2 upgrade before real workshop usage
- 7 more persona JSON files (only HR, Product Marketing, Sales exist)
- Optional: "Close session" admin toggle, separate `team-primitives-staging` Convex deployment

## Git Workflow

- Feature branches + PRs to `main`. Never push directly to `main` for non-trivial work.
- `npm run build` must pass before committing.
- `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

## Key Pitfalls

- Never use Roboto Condensed or any font besides Montserrat.
- Never break the participant phase progression: intake → canvas → locked.
- Don't change `max_tokens: 250` in chat without re-testing brevity.
- Don't add `transition: all` to animated containers.
- localStorage is per-device — participants can't resume on a different device by design.
- **Don't expose "cluster" in user-facing copy.** Internal data shape, not user concept. Use "Team's ideas — duplicates removed" or just "ideas".
- **OWNER_KEY and adminKey both belong in the URL fragment, not query string.** Never `?k=` — always `#k=`. Strip from address bar after parse so screenshots don't expose it. The owner pattern is in `src/routes/OwnerDashboard.jsx`; the admin pattern is shared via `src/utils/adminKey.js`.
- **Length caps on every user-string mutation.** See `convex/lib/limits.ts` (`LIMITS` + `enforceMaxLength`). Caps exist as a cost-amplifier defense — un-capped text gets concatenated into Anthropic prompts where token spend scales with input size.
- **Rate limiting** lives in `convex/lib/rateLimit.ts` backed by the `rateLimits` table. Currently used to cap `joinSession` at 50/min/session. Add new keys as needed; format is `<purpose>:<scope>` (e.g. `joinSession:<sessionId>`).
- **Don't put `internalMutation` in `"use node"` files.** They go in `convex/aiInternal.ts` (V8 runtime); only actions live in `convex/ai/*.ts` (Node runtime).
- **`useEffect` runs twice in React 19 strict mode.** If the effect mutates URL state (like stripping a fragment), use a module-scoped cache or ref so the second invocation is idempotent.
- **`mr-2` Tailwind class can render unreliably** in some compiled outputs — use inline `style={{ marginRight: "0.5rem" }}` when adjacent text appears stuck together.
- **The presentation view is light, not dark.** Tested for projection readability — don't switch back.
- **Voting is on deduplicated ideas, not raw stars.** Vote against `cluster.memberIdeaIds[0]` (the anchor); aggregate cluster vote count by summing votes across `memberIdeaIds`.
