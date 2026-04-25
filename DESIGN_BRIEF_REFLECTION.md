# Team Primitives — Design Reflection Brief

**Use this version of the brief BEFORE screens get designed.** All visual tokens — specific colors, font families, sizes, spacing values, motion timings — have been stripped out. What remains is the structural design language: what each screen does, what it contains, what copy appears, how things behave, and what *roles* the visual system needs to fill (e.g., "primary action color" rather than "red #E30613").

The intent is for Claude (or you) to **first decide the visual identity** — palette, type, spacing, motion — and only THEN apply that identity to the screens.

---

## How to use this with Claude

**Step 1 (reflection):** paste the whole brief into Claude.ai and ask: *"Read this brief. Before designing any screens, propose 3 distinct visual identities (palettes, typography, spacing, motion personality) that could each work for this product. Show each as a small swatch + type sample + tone description. Then ask me which to develop further."*

**Step 2 (refinement):** pick a direction Claude proposes. Ask Claude to expand it into a full token set: complete palette with semantic role assignments, type scale, spacing scale, radius/border choices, motion specs.

**Step 3 (design):** *now* ask Claude to design individual screens using the chosen identity. The screen specs below describe what each screen needs in terms of *function and structure* — your visual identity from Step 2 fills in the look.

This split prevents the common failure mode where Claude jumps straight to designing screens with whatever defaults it has in mind, locking in visual choices you never deliberated.

---

## Project context

**Team Primitives** is a team-based AI brainstorming workshop tool. A facilitator (admin) creates a session for a function (HR, Product Marketing, Sales, etc.); 5–10 teammates join via a shared link from their phones or laptops; each one independently goes through a personalized AI canvas (6 primitive categories: Content, Automation, Research, Data, Technical, Strategy); each stars 5–10 favorite ideas; the admin then triggers AI synthesis to cluster everyone's stars into themes, opens a voting round (admin-configured budget; one vote per idea max), and exports a ranked list of team priorities.

The product is consumed by managers and small-to-mid teams during real workshops, often with one device per person. Sessions feel like a 30–40 minute workshop, not a Notion document. The aesthetic should feel **purposeful, energetic, focused** — a tool that respects the user's time and the seriousness of the conversation, not a casual SaaS dashboard.

---

## Design decisions to make with Claude (BEFORE screens)

Use these prompts to drive the reflection step. Each is a real choice that should be deliberate.

1. **Aesthetic personality.** Where should this sit on the spectrum: editorial-magazine / Swiss-modern / playful-rounded / corporate-clean / brutalist-confident / soft-academic? Pick one — the rest of the system follows from this choice.
2. **Color philosophy.** Monochrome with one strong accent? Two-color system? Full palette with category coding? How much does color do work vs. typography and layout?
3. **Type personality.** Single typeface (mono-tonal) or pairing (display + body)? Sans, serif, or mixed? Heavy and bold, or light and elegant? Type often defines the "feel" more than color.
4. **Density.** Spacious and minimalist, or dense-but-disciplined? This is a workshop tool — density matters for the canvas screen but airiness matters for participant onboarding.
5. **Motion personality.** Snappy and direct, slow and considered, or playful with overshoot/easing? Consistent across the product, calibrated to the workshop tempo.
6. **Surface treatment.** Flat? Subtle elevation/shadow? Borders only? Cards on a tinted background?
7. **Workshop "moment" feel.** When 6 people are voting on the same screen at the same time, what should it feel like — a quiet voting booth or an energetic studio? Affects color saturation and motion.

Each of these is upstream of the actual hex/font/px decisions.

---

## Aesthetic direction (high level only)

The product wants to feel:
- **Purposeful** — every element has a job; no decorative weight
- **Energetic but controlled** — tempo of a focused workshop, not an entertainment app
- **Editorial-grade type hierarchy** — strong contrast between sizes; the type is the structure
- **Confident in negative space** — comfortable with quiet, lets ideas breathe
- **Tactile interactions** — clear feedback on every tap (stars, votes, edits)

