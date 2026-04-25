# Team Primitives — Design Brief

**This document is the original (pre-build) design spec.** It captured the design intent before any code was written. The app has since been built; for the canonical record of what was actually shipped + how it diverged from this spec, see `PLAN.md` → "Build status" section.

**Notable divergences from this spec, as-built (~April 2026):**
- **Screen 1 (AdminCreate)** is no longer a session-creation form. Sessions are created from the owner dashboard's "+ New workshop" modal. `/` is now a minimal landing pointing owners to their bookmark and participants to their join link, plus a "Lost your owner URL? Restore from backup" link. See PLAN.md divergence #1.
- **"Cluster" was dropped as a user-facing concept.** Synthesis is "Team's ideas — duplicates removed." Internal data shape unchanged. See PLAN.md divergence #2.
- **Voting unit = deduplicated idea**, not raw individual stars. See PLAN.md divergence #3.
- **Screen 13 (OwnerRestore)** was added at `/owner/restore` for owner URL recovery via local backup file. See "Screen 13" added below.
- **Editorial design language** with a consistent kicker-tick + small-caps tracked label + display title + hairline rule pattern was applied across all pages after Phase D. See CLAUDE.md → "Design Language (editorial broadcast)" section.

The screen-by-screen specs below remain useful as design intent / copy references, but treat them as the original brief, not the as-built source of truth.

---

**Use this document as the source for designing screens with Claude.** Paste the whole brief for a comprehensive design pass, or copy individual screen sections to iterate one screen at a time. Every user-facing string is provided verbatim — do not invent copy.

---

## How to use this with Claude

**For a full design pass:** paste this entire document into Claude.ai and ask: *"Design all the screens listed below as React + Tailwind components. Match the design system spec exactly. Use the exact copy provided per screen. Output one artifact per screen."*

**For one screen at a time:** copy the "Design system" section + the specific screen section + the "Common components" section, and ask: *"Design the [screen name] using the design system below. Match the copy verbatim."*

**For a clickable prototype:** ask Claude to wire the screens together via React Router with the routes listed in each section, and stub out interactions with mock data so you can click through.

---

## Project context (1-paragraph summary)

**Team Primitives** is a team-based AI brainstorming workshop tool. A facilitator (admin) creates a session for a function (HR, Product Marketing, Sales, etc.); 5–10 teammates join via a shared link from their phones or laptops; each one independently goes through a personalized AI canvas (6 primitive categories: Content, Automation, Research, Data, Technical, Strategy); each stars 5–10 favorite ideas; the admin then triggers AI synthesis to cluster everyone's stars into themes, opens a voting round (admin-configured budget; one vote per idea max), and exports a ranked list of team priorities. The aesthetic is bold, editorial, magazine-grade — black/white with red accents, Montserrat type, dense workflows kept readable through strict hierarchy.

---

## Design system (must follow exactly)

### Aesthetic
Bold modern. High-contrast. Editorial magazine vibe. Black-and-white foundation with red and electric-blue used surgically for emphasis and action. Energetic but controlled, never noisy. **Interaction clarity beats decorative complexity.**

### Color tokens
- `--black: #000000` — primary text + dark surfaces
- `--white: #FFFFFF` — primary background + cards
- `--red: #E30613` — CTAs, stars, critical emphasis
- `--electric-blue: #00A3E0` — category badges, hover states, focus rings
- `--starred-bg: #FFF2F3` — soft red wash for starred-card backgrounds
- `--surface: #F5F5F5` — light gray surface variant
- `--dark-gray: #333333` — secondary text
- `--light-gray: #CCCCCC` — borders, dividers
- `--neon-yellow: #FFFF00` — sparingly, for "in progress" or "complete" highlights only

### Typography
**Single typeface: Montserrat** (weights 400–700). Do NOT use Roboto Condensed despite what the original Design Bible mentions — the project CLAUDE.md overrides this.

- Body: 16px desktop / 14px mobile, weight 400, line-height 1.5, letter-spacing 0.03em
- H1: clamp(2.2rem, 4vw, 2.75rem), weight 700, line-height 1.2, letter-spacing 0.06em
- H2: clamp(1.9rem, 3vw, 2rem), weight 700
- H3: 1.2–1.375rem, weight 700
- Buttons / nav labels: 16px, weight 500–600, **UPPERCASE** with letter-spacing 0.08em
- Helper text: 13px, weight 400, color dark-gray

