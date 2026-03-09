

# Full Page Audit + Futuristic "Life OS" Visual Overhaul

## Page Audit — Keep, Merge, or Cut

| Page | Verdict | Reason |
|------|---------|--------|
| **Landing** (`/`) | **KEEP** — Redesign | Conversion page. Needs futuristic premium feel instead of generic SaaS. |
| **Auth** (`/auth`) | **KEEP** — Restyle | Essential. Desktop split-panel is good. Needs glassmorphism treatment. |
| **QuickStart** (`/quick-start`) | **KEEP** | Pre-auth onboarding funnel, feature-flagged. Light restyle only. |
| **Dashboard** (`/dashboard`) | **KEEP** — Major restyle | Core hub. 1800 lines, too sprawling but functionally correct. Needs futuristic card system and tighter visual hierarchy. |
| **Reset** (`/reset`) | **KEEP** | 7-day Snapshot ritual — unique to the product. Restyle cards. |
| **Planner** (`/planner`) | **KEEP** | Core Life OS module. Restyle header + cards. |
| **Money** (`/money`) | **KEEP** | Core Life OS module. Restyle header + cards. |
| **Integrations** (`/integrations`) | **MERGE into Dashboard Settings** | Only 4 providers. Low usage standalone page. Move into Profile Settings modal as a tab. |
| **Operator** (`/operator`) | **MERGE into Dashboard** | Already have `OperatorConsole` inline on Dashboard. Standalone page is redundant — remove route. |
| **Billing** (`/billing`) | **KEEP** — Restyle | Needed for subscription management. Light glassmorphism pass. |
| **Admin** (`/admin`) | **KEEP** | Internal tool. No visual changes needed. |
| **NotFound** | **KEEP** | Restyle to match new theme. |

**Result: Remove 2 routes** (`/integrations`, `/operator`), move their functionality inline.

---

## Futuristic Design System — "Cockpit OS" Theme

The visual overhaul centers on making the app feel like a premium, dark-first operating system — something between Arc browser, Linear, and a Tesla dashboard.

### Design Tokens (CSS Variables)

Update `src/index.css` dark theme to be the **default** and make it feel premium:

- **Background**: Near-black with subtle blue undertone (`222 47% 5%`)
- **Cards**: Glassmorphic panels with `backdrop-blur-xl`, subtle gradient borders, and faint inner glow
- **Accent**: Shift from flat blue to an electric cyan-to-blue gradient
- **Borders**: Replace solid borders with gradient borders using `border-image` or pseudo-elements
- **Typography**: Add monospace font (`JetBrains Mono`) for data/numbers alongside existing Space Grotesk
- **Shadows**: Replace box-shadows with colored glow effects (`0 0 30px hsl(accent/0.15)`)

### New CSS Utilities

```css
/* Glassmorphic card */
.glass-card {
  background: hsl(var(--card) / 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--border) / 0.3);
  box-shadow: inset 0 1px 0 hsl(var(--foreground) / 0.05),
              0 0 30px -10px hsl(var(--accent) / 0.1);
}

/* Gradient border effect */
.gradient-border {
  position: relative;
  border: 1px solid transparent;
  background-clip: padding-box;
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, hsl(var(--accent) / 0.3), transparent 60%);
  z-index: -1;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 1px;
}

/* Stat number styling */
.stat-value {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.02em;
}
```

### Tailwind Config Additions

Add to `tailwind.config.ts`:
- New keyframe: `glow-pulse` — subtle accent glow that breathes
- New keyframe: `scan-line` — horizontal light sweep across cards on load
- New animation utilities for both

---

## Specific Page Changes

### 1. Landing Page — Premium Conversion

- Replace flat white hero with dark gradient + animated mesh/grid background (CSS only, no canvas)
- Controllable cards: glass panels with colored accent glow per controllable
- CTA button: gradient background with glow shadow, subtle pulse animation
- "How it Works" section: numbered steps with a vertical glowing line connector
- Add subtle grid pattern overlay to background sections

