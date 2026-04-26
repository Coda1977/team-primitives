# Team Primitives

Team-based AI brainstorming workshop. Each participant maps where AI fits in their function (HR, Product, Sales, etc.) across six AI primitives, then the group dedupes and votes to converge on a ranked shortlist.

Stack: React 19 + Vite 7 + Tailwind 4 + React Router 7 on the front, Convex for real-time shared state and Anthropic Claude actions on the back. Word + ZIP exports are lazy-loaded.

## First-time setup

```bash
npm install
npx convex dev          # provisions a dev Convex deployment + writes VITE_CONVEX_URL to .env.local
npx convex env set ANTHROPIC_API_KEY sk-ant-...
npx convex env set OWNER_KEY $(openssl rand -hex 16)
```

Bookmark `http://localhost:5173/owner#k=<OWNER_KEY>` — that's your owner dashboard. The dashboard's "Save backup" button downloads a JSON file with the key; if you lose the bookmark, drop that file at `/owner/restore`.

`npx convex env set` writes to the Convex deployment, not the local `.env.local`. The simulator (`scripts/simulate-workshop.mjs`) reads from `.env.local` + `process.env`, so add `OWNER_KEY` and `ANTHROPIC_API_KEY` to `.env.local` too if you plan to run it.

## Daily dev

Two terminals:

```bash
npx convex dev    # terminal 1 — keeps server functions in sync
npm run dev       # terminal 2 — Vite dev server on localhost:5173
```

Routes:

- `/owner#k=<owner-key>` — the dashboard. THE home page.
- `/s/:code/admin#k=<admin-key>` — per-session admin board.
- `/s/:code/present#k=<admin-key>` — projector-friendly broadcast view.
- `/s/:code/join` — public participant entry.
- `/s/:code/p/:slug` — participant board (post-join).

Bearer keys (`adminKey`, `OWNER_KEY`) live in the URL **fragment** — never the query string — so they don't leak into Referer headers, server access logs, or browser history. The fragment is stripped from the address bar after parse.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Vite production build (lazy-split per route) |
| `npm run lint` | ESLint over `src/`, `convex/`, `scripts/` |
| `npm run typecheck` | `tsc -p convex/tsconfig.json` (Convex backend types) |
| `npm test` | Vitest, all suites, no watch |
| `npm run test:watch` | Vitest watch mode |
| `npm run convex:dev` | Convex dev server |
| `npm run convex:deploy` | Push backend to Convex prod |
| `npm run simulate:single` | 1 simulated workshop × 6 personas |
| `npm run simulate` | 3 sessions × 5 personas |
| `npm run simulate:full` | 10 sessions × 6 personas |

`npm run simulate*` refuses to run unless `VITE_CONVEX_URL` looks like a dev deployment. Override with `--i-know-what-im-doing` or `SIMULATOR_ALLOW_PROD=1` if you really mean it.

## Deploy

The frontend (Vercel) and backend (Convex) deploy **independently**. If you change `convex/schema.ts` or any `convex/*.ts`, you MUST also push the backend or production will break.

Recommended sequence:

```bash
# Local sanity gate — same checks CI runs.
npm run lint && npm run typecheck && npm test && npm run build

git push origin main           # → Vercel auto-deploys frontend
npx convex deploy              # → pushes Convex backend
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + test + build on every push and PR. Configure Vercel's "Wait for checks" so the deployment waits on `ci / build`.

## Rollback

- **Frontend:** `vercel rollback` from CLI, or revert the commit and push. Vercel will auto-deploy the previous build (~30 s).
- **Backend:** Convex dashboard → Deployments → Revert. Or `npx convex deploy --version <previous>`.

If the frontend and backend diverge during incident response, frontend rollback is fastest. The schema is additive enough that an older frontend usually works against a newer backend; the reverse is what breaks.

## Key rotation

```bash
# OWNER_KEY — rotates the owner dashboard auth. Old `/owner#k=…` bookmarks invalidate.
npx convex env set OWNER_KEY $(openssl rand -hex 16)
# Then visit /owner#k=<new-key> and download a fresh backup immediately.

# ANTHROPIC_API_KEY — revoke the old key in the Anthropic console, then:
npx convex env set ANTHROPIC_API_KEY sk-ant-...
# No frontend redeploy needed; the key only lives server-side.
```

## Project layout

```
src/                    # SPA
  routes/               # one file per route (see Routes above)
  components/
    views/              # full-page experiences (Intake, Canvas, MyBoard, Vote, RankedIdeas)
    admin/              # admin board panels
    owner/              # owner dashboard sub-components
    primitives/         # reusable idea/category primitives
    shared/             # ChatDrawer, Toast, ConfirmModal, ErrorBoundary, GeneratingIndicator
  context/              # Toast provider + hook
  hooks/                # useCanvasDispatch
  config/               # categories.js, constants.js
  utils/                # adminKey, localParticipant, export (lazy facade), exportImpl (heavy)
convex/                 # backend
  schema.ts             # tables + indexes
  *.ts                  # public queries/mutations (V8 runtime)
  ai/*.ts               # actions calling Anthropic (Node runtime, "use node")
  aiInternal.ts         # internal queries/mutations the actions call
  lib/                  # auth, ids, limits, ranking, rateLimit, anthropic
scripts/
  simulate-workshop.mjs # end-to-end simulator
  personas/             # JSON briefs the simulator drives
  lib/                  # simulator helpers (convex client, persona LLM, report writer)
.github/workflows/      # CI
```

## Further reading

- `CLAUDE.md` — operational guidelines and pitfalls (auth model, design language, Convex gotchas).
- `PLAN.md` — implementation log with every phase + hardening pass shipped.
- `DESIGN_BRIEF.md` — design system spec.