### Spacing & layout
- 12-column grid, 20px gutters
- Container max-width: `min(100% - 24px, 1280px)`
- Section spacing: 60px desktop / 32px mobile
- Card padding: 20–24px
- Border radius: 6px
- Border weight: 1px (icons can use 2px stroke)
- Min touch target: 44×44px
- Focus ring: 3px electric-blue outline with 2px offset

### Breakpoints
- `<992px`: collapse split columns
- `<768px`: stack header internals, reduce typography
- `<576px`: full-width primary action groups

### Motion
- Transitions: 0.3–0.5s
- Allowed properties: `transform`, `opacity`. Never `transition: all`.
- Card hover lift: 4–6px translateY + soft shadow

### Accessibility
- WCAG 2.1 AA contrast minimums
- Always-visible focus states (the electric-blue ring above)
- Semantic landmarks: `<header>`, `<main>`, `<nav>` per page
- ARIA labels on icon-only buttons (star, edit, delete, vote toggle)

### Hard "don'ts" (from project history)
- No horizontal scrolling at any viewport
- No `transition: all` (breaks layout on chat-drawer close)
- No fonts other than Montserrat
- No paper-grain or texture overlays (disabled in original)
- No phase names other than "AI Use Cases" (in original) — but in Team Primitives we use the participant phase names from the screens below

---

## Screens to design (in user-flow order)

13 screens total (Screen 13 was added post-build for owner URL recovery). Each has route, purpose, elements, copy (verbatim), and interactions.

---

### Screen 1: AdminCreate — Session creation landing

**Route:** `/`
**Persona:** facilitator/owner creating a workshop
**Device:** desktop primarily

**Purpose:** Admin lands here, picks a function, optionally fills team size + industry, and gets two URLs (admin board + participant join link).

**Layout:**
- Hero header centered, max-width ~720px
- Form card below header, white surface on light-gray background
- After submit: success card showing both URLs with copy buttons + bookmark prompt

**Elements & copy:**
- H1: `New workshop`
- Subheader (large body text): `Create a session, share the participant URL with your team, and run the workshop together.`
- Form fields:
  - **Function (required)** — text input. Placeholder: `HR, Product Marketing, Sales…`
  - **Team size** (optional) — number input, label `Team size`
  - **Industry / company context** (optional) — text input
- Primary button (red, full-width on mobile, fixed-width on desktop): `CREATE WORKSHOP`
- Post-create success state:
  - Banner (top, dismissible, soft-yellow tint): `🔖 BOOKMARK THIS URL — IT'S THE ONLY WAY BACK TO YOUR ADMIN VIEW.` (auto-copies admin URL to clipboard on render)
  - Two URL rows side-by-side (stack on mobile):
    - **Admin URL** — read-only field + `[COPY]` button. Subtitle: "Keep this private. Bookmark it."
    - **Participant URL** — read-only field + `[COPY]` button. Subtitle: "Share with your team."
  - Below: `[GO TO ADMIN BOARD →]` primary CTA

**Mobile:** form fields full-width, primary button full-width, post-create URLs stack vertically.

---

### Screen 2: Join — Participant name entry

**Route:** `/s/:code/join`
**Persona:** participant arriving from a shared link, possibly on mobile
**Device:** mobile-first

**Purpose:** Participant enters their name and joins the workshop. Lowest-friction entry — name only, no email, no auth.

**Layout:**
- Centered single-column layout
- Function name displayed prominently as workshop context
- Single text input + submit button
- Footer line shows live participant count (Convex subscription)

**Elements & copy:**
- H1: `Team Primitives`
- Subtitle (H2-ish): `${functionName} workshop — brainstorm where AI fits in your function`
- Body: `Enter your name to start. This will take about 20 minutes — make sure you have time to focus.`
- Input label: `Your name`
- Input placeholder: `e.g. Jordan, Priya, Alex`
- Primary button (red, full-width on mobile): `JOIN WORKSHOP →`
- Footer (small, dark-gray): `${participantCount} ${participantCount === 1 ? "person" : "people"} already joined`

**Interactions:** submit disabled until name has at least 1 non-whitespace character. Submit triggers `joinSession` mutation, then routes to `/s/:code/p/:slug` (intake screen).

**Mobile:** dominant view; input has `autoFocus` and `inputMode="text"` for proper keyboard.

---

### Screen 3: IntakeView — Three functional-level questions

**Route:** `/s/:code/p/:slug` (when `participant.phase === "intake"`)
**Persona:** participant after joining
**Device:** mobile-first

**Purpose:** Each teammate answers three questions about their function (not their personal role). The AI uses these as input to generate a personalized 6-primitive canvas.

