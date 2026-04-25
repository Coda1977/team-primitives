# Bold Modern App Design Bible (AI-Ready)

## 1) Purpose
Use this document as the single source of truth for recreating the **exact design language and UX behavior parity** of `ai-playbook-bold-modern-mockup.html`, adapted to different product use cases.

This is not just visual styling. It includes:
- Visual system (colors, typography, spacing, component styling)
- Interaction model (state transitions, gating, feedback)
- Accessibility and motion constraints
- Structural parity requirements

## 2) Core Design Philosophy
- Bold, high-contrast, modern UI with black/white foundations.
- Red and electric blue drive emphasis and action.
- Dense workflows remain readable via strong hierarchy and spacing discipline.
- The UI should feel energetic but controlled, never noisy.
- Interaction clarity beats decorative complexity.

## 3) Non-Negotiable Principles
1. No horizontal scrolling under any viewport.
2. Mobile-first behavior with responsive breakpoints.
3. Sticky contextual header on non-intake phases.
4. Clear phase/state progression with explicit user guidance.
5. Task gating must be visible and enforceable in flow.
6. Feedback on every critical interaction (validation, selection, transition).
7. WCAG 2.1 AA contrast and visible focus states.
8. Avoid redundant navigation layers.
9. Keep UI action labels explicit and outcome-oriented.
10. Preserve behavioral parity even when content domain changes.

## 4) Design Tokens

### 4.1 Color Tokens
- `--black`: `#000000`
- `--red`: `#E30613`
- `--dark-gray`: `#333333`
- `--white`: `#FFFFFF`
- `--electric-blue`: `#00A3E0`
- `--neon-yellow`: `#FFFF00`
- `--light-gray`: `#CCCCCC`
- `--charcoal`: `#222222`

Usage:
- Primary backgrounds: black/white.
- Primary CTA: red default, electric-blue hover.
- Critical emphasis: red.
- Progress complete/highlight: neon-yellow (sparingly).
- Structural borders: light-gray/charcoal.

### 4.2 Typography
- Primary typeface: `Montserrat`, sans-serif.
- Secondary utility typeface: `Roboto Condensed`, sans-serif.

Body:
- 16px desktop, 14px mobile
- weight 400
- line-height 1.5
- letter-spacing 0.03em

Headings:
- H1: clamp(~2.2rem to 2.75rem)
- H2: clamp(~1.9rem to 2rem)
- H3: clamp(~1.2rem to 1.375rem)
- weight 700
- line-height 1.2
- letter-spacing 0.06em

Buttons/nav labels:
- Roboto Condensed
- 16px
- weight 500
- uppercase
- line-height 1.3

### 4.3 Spacing, Radius, Borders
- Base section spacing: `60px` desktop, `32px` mobile.
- Standard layout gap: `20px`.
- Radius: `6px`.
- Border weight: `1px` (icons use 2px stroke in places).

### 4.4 Interaction Sizing
- Minimum touch target: `44x44px`.
- Focus ring: `3px` electric-blue outline with offset.

## 5) Layout System
- 12-column grid, 20px gutters.
- Container width: `min(100% - 24px, 1280px)`.
- Keep `min-width: 0` in constrained layouts.
- Default body copy left-aligned.
- Hero messaging center-aligned with constrained readable width.

Breakpoints:
- `<= 992px`: collapse split columns.
- `<= 768px`: reduce typography/spacing and stack header internals.
- `<= 576px`: make primary action groups full-width.

Hard overflow guards:
- `html, body { overflow-x: hidden; max-width: 100%; }`
- `img { max-width: 100%; height: auto; }`

## 6) Imagery Principles
- Hero imagery should be high-contrast and cinematic, with clear subject framing.
- Intake hero image pattern:
  - Full-width inside the main 12-column area.
  - `1px` charcoal border and `6px` radius.
  - `object-fit: cover`; optional cap around `max-height: 520px`.
- Prefer local or optimized assets with meaningful alt text.
- Example from this mockup: `bike.jpg` in the Intake hero.

## 7) Core Components

### 6.1 Parity Header (single navigation model)
- Sticky header visible on all phases except first intake phase.
- Left: brand + truncated role/context text.
- Right:
  - phase progress badges
  - phase-specific action set