What it should NOT feel like:
- A generic SaaS admin dashboard
- A consumer entertainment app (no whimsy or characters)
- A corporate document interface (no skeuomorphic paper)
- A productivity app overloaded with features (this does ONE workshop, well)

Use these as guardrails for the visual identity reflection — not as final visual decisions.

---

## Layout & responsive principles (structural, keep)

- **12-column grid** with consistent gutters
- **Max content width** ~1280px, centered, with comfortable side padding
- **Mobile-first responsive** — participant flow is primarily mobile; admin flow is primarily desktop
- **No horizontal scrolling** at any viewport
- **Sticky contextual elements** where they matter:
  - Header (function name + participant identity) on phases ≥ canvas
  - Bottom action bars on intake + canvas (so the primary CTA is always reachable)
  - Vote-budget chip + cluster headers on the voting screen
- **Breakpoint principles:**
  - Wide (laptop+): full multi-column layouts visible simultaneously
  - Mid (tablet): collapse split columns, keep most density
  - Narrow (phone): single column, tab-based navigation where the screen would otherwise be too dense

---

## Color system — semantic roles to fill (no hex specified)

Your visual identity work should produce a palette that fills these roles. Some roles MUST be distinct (a user shouldn't confuse "starred" with "selected"); others can share treatments. Treat this list as the spec for *what colors do*, not what they look like.

**Foundation (2–3 colors):**
- **Background** — primary surface on which everything sits
- **Foreground** — primary text + UI elements; high contrast against background
- **Surface alt** — secondary surface for cards, sections, or contrasting blocks

**Action (1–2 colors):**
- **Primary action** — main CTA buttons, gate-bar submit buttons. The "do the next thing" color.
- **Accent / interactive** — links, focus rings, category badges, hover states. Distinguishes interactive elements without being primary.

**State (3–4 colors):**
- **Starred / favorited state** — fills the star icon when active, tints starred-card backgrounds. Should feel warm/positive.
- **Destructive** — delete confirmations, "Delete permanently" buttons. Should feel sharp/cautionary.
- **Idle / waiting** — yellow-orange-style indicator for participants who've been inactive >90s. Should feel "attention-needed" without being alarming.
- **Success** — toast for successful actions, post-submission confirmation banner. Should feel calm/affirmative.

**Hierarchy (2 colors):**
- **Muted foreground** — subtitles, helper text, meta info (timestamps, contributor names below ideas)
- **Borders / dividers** — quiet structure between cards and sections

**Optional category coding (6 colors):**
- The 6 primitive categories (Content, Automation, Research, Data, Technical, Strategy) currently have distinct accent colors per the original. Decide: keep the 6 distinct accents, simplify to 2–3 category groupings, or drop category coding entirely and rely on labels alone. This is a real decision — distinct colors aid scanning across categories but add system complexity.

**Cluster/theme coding:**
- Synthesized clusters (post-AI) inherit the dominant primitive's color as a badge. If you keep 6 category colors, this is automatic. If you simplify, decide how clusters get visually distinguished.

---

## Typography system — semantic roles to fill (no font specified)

Decide the type system after picking the aesthetic personality. Roles that MUST exist:

- **Display / H1** — page-level title, used once per screen
- **Section heading / H2–H3** — category section headers, modal titles, subsection labels
- **Body** — primary readable text (idea cards, intake answers, cluster summaries)
- **Helper / caption** — under-input hint text, word-count chips, timestamps, contributor attribution under cards
- **UI label / button text** — short, action-oriented, often uppercase or small-caps in the original
- **Code / monospace** (only if needed for session codes like `HR-4K2M`) — distinguishes code-like values

Single-typeface systems work well for this product (the original uses one). Pairings (display + body) can add personality at the cost of complexity. Decide based on aesthetic personality from Step 1.

---

## Spacing, radius, motion (principles, not values)

- **Spacing scale** — pick a consistent ratio (4 / 8 / 12 / 16 / 24 / 32 / 48 / 60 is one common scale). Apply across all card padding, section spacing, button heights.
- **Card radius** — one consistent radius across all cards (something between sharp/rectilinear and softly rounded; pick based on aesthetic personality).
- **Border weight** — typically 1px is enough; reserve 2px for emphasis (selected state, focus rings).
- **Touch targets** — minimum 44×44px on every interactive element. Non-negotiable on mobile.
- **Focus rings** — visible, consistent, accessible (clearly distinguishable from hover and default states). Use the accent / interactive color.
- **Motion** — pick a personality (snappy, considered, playful) and enforce consistency. Constraints:
  - Animate only `transform` and `opacity` — never `width`, `height`, or `all` (causes layout thrash)
  - Card hover: subtle lift (3D translation) + shadow elevation
  - Modal / drawer entries: ~250–400ms feels right for a workshop tool; longer feels sluggish, shorter feels jumpy
  - Nothing flashes, bounces aggressively, or distracts during the canvas/voting phases

---

## Accessibility baseline (keep regardless of identity)

These are non-negotiable regardless of visual identity choice:

- **WCAG 2.1 AA contrast** on all text against its background.
- **Always-visible focus state** on every interactive element. Never `outline: none` without replacement.
- **Semantic HTML:** `<button>` for actions, `<a>` for navigation, properly labeled `<input>`s.
- **ARIA labels** on icon-only buttons (star, edit, delete, vote toggle).
- **Keyboard navigation:** Tab through cards, Space/Enter on toggles, Escape to close drawers/modals.
- **`aria-live="polite"`** on word-count chips and validation messages.

---

## Hard constraints (carry forward from original)

These come from the original app's hard-learned lessons:
- **No `transition: all`** on animated containers — it breaks layout when sibling elements collapse (e.g., chat drawer closing).
- **No paper-grain or texture overlays** — disabled in the original; do not reintroduce.
- **No horizontal scrolling** at any viewport.
- **Static chat openers** — when a chat drawer opens, show an instant scripted greeting; do NOT fire an LLM call on open. Saves 4–6s of latency and lets the user drive direction.

---

## Screens to design (in user-flow order)

12 screens. Each lists route, persona, purpose, structural elements, **exact verbatim copy**, and interactions. Visual color/type references are written as semantic roles (e.g., "primary action color", "starred state surface") — fill them in based on your visual identity from Step 2.

---

### Screen 1: AdminCreate — Session creation landing

**Route:** `/`
**Persona:** facilitator/owner creating a workshop
**Device:** desktop primarily

**Purpose:** Admin lands here, picks a function, optionally fills team size + industry, and gets two URLs (admin board + participant join link).

**Layout:**
- Hero header centered, max-width ~720px
- Form card below header, surface-alt on background
- After submit: success card showing both URLs with copy buttons + bookmark prompt

**Elements & copy:**
- H1: `New workshop`
- Subheader (large body): `Create a session, share the participant URL with your team, and run the workshop together.`
- Form fields:
  - **Function (required)** — text input. Placeholder: `HR, Product Marketing, Sales…`
  - **Team size** (optional) — number input
  - **Industry / company context** (optional) — text input
- Primary action button: `CREATE WORKSHOP`
- Post-create state:
  - Banner (top, dismissible, attention surface): `🔖 BOOKMARK THIS URL — IT'S THE ONLY WAY BACK TO YOUR ADMIN VIEW.`
  - Two URL rows side-by-side (stack on mobile):
    - **Admin URL** — read-only field + copy button. Subtitle: "Keep this private. Bookmark it."
    - **Participant URL** — read-only field + copy button. Subtitle: "Share with your team."
  - Below: `[GO TO ADMIN BOARD →]` primary action

**Mobile:** form full-width; primary button full-width; URLs stack vertically.

---

### Screen 2: Join — Participant name entry

**Route:** `/s/:code/join`
**Persona:** participant arriving from a shared link, possibly on mobile
**Device:** mobile-first

**Purpose:** Lowest-friction entry. Name only.

**Layout:** centered single-column. Function name displayed as workshop context.

**Elements & copy:**
- H1: `Team Primitives`
- Subtitle: `${functionName} workshop — brainstorm where AI fits in your function`
- Body: `Enter your name to start. This will take about 20 minutes — make sure you have time to focus.`
- Input label: `Your name`
- Input placeholder: `e.g. Jordan, Priya, Alex`
- Primary action: `JOIN WORKSHOP →`
- Footer (muted): `${participantCount} ${participantCount === 1 ? "person" : "people"} already joined`

**Interactions:** submit disabled until input has at least 1 non-whitespace character. Submit triggers join + routes to intake screen.

---

### Screen 3: IntakeView — Three functional-level questions

**Route:** `/s/:code/p/:slug` (when `participant.phase === "intake"`)
**Device:** mobile-first

**Purpose:** Capture three open-ended functional answers that feed AI canvas generation.

**Layout:**
- Sticky header (compact: `${functionName} · ${participantName}` + connection state indicator)
- Three question cards stacked
- Sticky bottom gate bar with primary action

**Elements & copy:**

H1 (above cards): `Tell us about ${functionName}`
Subheader: `Three questions about your function — not your personal role. Answer however you'd describe it to a colleague. ~3 min.`

Question 1:
- Label (H3): `What does ${functionName} do well that AI could help you do 10x more of?`
- Helper (italic, muted): `Strengths AI could amplify. List things you're already good at.`
- Textarea (4 rows, autoexpand)
- Word-count chip:
  - 0–5 words: `Add a bit more` (muted)
  - 6–15 words: `Good start` (foreground)
  - 16+ words: `Great detail ✓` (success/affirmative state)

Question 2:
- Label: `Where does ${functionName} get stuck or slowed down that AI could help unblock?`
- Helper: `Bottlenecks, handoffs, waiting time, things that drain energy.`

Question 3:
- Label: `If you could snap your fingers and have AI handle one thing in ${functionName} tomorrow, what would it be?`
- Helper: `The one thing you'd offload first.`

Bottom gate bar (sticky):
- Disabled: `FILL ALL 3 TO CONTINUE`
- Enabled: `GENERATE MY AI CANVAS →` (primary action)

---

### Screen 4: GeneratingIndicator — Canvas-gen loading state

**Purpose:** Mask 6–12s LLM latency with a 6-step rotating animation. **NEVER use a bare spinner** — the original team validated this is critical for reducing user anxiety.

**Layout:** centered full-screen card.

**Elements & copy:**
- H1: `Generating your AI canvas…`
- Subline: `This takes 6–10 seconds. We're brainstorming use cases across all 6 primitive categories based on your answers.`
- 6-step rotator (cycles every ~1.7s):
  1. `Content Creation — What content could AI help you create faster and better?`
  2. `Task Automation — Which repetitive tasks follow a pattern AI could learn?`
  3. `Research & Synthesis — Where does research and synthesis slow you down?`
  4. `Data & Insights — What data patterns could AI surface for you?`
  5. `Technical Work — What technical work could AI handle or assist with?`
  6. `Strategy & Ideation — Where could an AI brainstorming partner help most?`
- Each step number scales up briefly when active; an accent dot can pulse

**Retry copy** (only after 12s elapsed): subline changes to `Generating… (retrying due to high load)`

The rotation IS the loading affordance — no spinner.

---

### Screen 5: CanvasView — Personal 6-primitive canvas

**Route:** `/s/:code/p/:slug` (when `participant.phase === "canvas"`)
**Device:** mobile + desktop

**Purpose:** 6 collapsible category sections. Each has 2–3 AI-generated ideas. Participant edits, deletes, adds, refines via per-category chat, stars 5–10 favorites.

**Layout:**
- Sticky header
- Stats bar: `${total} ideas | ${categoriesFilled}/6 categories | ${starred} starred`
- 6 category sections
- Sticky bottom gate bar

**Per category section:**
- Header band with category accent (decide whether 6 distinct category colors or simplified system)
- H3: `${number}. ${title}` (e.g., `1. Content Creation`)
- Italic description below: `${description}` (e.g., `Text, presentations, reports, communications`)
- "Go Deeper" button (top-right): `💬 GO DEEPER ON ${title}`
- Idea cards (2–3 from AI + user-added)
- Add-idea input at bottom: placeholder `Add your own idea for ${title}…`

**IdeaCard:**
- Card surface, border, comfortable padding
- 3-column flex: star button (left, 44×44) | idea text (center, body, max 40 words) | edit + delete icons (right, 44×44 each)
- Default state: outlined star icon
- Starred state: filled star icon (in starred state color), card background tinted with starred state surface
- Edit mode: inline textarea with save / cancel
- Delete: two-step. First click reveals destructive confirm button; second click confirms.

**Stats bar (top, sticky-ish):**
- `${total} ideas | ${categoriesFilled}/6 categories | ${starred} starred`

**Bottom gate bar (sticky):**
- Disabled (under 5 stars): `STAR ${5 - starred} MORE TO CONTINUE`
- Enabled (5–10 stars): `SUBMIT STARS TO TEAM →` (primary action)
- Above 10 stars: prevent further starring; tooltip "10 max"

**Submit confirmation modal:**
- Title: `Submit your stars`
- Body: `Submit ${starred} starred ideas to the team board? You won't be able to add or change ideas after this — but you can still vote later.`
- Buttons: `CANCEL` (ghost) | `SUBMIT STARS` (primary)

---

### Screen 6: ChatDrawer — Per-category "Go Deeper" chat

**Trigger:** "Go Deeper" button on any category in CanvasView.
**Device:** desktop = right-side panel; mobile = full-screen overlay.

**Purpose:** Conversational refinement. User pushes back on AI's category ideas, asks for variations, gets new suggestions to add.

**Elements & copy:**
- Drawer header: category icon + `${category.title}` + close button
- Subheader: `${category.description}` (italic)
- **Static greeting (NO LLM call on open):** assistant bubble shows instantly: `Let's explore ${category.title}. What would be most useful to dig into?`
- Message list (scrollable, newest at bottom):
  - User bubbles: right-aligned
  - Assistant bubbles: left-aligned, may include 1–3 suggested ideas as inline cards with `[+ ADD]` button per idea
- Input at bottom: textarea (1–4 rows auto-grow) + send button (44×44)
- Loading: thinking dots in assistant bubble while LLM responds

**Add-idea interaction:**
- "Add" on a suggested idea pushes it to the participant's canvas in that category; button changes to `✓ ADDED` (disabled, deemphasized state)

**Mobile-specific:**
- Full-screen overlay (NOT side panel)
- Tap-outside-to-close requires confirmation if input has unsent text

---

### Screen 7: MyBoardView (locked) — Read-only personal recap + state-aware tabs

**Route:** `/s/:code/p/:slug` (when `participant.phase === "locked"`)
**Device:** mobile + desktop

**Purpose:** Show participant their submitted contribution AND adapt to whatever phase the session is in. Four substates surface as different subheaders + tab options.

**Layout:**
- Sticky header
- Confirmation banner (success state): `Your contribution is locked in ✓`
- State-dependent subheader (one of four)
- Tab nav (only relevant tabs shown for current state)
- Active tab content area
- Footer: personal export + "Not you?" reset link

**State-dependent subheaders:**

State A — no synthesis yet:
- `Waiting for ${remaining} more teammate${remaining === 1 ? "" : "s"} to finish, then your admin will synthesize the team's ideas.`
- Visible tabs: `My board`

State B — synthesis ready, voting not opened:
- `The team board is ready. Click "Team board" to see how everyone's ideas come together.`
- Visible tabs: `My board` | `Team board`

State C — voting open:
- `Voting is open! You have ${budget} votes. Click "Vote" to choose your team's priorities.`
- Visible tabs: `My board` | `Team board` | `Vote`

State D — voting closed:
- `Voting is complete. Click "Final results" to see the team's top ideas.`
- Visible tabs: `My board` | `Team board` | `Final results`

**My board tab:**
- Same 6-category layout as CanvasView, read-only
- Stars visible but not toggleable; no edit/delete/add
- Personal export button: `DOWNLOAD MY IDEAS AS WORD`

**Footer "Not you?" link (small, muted):**
- `Not you? Reset and re-enter your name`
- ConfirmModal: "Clear local session? You'll need to re-enter your name on this device."

**Mobile:** tab nav becomes horizontal scroll if 4 tabs; otherwise inline.

---

### Screen 8: Team board (synthesized clusters) — read-through view

**Route:** `/s/:code/p/:slug` (locked phase, "Team board" tab)
**Device:** mobile + desktop

**Purpose:** Show AI-synthesized clusters across all participants' starred ideas. Pre-voting view. Source counts (NOT vote counts) shown.

**Layout:**
- H1: `${functionName} — team board`
- Subheader: `${clusterCount} themes from ${participantCount} teammates' starred ideas.`
- Clusters listed vertically; each is a `ClusterCard`

**ClusterCard:**
- Card surface, border, 20–24 unit padding
- Top row: cluster title (H3) + category badge (accent color) + source-count chip (e.g., `5 STARS`)
- Cluster summary (1–2 sentences, body, muted tone)
- Member ideas list (collapsible "Show member ideas" toggle):
  - Each member idea: small bullet with text + `(${participantName})` attribution

**Sort:** descending by source count.

---

### Screen 9: VoteView — Cast your votes

**Route:** `/s/:code/p/:slug` (locked phase, "Vote" tab, when `votingStatus === "open"`)
**Device:** mobile-first (often used on phones during workshops)

**Purpose:** Each participant spends N votes on individual ideas (one vote max per idea). Clusters are visual organizers only — the unit of voting is the idea.

**Layout:**
- Sticky vote-budget chip at top
- H1 + subheader
- Cluster sections (sticky cluster headers when scrolled into view)
- Footer: explanation about hidden vote counts

**Sticky vote-budget chip:**
- Strong contrast surface (high-contrast, top of stacking context — must read at a glance)
- Centered text: `${used}/${budget} VOTES USED`
- When budget exhausted: `${used}/${budget} — ALL VOTES IN ✓`
- Visible while scrolling

**H1:** `Vote for your team's top ideas`
**Subheader:** `You have ${budget} votes. One vote per idea. Pick the ideas you most want to see ${functionName} actually do.`

**Cluster section:**
- Sticky cluster header (sticks under the budget chip when scrolled into view): cluster title + tooltip icon (reveals cluster summary)
- Idea cards stacked below in single column

**Voteable IdeaCard:**
- Layout: text on left (60–70% width), vote toggle on right (44×44 touch target)
- Vote toggle off (default): outline style, label `VOTE`
- Vote toggle on: filled (primary action color), label `✓ VOTED`
- Disabled state (budget exhausted, this idea unvoted): visibly inactive, tooltip "Use up to your budget"
- Tap to toggle on/off (votes are reversible while voting open — no confirm)

**Footer (after last cluster):**
- Italic, muted: `Votes remain hidden from the team until the admin closes voting.`

**Sort within cluster:** alphabetical by idea text. **Cluster order:** by source count desc.

**Mobile critical:** sticky budget chip + sticky cluster headers + 44×44 touch targets are non-negotiable. With 60+ ideas, scroll context matters intensely.

---

### Screen 10: RankedIdeasView — Final results

**Route:** `/s/:code/p/:slug` (locked, "Final results" tab, when `votingStatus === "closed_with_results"`)
**Device:** mobile + desktop

**Purpose:** Show the post-voting ranked list. The team's "what we collectively prioritize" outcome.

**Layout:**
- H1: `Your team's top AI ideas`
- Subheader: `Ranked by votes from all ${participantCount} teammates.`
- Top-3 highlighted block: 3 large cards with rank-1/2/3 visual emphasis
- Full ranked list below: numbered rows with idea text + vote count + contributor + cluster badge
- Tie note (only if ties): `Ties broken by who first contributed the idea.`
- Export buttons (admin/owner view only):
  - `DOWNLOAD RANKED LIST (WORD)` (primary)
  - `DOWNLOAD FULL BOARD (WORD)` (ghost / secondary)

**Per-row format:**
- `${rank}. ${ideaText}` — bold body
- Beneath: `${voteCount} votes · ${contributorName} · ${clusterTitle}` — small meta, muted

**Top-3 emphasis block:**
- Three cards side-by-side on desktop, stacked on mobile
- Rank 1 has slight scale + emphasized number (visual hero treatment)
- Ranks 2 + 3 are quieter

---

### Screen 11: AdminBoard — Live workshop control + post-processing

**Route:** `/s/:code/admin?k=:adminKey`
**Device:** desktop primarily; mobile uses a tab interface

**Purpose:** The admin's command center. Pre-synthesis: live roster + raw starred list. Post-synthesis: clusters + voting controls + export.

**Layout (desktop):**
- Sticky header: `${functionName} workshop — admin` + bookmark banner
- Top section: ShareLinkPanel
- Two-column split below:
  - Left: RosterPanel + VotingControlsPanel
  - Right: RawStarredList + SynthesizeButton/ClusterCards
- Bottom: export buttons

**Layout (mobile <768px):** tab interface — `Roster` | `Ideas` | `Synthesis` | `Voting` | `Export`

**ShareLinkPanel:**
- Two URL rows + copy buttons
- Bookmark banner (dismissible, attention surface): `🔖 BOOKMARK THIS URL — IT'S THE ONLY WAY BACK TO THIS ADMIN VIEW.`

**RosterPanel:**
- H3: `Participants (${participantCount})`
- Sort selector: `Sort by phase | name | activity desc`
- Empty state: `Waiting for participants to join and lock their stars. You'll be able to synthesize once at least 2 are done.`
- Per row:
  - Name + slug
  - Phase chip: `INTAKE` (neutral muted) | `CANVAS` (accent) | `LOCKED` (success)
  - Counts: `12 ideas, 4 starred` (muted small)
  - Time-in-phase: `8 min in Canvas` (muted small)
  - Idle indicator (idle state color + `idle 4 min`) when last activity > 90s

**SynthesizeButton:**
- Disabled: `SYNTHESIZE (NEED AT LEAST 2 LOCKED PARTICIPANTS)`
- Enabled: `SYNTHESIZE TEAM IDEAS` (primary)
- After first run: `RE-SYNTHESIZE (INCORPORATE LATEST STARS)`
- Loading: GeneratingIndicator with synthesis-specific 5-step rotator

**RawStarredList:**
- H3: `All starred ideas (${starredCount})`
- Pre-synthesis: only view of starred content
- Grouped by category, attribution `(${participantName})`
- Always visible (safety net for prompt-quality issues)

**ClusterCards (post-synthesis):** see Screen 8 spec.

**VotingControlsPanel (after synthesis):**
- Pre-voting: `Votes per participant` number input (default 3) + `OPEN VOTING ROUND` (primary)
- Voting open: live tally (admin-only) + `CLOSE VOTING & REVEAL RESULTS` (primary)
- Voting closed: `RE-OPEN VOTING` (ghost) + final ranked list embedded

**Export buttons:**
- `DOWNLOAD TOP IDEAS (RANKED LIST)` (primary)
- `DOWNLOAD FULL BOARD` (ghost)

---

### Screen 12: OwnerDashboard — Cross-session library

**Route:** `/owner#k=:ownerKey` (key in URL fragment, NOT query string — strip from address bar after parse)
**Device:** desktop

**Purpose:** Read-through index across every workshop the owner has created. Click into any session, download any session, or delete any session.

**Layout:**
- Top bar: `[EXPORT ALL AS ZIP]` button on right
- Single sortable table below

**Table columns (sortable, default sort: createdAt desc):**

| Function | Created | Participants | Ideas | Votes | Top voted idea | Actions |
|----------|---------|--------------|-------|-------|----------------|---------|
| HR | YYYY-MM-DD | 6 | 47 | 12 | Draft rejection emails… | `[OPEN]` `[DOWNLOAD]` `[DELETE]` |

**Per row:**
- Function name (bold)
- Created date
- Numeric counts
- Top-voted idea text — truncated ~50 chars with ellipsis; full text in tooltip
- Three small inline action buttons

**Delete ConfirmModal:**
- Title: `Delete session`
- Body: `Delete session ${functionName} (${code})? This permanently deletes all ${N} participants' data and cannot be undone.`
- Buttons: `CANCEL` (ghost) | `DELETE PERMANENTLY` (destructive)

**Bookmark banner on first load:**
- `🔖 BOOKMARK THIS URL — IT'S THE ONLY WAY BACK TO YOUR SESSIONS.` (auto-copies to clipboard, dismissible)

**Empty state:**
- `No sessions yet. Sessions you create will appear here.`

---

## Common components used across screens

### Header (sticky on phases ≥ canvas)
- Left: function name + participant/admin name
- Right: connection-state indicator (online / offline) + dismiss buttons on banners

### ConfirmModal
- Centered overlay, dim backdrop
- Title (H3) + body (1–2 sentences) + two buttons (ghost cancel + colored confirm)
- Closeable via Escape + click-on-backdrop

### Toast
- Top-right (desktop) / top-center (mobile)
- 3-second auto-dismiss
- Variants: info, success, error
- Single line of text

### ErrorBanner (inline)
- Border-left (destructive color), tinted background
- Used for LLM action failures with retry button
- Copy: `Hmm, that didn't work. Try again?` + `[RETRY]`

### Connection-state indicator
- Small dot in header
- Online state vs. offline state (visually distinct)
- Tooltip: `Offline — changes will save when you reconnect.` / `Back online ✓`

---

## Mobile-specific notes

- **Participant flow** (Screens 2, 3, 5, 7, 9, 10) MUST work flawlessly at 375×812 (iPhone SE size).
- **Admin flow** (Screens 1, 11) and **OwnerDashboard** (12) are desktop-first; minimum supported width 768px.
- **Chat drawer on mobile = full-screen overlay**, NOT side panel.
- **Sticky elements on mobile:** header (3, 5, 7), vote-budget chip (9), bottom gate bar (3, 5).
- **Touch targets:** 44×44 minimum everywhere — star buttons, edit/delete icons, vote toggles, tab triggers.

---

## Accessibility notes

- WCAG 2.1 AA contrast on all text (validate with the chosen palette).
- Visible focus state on every interactive element (chosen color + visible offset).
- Semantic HTML: `<button>` for actions, `<a>` for navigation, labeled `<input>`s.
- ARIA labels on icon-only buttons:
  - Star: `aria-label="Star this idea"` / `"Unstar this idea"`
  - Edit pencil: `aria-label="Edit idea"`
  - Delete trash: `aria-label="Delete idea"`
  - Vote toggle: `aria-label="Vote for: ${ideaText}"`
- Keyboard nav: Tab through cards, Space/Enter for stars + votes, Escape to close drawer/modal.
- Word-count chips and validation messages use `aria-live="polite"`.

---

## Output format expected from Claude (post-reflection)

Once visual identity is decided in Step 2, request screen designs as:
1. **One React + Tailwind component per screen** (specify TypeScript or JS)
2. **Mock data inline** so each component renders standalone
3. **Comments at top** listing route + key props
4. **Mobile-first responsive classes** — narrow first, then `md:` and `lg:` modifiers
5. **No real network calls or routing** — pure presentational, ready to wire to Convex queries later
6. **Token usage** — every visual choice (color, spacing, type) should reference a Tailwind config token; no hardcoded hex/px values

End each artifact request with: *"Render the component fullscreen with mock data so I can see it visually."*

---

## Suggested reflection workflow

1. **Paste this whole file** into Claude.ai
2. **Ask Claude:** *"Read this brief. Don't design any screens yet. Instead, propose 3 distinct visual identities (palette + type + spacing personality + motion feel) that could each work for this product. Show each as: a small color swatch grid, a type sample with H1/H2/body/button, a one-paragraph tone description. Then ask me which to develop further."*
3. **Pick a direction.** Maybe iterate Claude's proposal — "make it warmer", "less corporate", "more confident type contrast".
4. **Ask Claude to expand the chosen direction** into a complete token spec — full palette with semantic role mappings, type scale with sizes, spacing scale, radius/border choices, motion timings.
5. **Save the token spec** as a separate `DESIGN_TOKENS.md` file (so it's referenceable when designing screens or later when implementing).
6. **Now design screens** — paste this brief PLUS the token spec; Claude has both the structure and the visual identity it needs.

The result: deliberate visual identity choice instead of accidental defaults, plus screens that fit a coherent system.