**Layout:**
- Sticky header (compact, shows session function + participant name)
- Three question cards stacked vertically, each with: question label, helper text below, textarea, word-count chip
- Bottom: gate bar with primary submit button

**Elements & copy:**

Sticky header:
- Left: `${functionName} · ${participantName}`
- Right: small dot showing connection state ("●" online / "○" offline) — no text

H1 (above the cards): `Tell us about ${functionName}`
Subheader: `Three questions about your function — not your personal role. Answer however you'd describe it to a colleague. ~3 min.`

Question 1:
- Label (H3): `What does ${functionName} do well that AI could help you do 10x more of?`
- Helper text (italic, dark-gray): `Strengths AI could amplify. List things you're already good at.`
- Textarea (4 rows default, autoexpand)
- Word-count chip below textarea, dynamic copy:
  - 0–5 words: `Add a bit more` (color: light gray)
  - 6–15 words: `Good start` (color: dark gray)
  - 16+ words: `Great detail ✓` (color: red)

Question 2:
- Label: `Where does ${functionName} get stuck or slowed down that AI could help unblock?`
- Helper: `Bottlenecks, handoffs, waiting time, things that drain energy.`
- Same textarea + word-count behavior

Question 3:
- Label: `If you could snap your fingers and have AI handle one thing in ${functionName} tomorrow, what would it be?`
- Helper: `The one thing you'd offload first.`
- Same textarea + word-count behavior

Bottom gate bar (sticky on scroll):
- Disabled state: `FILL ALL 3 TO CONTINUE` (dark gray, cursor not-allowed)
- Enabled state: `GENERATE MY AI CANVAS →` (red primary)

**Interactions:** all 3 fields required; button enabled only when all have ≥1 word. Submit calls `submitIntake` then triggers `generateCanvas` action; routes to GeneratingIndicator.

**Mobile:** vertical stack, no left/right padding past 16px.

---

### Screen 4: GeneratingIndicator — Canvas-gen loading state

**Route:** intermediate (between intake submit and canvas ready)
**Persona:** participant waiting 6–12s while AI generates ideas

**Purpose:** Mask LLM latency with a 6-step rotating animation that previews what's being generated. NEVER use a bare spinner — the original team learned this prevents user anxiety.

**Layout:**
- Centered full-screen card
- Animated section showing 6 category steps cycling through

**Elements & copy:**
- H1: `Generating your AI canvas…`
- Subline: `This takes 6–10 seconds. We're brainstorming use cases across all 6 primitive categories based on your answers.`
- 6-step rotator that cycles every ~1.7s, showing one category at a time:
  - `1. Content Creation — What content could AI help you create faster and better?`
  - `2. Task Automation — Which repetitive tasks follow a pattern AI could learn?`
  - `3. Research & Synthesis — Where does research and synthesis slow you down?`
  - `4. Data & Insights — What data patterns could AI surface for you?`
  - `5. Technical Work — What technical work could AI handle or assist with?`
  - `6. Strategy & Ideation — Where could an AI brainstorming partner help most?`
- Animation: number scales up (1 → 1.2) on activation, accent dot pulses

**Retry copy** (only after 12s elapsed): subline changes to `Generating… (retrying due to high load)`

**No spinner.** The rotation IS the loading affordance.

---

### Screen 5: CanvasView — Personal 6-primitive canvas

**Route:** `/s/:code/p/:slug` (when `participant.phase === "canvas"`)
**Persona:** participant refining ideas, starring favorites
**Device:** mobile + desktop

**Purpose:** Participant sees 6 collapsible category sections, each with 2–3 AI-generated ideas. They can edit, delete, add, refine via per-category chat, and star 5–10 favorites.

**Layout:**
- Sticky header (function · participant name · connection dot)
- Stats bar: `${total} ideas | ${categoriesFilled}/6 categories | ${starred} starred`
- 6 category sections, each with header + cards
- Sticky bottom gate bar with star count + submit

**Elements per category section:**
- Header band with the category color as accent (the 6 colors are: `#2D6A4F` content, `#5B21B6` automation, `#1D4ED8` research, `#B45309` data, `#475569` coding, `#BE185D` ideation)
- H3: `${number}. ${title}` (e.g., `1. Content Creation`)
- Description italic below title: `${description}` (e.g., `Text, presentations, reports, communications`)
- "Go Deeper" button (text + chat icon, top-right of section): `💬 GO DEEPER ON ${title}`
- Idea cards (2–3 from AI, plus user-added)
- Add-idea input at bottom: placeholder `Add your own idea for ${title}…`