### 2. Dashboard — Command Center

- **Header**: Glass panel with blur, thin gradient bottom border
- **Tab bar**: Replace pill buttons with underline-style tabs that have a glowing accent indicator
- **Command Mode rings**: Add radial gradient glow behind the ring SVG
- **Ring action cards**: Glass cards with left accent border that pulses when actionable
- **Daily/Weekly recap**: Dark glass card with accent top border gradient
- **Control Mode grid**: Cards get glass treatment + subtle scan-line animation on mount

### 3. Auth Page

- Left branding panel: animated gradient mesh background instead of flat primary color
- Right form panel: glass card floating on dark background
- Input fields: dark background with subtle inner glow on focus

### 4. Planner

- Header: glass panel matching dashboard
- Day view items: glass cards with status-colored left border
- Activity items: keep transparency system, add glow to confirmed items
- FAB: gradient background with glow shadow

### 5. Money Hub

- Tab system: match dashboard underline style
- Overview cards: glass panels with colored accent per category
- Transaction rows: subtle hover glow

### 6. NotFound

- Dark background with large glowing "404" in accent color
- Subtle grid pattern background

---

## Integrations Merge

Move provider cards into `ProfileSettingsModal.tsx` as a new "Connections" tab. Reuse existing `ProviderCard` component. Remove `/integrations` route and page file.

## Operator Merge

Already inline via `OperatorConsole` on the Dashboard. Remove `/operator` route and page file. Update any `navigate("/operator")` calls to scroll to the console section.

---

## Files to Create

| File | Purpose |
|------|---------|
| None | All changes are to existing files + CSS |

## Files to Edit

| File | Change |
|------|--------|
| `src/index.css` | New dark-first tokens, glass utilities, gradient borders, glow animations, grid pattern |
| `tailwind.config.ts` | New keyframes (glow-pulse, scan-line), font family for mono |
| `index.html` | Add JetBrains Mono font link |
| `src/App.tsx` | Remove `/integrations` and `/operator` routes |
| `src/pages/Landing.tsx` | Dark hero, glass controllable cards, glowing CTA, grid background |
| `src/pages/Auth.tsx` | Glass form card, gradient mesh branding panel |
| `src/pages/Dashboard.tsx` | Glass header/tabs, remove Integrations nav link, remove Operator nav |
| `src/pages/Planner.tsx` | Glass header + cards |
| `src/pages/Money.tsx` | Glass header + tab restyle |
| `src/pages/Billing.tsx` | Glass card treatment |
| `src/pages/NotFound.tsx` | Dark glowing 404 |
| `src/components/ProfileSettingsModal.tsx` | Add "Connections" tab with provider cards |
| `src/components/dashboard/CommandModeView.tsx` | Glass ring area, glow effects |
| `src/components/dashboard/DailyRings.tsx` | Radial glow behind ring SVG |
| `src/components/dashboard/RingActionCard.tsx` | Glass card + pulse border |
| `src/components/dashboard/DailyRecapCard.tsx` | Glass + gradient top border |
| `src/components/dashboard/WeeklyRecapCard.tsx` | Glass + gradient top border |
| `src/components/planner/PlannerDayView.tsx` | Glass card items |
| `src/components/planner/ActivityItemRow.tsx` | Glow on confirmed items |
| `src/components/planner/PlannerFab.tsx` | Gradient + glow |
| `src/components/ui/card.tsx` | Add `glass` variant |
| `src/components/ui/button.tsx` | Add `glow` variant |

## Implementation Order

1. CSS foundation (tokens, utilities, animations) — everything cascades from this
2. Landing page — first impression
3. Auth page — second touchpoint
4. Dashboard (header, tabs, Command Mode) — daily driver
5. Planner + Money — secondary modules
6. Merge Integrations + remove Operator route
7. Billing + NotFound — cleanup

