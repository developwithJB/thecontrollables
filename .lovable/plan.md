

# Plan: Swipeable Glass Action Cards + Redesigned Daily Actions

## Summary

Three changes: (1) Replace the checklist UI with horizontally swipeable Apple Glass-inspired cards, (2) Redesign the "Reflect on yesterday" and "Review promises" actions into data-capture actions, (3) Collapse to "Ask your Dashboard" when all done.

## Action Redesign

**"Reflect on yesterday"** → **"Confirm last night"**
- Label: "Confirm last night"
- Sublabel: "Sleep, meals, movement & notes"
- Same callback (`onOpenTimeLog`) but reframed as quick data confirmation rather than open-ended reflection
- Time estimate stays 2 min

**"Review N promise(s)"** → **"Validate today's plan"**  
- Label: "Validate today's plan"
- Sublabel: "Check promises & confirm your focus"
- Same callback (`onOpenPromises`) — opens the integrity meter where promises live
- Time estimate stays 3 min

## Glass Card UI

### Card Design
Each action becomes a standalone frosted-glass card:
- `backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl`
- Left accent gradient strip matching the action's domain color
- Emoji/icon in a frosted circle, bold title, muted sublabel, time chip
- Full-width CTA button at the bottom

### Carousel Layout
- Horizontal scroll container: `overflow-x-auto snap-x snap-mandatory scrollbar-hide`
- Each card: `snap-center`, width `85vw` (max `320px`), with `16px` gap
- Progress dots below the carousel (`●○○○`)

### Completion Animation
- On complete: card scales down (0.95) and fades out via framer-motion
- Auto-scroll to next incomplete card
- Progress dots update live

### All-Complete State
- Entire section collapses to a single frosted pill: "✨ All done for today"
- `AskDashboardBar` sits immediately below, becoming the primary interaction

## Layout Reorder (Home.tsx)

Move `AskDashboardBar` to sit right after `TodayActions`, before `CompactRingsRow`:

```
TodayActions
AskDashboardBar    ← moved up
CompactRingsRow
ForecastCard
AIRecommendedActions
```

## Changes

### `src/index.css`
- Add `.glass-action-card` utility class
- Add `.scrollbar-hide` utility (webkit + Firefox)

### `src/components/dashboard/TodayActions.tsx`
- **Lines 254-274**: Replace "Reflect on yesterday" with "Confirm last night" (sleep, meals, movement & notes). Replace "Review N promises" with "Validate today's plan" (check promises & confirm focus)
- **Lines 601-868**: Replace the entire active-session render block with:
  - Horizontal snap-scroll carousel of glass cards
  - Each `ActionItem` renders as a standalone glass card with icon, title, sublabel, time, CTA
  - Primary action gets a subtle glow ring
  - Progress dots below carousel
  - All-complete state: collapsed frosted pill with confetti
  - Keep `CovenantDialog` and `JourneyActionModal` renders unchanged
  - Keep TGIM banner, XP earned, and Day 7 celebration logic

### `src/pages/Home.tsx`
- **Lines 491-497**: Reorder so `AskDashboardBar` comes before `CompactRingsRow`

## Files

| Action | File |
|--------|------|
| Edit | `src/index.css` — add glass-action-card + scrollbar-hide utilities |
| Edit | `src/components/dashboard/TodayActions.tsx` — redesign actions + swipeable glass cards |
| Edit | `src/pages/Home.tsx` — reorder AskDashboardBar above CompactRingsRow |