**Idea card structure (`IdeaCard`):**
- White surface, 1px light-gray border, 6px radius, 16–20px padding
- Layout: 3-column flex
  - Left: star button (44×44px tap target). When unstarred: gray outline star. When starred: filled red star with `--starred-bg` background.
  - Center: idea text (body 16px, max 40 words)
  - Right: edit pencil icon + delete trash icon (44×44px each)
- Edit mode: text becomes inline textarea with save / cancel buttons
- Delete: two-step. First click shows red `DELETE?` button; click again confirms.
- Starred card: subtle pink wash background (`--starred-bg`), red star icon

**Stats bar (top, sticky-ish):**
- `${total} ideas | ${categoriesFilled}/6 categories | ${starred} starred` (separated by vertical rule)

**Bottom gate bar (sticky):**
- Disabled (under 5 stars): `STAR ${5 - starred} MORE TO CONTINUE` (gray)
- Enabled (5–10 stars): `SUBMIT STARS TO TEAM →` (red primary)
- Above 10 stars: prevent further starring; tooltip explains "10 max"

**Submit confirmation modal:**
- Title: `Submit your stars`
- Body: `Submit ${starred} starred ideas to the team board? You won't be able to add or change ideas after this — but you can still vote later.`
- Buttons: `CANCEL` (ghost) | `SUBMIT STARS` (red)

**Mobile:** category sections stack full-width, gate bar fixed at bottom, idea cards keep 3-column structure but with reduced padding.

---

### Screen 6: ChatDrawer — Per-category "Go Deeper" chat

**Trigger:** "Go Deeper" button on any CanvasView category
**Persona:** participant refining a specific category with AI
**Device:** desktop = right-side panel; mobile = full-screen overlay

**Purpose:** Conversational refinement. User pushes back on AI's category ideas, asks for variations, gets new suggestions to add to their canvas.

**Layout:**
- Desktop: 380–420px right-side drawer, slides in from right (0.3s ease-out)
- Mobile (<768px): full-screen overlay with close button top-right

**Elements & copy:**
- Drawer header: category icon + `${category.title}` + close button (X)
- Subheader: `${category.description}` (italic)
- Static greeting (NO LLM call on open — show this instantly):
  - Assistant bubble: `Let's explore ${category.title}. What would be most useful to dig into?`
- Message list (scrollable, newest at bottom):
  - User bubbles: right-aligned, dark text on white
  - Assistant bubbles: left-aligned, white card with light gray border
  - Each assistant bubble may include 1–3 suggested ideas as inline cards with `[+ ADD]` button per idea
- Input area at bottom:
  - Textarea (auto-grow 1–4 rows)
  - Send button (icon, 44×44px)
- Loading state: thinking dots in assistant bubble while LLM responds

**Interactions:**
- "Add" on a suggested idea: pushes it to the participant's canvas in that category, button changes to `✓ ADDED` (disabled)
- Drawer close: animate out, do NOT remount on next open (preserve state)
- Mobile: tap outside closes (with confirmation if input is non-empty)

---

### Screen 7: MyBoardView (locked) — Read-only personal recap + state-aware tabs

**Route:** `/s/:code/p/:slug` (when `participant.phase === "locked"`)
**Persona:** participant who has finalized their stars; possibly waiting, voting, or reviewing final results
**Device:** mobile + desktop

**Purpose:** Show the participant their submitted contribution AND adapt to whatever phase the session is in. Four possible substates surface as different subheaders + tab options.

**Layout:**
- Sticky header
- Confirmation banner: `Your contribution is locked in ✓`
- State-dependent subheader (one of four — see copy below)
- Tab nav: `My board` | `Team board` | `Vote` | `Final results` (only the relevant tabs shown for current state)
- Active tab content area
- Footer: `Download my ideas as Word` button + "Not you?" reset link

**State-dependent subheaders (use the right one based on session state):**

State A — no synthesis yet:
- Subheader: `Waiting for ${remaining} more teammate${remaining === 1 ? "" : "s"} to finish, then your admin will synthesize the team's ideas.`
- Visible tabs: `My board` only

State B — synthesis ready, voting not opened:
- Subheader: `The team board is ready. Click "Team board" to see how everyone's ideas come together.`
- Visible tabs: `My board` | `Team board`

State C — voting open:
- Subheader: `Voting is open! You have ${budget} votes. Click "Vote" to choose your team's priorities.`
- Visible tabs: `My board` | `Team board` | `Vote`

State D — voting closed:
- Subheader: `Voting is complete. Click "Final results" to see the team's top ideas.`
- Visible tabs: `My board` | `Team board` | `Final results`