Progress badge states:
- default: subtle white border/text
- active: electric-blue border/background tint
- done: neon-yellow text/border

### 6.2 Buttons
Primary button:
- Background red, text white, no border
- Hover: electric-blue + scale 1.05
- Active: scale 0.95 + subtle shadow

Secondary button:
- Transparent with charcoal border/text
- Hover fills light-gray

### 6.3 Form Controls
- Textareas and text inputs: bordered, clear focus glow in red.
- Multi-select pills: black fill when active.
- Radio options: card-like rows with title + explanatory subtext.
- Validation messaging: visible, concise, high contrast.

### 6.4 Discovery / Category Cards
- Dark cards on black/charcoal surfaces.
- Icon badges: 24x24 icon in 44x44 circle.
- Hover: card raises and icon shifts toward neon-yellow.
- Actions:
  - Star/Unstar toggle
  - Go Deeper action opening chat drawer

### 6.5 Strategy Rule Cards
- Light surface card with clear rule hierarchy.
- Rule meta label (small, uppercase, red).
- Priority action treatment with red border/background tint.
- Rule actions include Star and Go Deeper controls.

### 6.6 Chat Drawer
- Right-side fixed drawer + dark backdrop.
- Opens from any Go Deeper control.
- Has title/context, message stream, input row, close action.

### 6.7 Confirmation Modal
- Used for destructive reset (`Start Over`).
- Must require explicit confirmation.

### 6.8 Generating State Card
- Dedicated in-between phase view.
- Visible step-by-step progress lines.
- Auto-advances to next phase after delay.

### 6.9 Review / Commitment Summary
- Stats cards + two-column summary blocks.
- Primary final action: `Download as PDF`.
- Back action to previous editing phase.

## 8) State Machine and Behavior Parity
Use these phases exactly (rename labels only when adapting domain):
1. `intake`
2. `generating-primitives`
3. `primitives`
4. `generating-playbook`
5. `playbook`
6. `commitment`

Behavior rules:
- Intake CTA -> `generating-primitives` only if intake validation passes.
- `generating-primitives` auto-advance to `primitives` (around 1.7s).
- `primitives` continue CTA disabled until star gate passes (`>= 3` starred).
- `primitives` continue -> `generating-playbook`.
- `generating-playbook` auto-advance to `playbook`.
- `playbook` review CTA -> `commitment`.
- `commitment` download action -> print flow / PDF action.
- `Start Over` -> confirmation modal -> full reset to `intake`.

Header parity rules:
- Hidden on `intake`.
- Visible on all other phases.
- Context role hidden during both generating phases.
- Action sets:
  - `primitives`: export ideas + start over
  - `playbook`: export strategy + review + start over
  - `commitment`: back to edit strategy

## 9) Accessibility Requirements
- Maintain WCAG 2.1 AA contrast.
- Keyboard-focus visible on all interactive elements.
- All controls with clear text labels.
- ARIA labels for major landmarks (header, main, drawers, modal).
- Do not rely on color alone to indicate state.
- Min touch target `44x44`.

## 10) Motion and Transition Rules
- Page fade-in: ~0.4s.
- View slide-in: ~0.3s.
- Card hover lift: subtle (~6px).
- Drawer open/close: translateX transition ~0.3s.
- Skeleton loader pulse: ~0.7s.
- Respect `prefers-reduced-motion: reduce` by disabling non-essential animation.

## 11) Performance Constraints
- Prefer transform/opacity animations only.
- Lazy-load non-critical imagery.
- Avoid heavy box-shadow stacks.
- Keep critical above-the-fold assets light.

## 12) Content Voice and Tone
- Direct, specific, outcome-oriented language.
- Avoid vague statements like "improve efficiency".
- Favor "Monday-morning" actionable phrasing.
- Use concise labels and structured hints.

## 13) Adaptation Rules for Different Use Cases
When reusing this system for another product domain:
- Keep structure and behavior; swap nouns only.
- Replace phase labels/text content but keep state machine.
- Keep gating logic equivalent to your domain milestone.
- Preserve one-header contextual action model.
- Preserve drawer/modals for deepening and confirmation.

Allowed changes:
- Domain vocabulary
- Illustrations/photos
- Example copy
- Card/rule content

Not allowed without explicit decision:
- Removing generation phases
- Removing gate checks
- Adding extra global nav layers
- Removing confirmation on destructive actions

