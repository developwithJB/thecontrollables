

# Life OS Navigation & IA Refactor

## Overview
Rename and reorder the 5 primary navigation tabs. Update routes, labels, icons, and all cross-references. No core logic deleted — this is a renaming + reordering pass.

## Navigation Changes

| Old Label | New Label | Route (unchanged) | Icon |
|---|---|---|---|
| Home | Today | `/home` | `Sun` (lucide) |
| Planner | Plan | `/planner` | `CalendarDays` |
| Wellness | Body | `/wellness` | `Activity` |
| Growth | Growth | `/growth` | `Sprout` |
| Wealth | Money | `/wealth` | `Wallet` |

**New order**: Today → Plan → Body → Growth → Money

## Files to Modify

### 1. `src/components/layout/BottomNav.tsx`
- Update `navItems` array: new order, new labels, new icons
- Today uses `Sun`, Plan uses `CalendarDays`, Body uses `Activity`

### 2. `src/components/layout/ControllablePoweredBy.tsx`
- Update `PAGE_CONTROLLABLES` keys to match new mental model names for internal clarity
- Update the mapping to match the spec:
  - today: all 5
  - plan: awareness, habit, wellness, environment
  - body: habit, wellness
  - growth: perspective, habit, environment
  - money: awareness, perspective, habit, environment

### 3. `src/pages/Wellness.tsx`
- Change `usePageViewTracking("Wellness")` → `usePageViewTracking("Body")`
- Update any visible page title/header text from "Wellness" to "Body"
- Update `ControllablePoweredBy` props to use `["habit", "wellness"]` (already correct)

### 4. `src/pages/Planner.tsx`
- Update any visible "Planner" header text to "Plan"
- Update `ControllablePoweredBy` props

### 5. `src/pages/Home.tsx`
- Update any visible "Home" or "Dashboard" header text to "Today"
- Update `ControllablePoweredBy` props

### 6. `src/pages/Money.tsx`
- Update any visible "Wealth" text to "Money"

### 7. `src/components/dashboard/DailyOSCard.tsx`
- Update `VALID_ROUTES` array (routes stay the same, just ensure it's current)

### 8. `supabase/functions/daily-os-plan/index.ts`
- Update AI prompt text: replace "Home"/"Planner"/"Wellness"/"Wealth" references with "Today"/"Plan"/"Body"/"Money" in system prompt language (routes stay the same)

### 9. `src/components/DashboardManualSection.tsx`
- Update section descriptions to use new page names (Today, Plan, Body, Growth, Money)
- Remove "Experience" as a standalone section concept — fold its description into Growth
- Remove "Guide" as a standalone section — it lives in settings/onboarding already

### 10. `src/components/dashboard/HierarchyExplainer.tsx`
- No structural change needed — already uses Season/Project/Calendar/Task/Actuals hierarchy

### 11. Cross-reference sweep
Files with visible UI text referencing old names (navigations, toasts, button labels):
- `src/components/nutrition/WellnessFuelSummary.tsx` — "Plan" button text (already says "Plan")
- `src/components/dashboard/MoneyCard.tsx` — navigates to `/money` (OK)
- `supabase/functions/operator-console/index.ts` — "Open Planner" label → "Open Plan"
- Any `ControllablePoweredBy` usage that passes old page keys

### 12. Landing page (`src/pages/Landing.tsx`)
- Update any feature descriptions that reference old page names

## What Does NOT Change
- Route paths stay as `/home`, `/planner`, `/wellness`, `/growth`, `/wealth`
- All page components keep their filenames (Home.tsx, Planner.tsx, Wellness.tsx, etc.)
- All hooks, logic, and data structures remain
- The Controllables system stays as the intelligence layer — only the `PAGE_CONTROLLABLES` mapping gets the canonical spec applied
- Redirect from `/money` → `/wealth` stays
- Redirect from `/dashboard` → `/home` stays

## Controllable Influence (already mostly implemented via ControllablePoweredBy)
The `PAGE_CONTROLLABLES` mapping is the single source of truth for which controllables influence each page. This already powers the "Powered by" chips at the bottom of each page. The mapping matches the spec exactly as-is except for key names which use route slugs.