**My board tab content:**
- Same 6-category layout as CanvasView, but read-only
- Stars are visible but not toggleable
- No edit/delete/add affordances
- Personal export button at bottom: `DOWNLOAD MY IDEAS AS WORD`

**Footer "Not you?" link (small, dark gray):**
- `Not you? Reset and re-enter your name`
- Opens ConfirmModal: "Clear local session? You'll need to re-enter your name on this device."

**Mobile:** tab nav becomes a horizontal scroll if 4 tabs, otherwise inline.

---

### Screen 8: Team board (synthesized clusters) — read-through view

**Route:** `/s/:code/p/:slug` (locked phase, "Team board" tab)
**Persona:** locked participant or admin viewing the synthesis result
**Device:** mobile + desktop

**Purpose:** Show the AI-synthesized clusters across all participants' starred ideas. Pre-voting, this is the team's "big picture" view. Source counts (NOT vote counts) shown.

**Layout:**
- H1: `${functionName} — team board`
- Subheader: `${clusterCount} themes from ${participantCount} teammates' starred ideas.`
- Clusters listed vertically; each is a `ClusterCard`

**ClusterCard:**
- White surface, 1px border, 6px radius, 20–24px padding
- Top row: cluster title (H3) + category badge (electric-blue chip) + source-count chip (e.g., `5 STARS`)
- Cluster summary (1–2 sentences, body text, italic-ish or muted)
- Member ideas list (collapsible "Show member ideas" toggle):
  - Each member idea: small bullet with text + `(${participantName})` attribution

**Sort:** descending by source count.

**Pre-voting:** show source counts only (no vote chips). Post-voting: this view stays accessible but the "Final results" tab becomes the primary surface.

---

### Screen 9: VoteView — Cast your votes

**Route:** `/s/:code/p/:slug` (locked phase, "Vote" tab, when votingStatus === "open")
**Persona:** participant casting votes
**Device:** mobile-first (often used on phones during workshops)

**Purpose:** Let each participant spend their N votes on individual ideas (one vote max per idea). Clusters shown only as visual organizers — the unit of voting is the idea.

**Layout:**
- Sticky vote-budget chip at top (44px tall, full-width on mobile)
- H1: `Vote for your team's top ideas`
- Subheader: `You have ${budget} votes. One vote per idea. Pick the ideas you most want to see ${functionName} actually do.`
- Cluster sections (sticky cluster headers when scrolling on mobile)
- Each cluster shows its ideas as voteable cards
- Footer: explanatory text about hidden vote counts

**Sticky vote-budget chip (top):**
- Background: black; text white
- Centered text: `${used}/${budget} VOTES USED`
- When `used === budget`: chip changes to: `${used}/${budget} — ALL VOTES IN ✓` (still black)
- Always visible while scrolling through ideas

**Cluster section:**
- Sticky cluster header (sticks to top under the vote-budget chip when scrolled into view): cluster title + tooltip icon (hover/tap reveals cluster summary)
- Idea cards stacked below (1 column always; vote toggle on right edge for thumb reach on mobile)