## 14) Implementation Checklist
- [ ] No horizontal scroll at all breakpoints.
- [ ] Header visibility/action parity by phase.
- [ ] Intake validation gate works.
- [ ] Star gating works and updates counters.
- [ ] Generating phases auto-advance.
- [ ] Chat drawer opens/closes correctly from contextual controls.
- [ ] Start over confirmation and reset works.
- [ ] Print/download action wired.
- [ ] Focus states visible and keyboard path complete.
- [ ] Reduced-motion mode respected.

## 15) AI Prompt Template (Copy/Paste)
Use this prompt with another AI to reproduce the style for a different use case:

```text
Build a high-fidelity web mockup using this exact design system and interaction model.

DESIGN SYSTEM (NON-NEGOTIABLE)
- Colors:
  - Black #000000
  - Vibrant Red #E30613
  - Dark Gray #333333
  - White #FFFFFF
  - Electric Blue #00A3E0
  - Neon Yellow #FFFF00
  - Light Gray #CCCCCC
  - Charcoal #222222
- Typography:
  - Montserrat for headings/body
  - Roboto Condensed for buttons/nav/utility
  - Body: 16px (14px mobile), 400, LH 1.5, LS 0.03em
  - Headings: 700, LH 1.2, LS 0.06em
- Grid/layout:
  - 12-column, 20px gap, container max 1280
  - Breakpoints: 992, 768, 576
  - No horizontal overflow
- Buttons:
  - Primary red -> electric-blue hover, scale 1.05; active 0.95
  - Secondary outlined charcoal, light-gray hover fill
- Accessibility:
  - WCAG AA contrast
  - Visible focus rings
  - 44x44 min touch targets

BEHAVIOR PARITY (NON-NEGOTIABLE)
- Use phases:
  1) intake
  2) generating-primitives
  3) primitives
  4) generating-playbook
  5) playbook
  6) commitment
- Intake must validate required fields before continuing.
- Generating phases auto-advance (~1.7s).
- Primitives phase has a starred gate: need >=3 starred to continue.
- Start Over requires confirmation modal and full reset.
- Go Deeper opens a right-side chat drawer with context-specific title.
- Commitment includes back-to-edit and download as PDF action.

STRUCTURAL RULES
- One sticky contextual header (hidden only on intake).
- Header shows phase progress badges and phase-specific actions.
- No extra footer navigation.
- No redundant top-level navigation bars.

ADAPT THIS TO:
- Product/use case: [INSERT]
- Domain terminology mapping:
  - intake = [INSERT]
  - primitives = [INSERT]
  - playbook = [INSERT]
  - commitment = [INSERT]
- Required fields for intake validation: [INSERT]
- Gating metric equivalent to starred >=3: [INSERT]
- Example card/rule content: [INSERT]

DELIVERABLE
- Single self-contained HTML file with embedded CSS/JS.
- Responsive, accessible, behavior-complete.
- Include comments only where needed for complex logic.
```

## 16) Optional Machine-Readable Token Block
```json
{
  "colors": {
    "black": "#000000",
    "red": "#E30613",
    "darkGray": "#333333",
    "white": "#FFFFFF",
    "electricBlue": "#00A3E0",
    "neonYellow": "#FFFF00",
    "lightGray": "#CCCCCC",
    "charcoal": "#222222"
  },
  "typography": {
    "primary": "Montserrat",
    "secondary": "Roboto Condensed",
    "body": { "sizeDesktop": 16, "sizeMobile": 14, "weight": 400, "lineHeight": 1.5, "letterSpacing": "0.03em" },
    "heading": { "weight": 700, "lineHeight": 1.2, "letterSpacing": "0.06em" }
  },
  "layout": {
    "maxWidth": 1280,
    "columns": 12,
    "gutter": 20,
    "sectionSpacingDesktop": 60,
    "sectionSpacingMobile": 32,
    "radius": 6,
    "breakpoints": [992, 768, 576]
  },
  "states": [
    "intake",
    "generating-primitives",
    "primitives",
    "generating-playbook",
    "playbook",
    "commitment"
  ],
  "gating": {
    "primitivesMinStarred": 3,
    "generationAutoAdvanceMs": 1700
  }
}
```



