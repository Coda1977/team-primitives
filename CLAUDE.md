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

## Critical Constraints (carried from AI Playbook)

**Chat brevity** (`convex/ai/chatRefine.ts`): 60-word hard limit, no preamble/recap/filler, max_tokens 250 (tested: 200 cuts off ideas JSON, 512 allows verbose prose). Verbosity creep is the #1 issue — preserve constraints when modifying prompts. Adding more prompt text makes verbosity WORSE. Use max_tokens as the hard ceiling.

**Static chat openers**: ChatDrawer does NOT fire an LLM call on drawer open. Show a static greeting; user speaks first.

**Anti-hallucination**: AI must never fabricate experiences, metrics, or outcomes. Constraint present in all 3 prompts (canvas-gen, chat-refine, synthesize).

**No `transition: all`** on `.canvas-rules` (breaks layout on chat panel close).

**Functional level, not personal role**: intake questions and AI prompts always frame around the function (HR, Product, Sales), never around an individual's role.

## Architecture

```
src/components/views/        # IntakeView, CanvasView, MyBoardView, VoteView, RankedIdeasView
src/components/shared/       # Header, Toast, ConfirmModal, GeneratingIndicator, ChatDrawer
src/components/primitives/   # IdeaCard, CategorySection, AddIdeaInput
src/components/admin/        # RosterPanel, RawStarredList, SynthesizeButton, ClusterCard, VotingControlsPanel
src/config/                  # categories.js (6 primitives), constants.js (MIN_STARS=5, MAX_STARS=10)
src/context/                 # ToastContext
src/hooks/                   # useSession, useParticipant, useCanvasDispatch
src/routes/                  # AdminCreate, AdminBoard, Join, Participant, OwnerDashboard, NotFound
src/utils/                   # export.js, localParticipant.js, sessionCode.js
convex/                      # schema.ts, sessions.ts, participants.ts, intake.ts, canvas.ts, synthesis.ts, votes.ts, ownerQueries.ts
convex/ai/                   # generateCanvas.ts, chatRefine.ts, synthesize.ts (LLM actions)
convex/lib/                  # anthropic.ts (with retry-with-jitter), ids.ts
scripts/                     # simulate-workshop.mjs (Phase F harness)
```

## Identity model

- **Admin** = possession of `adminKey` query param in URL. Each session has its own.
- **Participant** = `participantId` stored in localStorage keyed by `teamprimitives:${sessionCode}:participantId`.
- **Owner** = possession of `OWNER_KEY` env-var-validated key in URL fragment (`/owner#k=...`). Sees ALL sessions.

No accounts, no auth servers.

## Build phases (per PLAN.md)

- **Phase A** (scaffold) — DONE
- **Phase B** (single-participant happy path) — next
- **Phase C** (admin board + synthesis)
- **Phase D** (voting round)
- **Phase E** (export + polish)
- **Phase F** (simulation harness — separate Convex deployment for staging)
- **Phase G** (owner dashboard)

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