**Voteable IdeaCard:**
- Layout: text on left (60–70% width), vote toggle on right (44×44px touch target)
- Vote toggle off (default): outline button, label `VOTE`
- Vote toggle on: filled red button, label `✓ VOTED`
- Disabled state (when budget exhausted AND this idea isn't already voted): toggle grayed out with tooltip "Use up to your budget"
- Tap to toggle on/off (no separate confirm — votes are reversible while voting open)

**Footer (after last cluster):**
- Small italic body: `Votes remain hidden from the team until the admin closes voting.`

**Sort within cluster:** alphabetical by idea text. **Cluster order:** by source count descending (same order synthesis returned).

**Mobile critical:** sticky budget chip + sticky cluster headers + 44×44 touch targets are non-negotiable here. With 60+ ideas, scroll context matters.

---

### Screen 10: RankedIdeasView — Final results

**Route:** `/s/:code/p/:slug` (locked phase, "Final results" tab, when votingStatus === "closed_with_results")
**Persona:** any participant or admin viewing the final ranked list
**Device:** mobile + desktop

**Purpose:** Show the post-voting ranked list. This is the team's "what we collectively prioritize" outcome.

**Layout:**
- H1: `Your team's top AI ideas`
- Subheader: `Ranked by votes from all ${participantCount} teammates.`
- Optional top-3 highlighted block: 3 large cards with rank-1/2/3 visual emphasis (large numerals, red accent on #1)
- Full ranked list below: numbered rows, each with idea text + vote count chip + contributor + cluster badge
- Tie note (only if ties exist): small italic line — `Ties broken by who first contributed the idea.`
- Export buttons (admin/owner only at this view; participants don't see export here):
  - `DOWNLOAD RANKED LIST (WORD)` (red primary)
  - `DOWNLOAD FULL BOARD (WORD)` (ghost secondary)

**Per-row format:**
- `${rank}. ${ideaText}` — bold body text
- Beneath: `${voteCount} votes · ${contributorName} · ${clusterTitle}` — small meta, dark-gray

**Top-3 emphasis block:**
- Three side-by-side cards on desktop, stacked on mobile
- Rank 1 card has slight scale (1.05x), red number badge, larger text
- Rank 2 + 3 cards plain

**Mobile:** top-3 stacks; full ranked list reads as a clean numbered list.

---

### Screen 11: AdminBoard — Live workshop control + post-processing

**Route:** `/s/:code/admin?k=:adminKey`
**Persona:** session admin (group lead running the workshop)
**Device:** desktop primarily (admin board is desktop-first per plan)

**Purpose:** The admin's command center. Pre-synthesis: live roster + raw starred list. Post-synthesis: clusters + voting controls + export. One screen with sections that progressively unlock.

**Layout (desktop):**
- Sticky header: `${functionName} workshop — admin` + bookmark banner
- Top section: **ShareLinkPanel** — both URLs, copy buttons
- Below, two-column split:
  - Left column: **RosterPanel** + **VotingControlsPanel**
  - Right column: **RawStarredList** + **SynthesizeButton/ClusterCards**
- Bottom: export buttons

**Layout (mobile <768px):** tab interface — `Roster` | `Ideas` | `Synthesis` | `Voting` | `Export`

**ShareLinkPanel (top of admin board):**
- Compact card with two URL rows:
  - Admin URL (read-only) + `[COPY]`
  - Participant URL (read-only) + `[COPY]`
- Bookmark banner (dismissible, soft-yellow tint): `🔖 BOOKMARK THIS URL — IT'S THE ONLY WAY BACK TO THIS ADMIN VIEW.`

**RosterPanel:**
- H3: `Participants (${participantCount})`
- Sort selector: `[ Sort by phase ▾ ]` options: by phase | by name | by activity desc
- Empty state copy: `Waiting for participants to join and lock their stars. You'll be able to synthesize once at least 2 are done.`
- Per row:
  - Name + slug
  - Phase chip: `INTAKE` (gray) | `CANVAS` (electric-blue) | `LOCKED` (green)
  - Counts: `12 ideas, 4 starred` (gray small)
  - Time-in-phase: `8 min in Canvas` (gray small)
  - Idle indicator (yellow dot + `idle 4 min`) when `now - lastActivityAt > 90s`

**SynthesizeButton:**
- Disabled state copy: `SYNTHESIZE (NEED AT LEAST 2 LOCKED PARTICIPANTS)`
- Enabled state: `SYNTHESIZE TEAM IDEAS` (red primary)
- After first synthesis: button text changes to `RE-SYNTHESIZE (INCORPORATE LATEST STARS)`
- Loading state: GeneratingIndicator-style with synthesis-specific 5-step rotator (TBD copy)

**RawStarredList:**
- H3: `All starred ideas (${starredCount})`
- Pre-synthesis: this is the only view of starred content
- Grouped by category, each with `(${participantName})` attribution
- Always visible, even after synthesis (safety net for prompt-quality issues)

**ClusterCards (post-synthesis):**
- Each cluster as a card (per Screen 8 spec)
- Inline edit not allowed for admins (synthesis is the source of truth; admin can re-synthesize)

**VotingControlsPanel (after synthesis):**
- Pre-voting: `Votes per participant` number input (default 3) + `OPEN VOTING ROUND` (red primary)
- Voting open: live tally panel — list of ideas sorted by current vote count (admin-only) + `CLOSE VOTING & REVEAL RESULTS` (red primary)
- Voting closed: `RE-OPEN VOTING` ghost button + final ranked list (RankedIdeasView component embedded)

**Export buttons (visible after synthesis OR voting close):**
- `DOWNLOAD TOP IDEAS (RANKED LIST)` — red primary, primary deliverable
- `DOWNLOAD FULL BOARD` — ghost secondary

**Mobile tab content:**
- `Roster`: just the roster panel
- `Ideas`: ShareLinkPanel + RawStarredList
- `Synthesis`: SynthesizeButton + ClusterCards
- `Voting`: VotingControlsPanel
- `Export`: export buttons + last-modified timestamp

---

### Screen 12: OwnerDashboard — Cross-session library

**Route:** `/owner#k=:ownerKey` (key in URL fragment, NOT query string — strip from address bar after parse)
**Persona:** Yonatan-the-tool-owner reviewing all sessions ever created
**Device:** desktop

**Purpose:** Read-through index across every workshop. Click into any session's admin board, download any session's docx, or delete any session. Single sortable table — no filters.

**Layout:**
- Top bar: `[EXPORT ALL AS ZIP]` button on right
- Single table below

**Table columns (all sortable, default sort: createdAt desc):**

| Function | Created | Participants | Ideas | Votes | Top voted idea | Actions |
|----------|---------|--------------|-------|-------|----------------|---------|
| HR | 2026-04-25 | 6 | 47 | 12 | Draft rejection emails from ATS data… | `[OPEN]` `[DOWNLOAD]` `[DELETE]` |

**Per row:**
- Function name (left-aligned, bold)
- Created date in YYYY-MM-DD format
- Numeric counts (Participants, Ideas, Votes)
- Top voted idea text — truncated to ~50 chars with `…` ellipsis; full text in tooltip
- Actions column: three buttons (small, inline)
  - `[OPEN]` — opens session admin in new tab
  - `[DOWNLOAD]` — downloads top-ideas.docx for that session
  - `[DELETE]` — opens ConfirmModal

**Delete ConfirmModal copy:**
- Title: `Delete session`
- Body: `Delete session ${functionName} (${code})? This permanently deletes all ${N} participants' data and cannot be undone.`
- Buttons: `CANCEL` (ghost) | `DELETE PERMANENTLY` (red destructive)

**Bookmark banner on first load:**
- `🔖 BOOKMARK THIS URL — IT'S THE ONLY WAY BACK TO YOUR SESSIONS.` (auto-copies to clipboard, dismissible)

**Empty state (no sessions yet):**
- Centered illustration-or-text: `No sessions yet. Sessions you create will appear here.`

**Header buttons (as-built, post-launch addition):**
- `[⬇ SAVE BACKUP]` (outlined, dark gray) — downloads `team-primitives-owner-<date>.json` containing the OWNER_KEY for safe storage. Tooltip: "Save your owner key as a JSON file for safe-keeping. Restore at /owner/restore."
- `[⬇ EXPORT ALL AS ZIP]` (outlined, black) — bundles all sessions' top-ideas docx files into one ZIP. Disabled while bundling, shows `Bundling… 2/3` progress label.
- `[+ NEW WORKSHOP]` (red primary) — opens session creation modal.

---

### Screen 13: OwnerRestore — Recover from a backup file

**Route:** `/owner/restore`
**Persona:** owner who lost their `/owner#k=...` bookmark
**Device:** any (rare-use, but should work everywhere)

**Purpose:** Owner drops a previously-saved backup JSON file; the app validates the embedded `ownerKey` against this Convex deployment and redirects to `/owner#k=<key>` so the existing fragment-based flow takes over (and the owner can re-bookmark).

**Layout:**
- Editorial centered layout matching the Join page tone
- Single-column max-w-xl
- Hero "Restore owner access" title + supporting copy
- Dashed-border drop zone for the file
- Inline error banner below the drop zone if validation fails
- "No backup file?" CLI fallback footer

**Elements & copy:**
- Kicker: red tick + `OWNER · RESTORE` (small-caps, 0.32em tracking)
- H1: `Restore owner access` (clamp 2.5rem to 3.75rem)
- Body: `Drop in the **backup JSON file** you saved from your owner dashboard. We'll validate the key against this deployment and put you back into the dashboard.`
- Drop zone (dashed border, hover bg neutral-50, padded 12rem):
  - Upload icon centered
  - Idle text: `Click to choose a backup file`
  - Helper: `team-primitives-owner-*.json`
  - When file selected (validating): shows the filename + helper text changes to `Restored — redirecting…` on success
  - When validating in flight: text changes to `Validating…`
- Error banner (red border-left + red-light bg, only shown on failure): `⚠ This key doesn't match the current deployment. The backup might be from a different environment (e.g., from prod when you're now on dev), or the OWNER_KEY env var has been rotated since this backup was made.`
- Footer (small, muted, with monospace inline code):
  - `**No backup file?** Run \`npx convex env set OWNER_KEY $(openssl rand -hex 16)\` to rotate the key, then visit \`/owner#k=<new-key>\` and immediately download a fresh backup.`

**Interactions:**
- File input accepts `application/json,.json`. On `change`:
  1. Read file as text → JSON.parse → must contain `ownerKey: string`.
  2. Call `useConvex().query(api.ownerQueries.listAllSessions, { ownerKey })`. If returns null → wrong key (validation fails).
  3. On success → `navigate("/owner#k=" + encodeURIComponent(ownerKey), { replace: true })`.

**Validation philosophy:** the backup file's `ownerKey` is the only thing that matters. Other fields (`convexUrl`, `savedAt`, `origin`) are informational, not enforced. This keeps recovery resilient (e.g., if VITE_CONVEX_URL changes between save and restore, recovery still works as long as the key matches the current deployment's OWNER_KEY env var).

**Discovery:**
- The bare `/` landing page has a "Lost your owner URL? Restore from backup →" link that takes someone here.
- The owner dashboard's "Save backup" button has a tooltip mentioning "Restore at /owner/restore."

**Mobile:** drop zone is just as functional on mobile (file picker), but recovery is realistically a desktop-only operation. Not a critical mobile flow.

---

## Common components used across screens

### Header (sticky on phases ≥ canvas)
- Left: function name + participant/admin name
- Center: blank or breadcrumb
- Right: connection-state dot (• online / ○ offline) + dismiss button on banners

### ConfirmModal
- Centered overlay, dim backdrop
- Title (H3)
- Body (1–2 sentences)
- Two buttons: ghost cancel + colored confirm (red for destructive, primary for affirmative)
- Closeable via Escape key + click on backdrop

### Toast
- Top-right (desktop) or top-center (mobile)
- 3-second auto-dismiss
- Variants: info (white), success (green border), error (red border)
- Single line of text

### ErrorBanner (inline error)
- Red left-border, soft-red background
- Used for LLM action failures with retry button
- Copy: `Hmm, that didn't work. Try again?` + `[RETRY]` button

### Connection-state indicator
- Small dot in header
- Online: solid `--electric-blue`
- Offline: outlined gray
- Tooltip on hover: `Offline — changes will save when you reconnect.` / `Back online ✓`

---

## Mobile-specific notes

- Participant flow (Screens 2, 3, 5, 7, 9, 10) MUST be flawless at 375×812 (iPhone SE size).
- Admin flow (Screens 1, 11) and OwnerDashboard (12) can be desktop-first; minimum supported width 768px.
- Chat drawer on mobile = full-screen overlay, NOT side panel.
- Sticky elements on mobile: header (Screens 3, 5, 7), vote-budget chip (Screen 9), bottom gate bar (Screens 3, 5).
- Touch targets: 44×44px minimum everywhere — star buttons, edit/delete icons, vote toggles, tab triggers.

---

## Accessibility notes

- WCAG 2.1 AA contrast on all text (use the color tokens above; they're tested).
- Visible focus state on every interactive element (3px electric-blue outline, 2px offset).
- Semantic HTML: `<button>` for actions, `<a>` for navigation, `<input>` with proper labels.
- ARIA labels on icon-only buttons:
  - Star button: `aria-label="Star this idea"` / `"Unstar this idea"`
  - Edit pencil: `aria-label="Edit idea"`
  - Delete trash: `aria-label="Delete idea"`
  - Vote toggle: `aria-label="Vote for: ${ideaText}"`
- Keyboard navigation: Tab through cards, Space/Enter to toggle stars + votes, Esc to close drawer/modal.
- Word-count chips and validation messages use `aria-live="polite"` so screen readers announce them.

---

## Reference: original app for visual continuity

The original solo app at `C:\Users\yonat\OneDrive\AI\Apps\AI Playbook` already implements much of this design system. Specifically, these components are being reused (not redesigned) and serve as exact visual references:
- `IdeaCard.jsx`, `CategorySection.jsx`, `AddIdeaInput.jsx`
- `ChatDrawer.jsx`
- `GeneratingIndicator.jsx`
- `Toast.jsx`, `ConfirmModal.jsx`, `ErrorBanner.jsx`

If designing from scratch in Claude.ai, treat the new screens (AdminCreate, AdminBoard, MyBoardView, VoteView, RankedIdeasView, OwnerDashboard) as the priority — those don't exist in the original. The shared components above can be designed generically and will plug into the canvas + chat flows.

---

## Output format expected from Claude

When asking Claude to design these, request:
1. **One React component per screen** in TypeScript (or JS — say which) using Tailwind CSS
2. **Mock data** inline so each screen renders standalone
3. **Comments** at the top of each component listing the route + key props
4. **Mobile-first responsive classes** — start narrow, add `md:` and `lg:` modifiers
5. **No real network calls or routing** — pure presentational components, ready to wire to Convex queries later

End each artifact request with: *"Render the component fullscreen with mock data so I can see it visually."*
