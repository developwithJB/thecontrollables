

# Life OS Navigation & Page Architecture Refactor

## Current State

The app has a monolithic `/dashboard` page (~1800 lines) with 3 tabs (Dashboard, Experience, Guide), plus standalone `/planner` and `/money` pages. The Dashboard tab itself has Command Mode (rings) and Control Mode (full modules). Everything lives in one giant component.

## New Architecture

Replace the tab-based dashboard with 5 top-level pages connected by a persistent bottom navigation bar (mobile) / sidebar (desktop):

```text
┌─────────────────────────────────┐
│  Header (Logo + Settings)       │
├─────────────────────────────────┤
│                                 │
│        Page Content             │
│                                 │
├─────────────────────────────────┤
│  🏠    💪    🌱    📋    💰    │
│ Home Wellness Growth Planner Wealth│
└─────────────────────────────────┘
```

## Controllable Mapping (Intelligence Layer)

Each page shows a subtle "Powered by" indicator and receives page-specific AI insights filtered by these controllables:

| Page | Controllables |
|------|--------------|
| Home | All 5 (🦉🐢🦈🛰️🚀) |
| Wellness | 🦈 Habit + 🛰️ Wellness |
| Growth | 🐢 Perspective + 🦈 Habit + 🚀 Environment |
| Planner | 🦉 Awareness + 🦈 Habit + 🛰️ Wellness + 🚀 Environment |
| Wealth | 🦉 Awareness + 🐢 Perspective + 🦈 Habit + 🚀 Environment |

## Implementation Plan

### Phase 1: Shared Layout & Navigation

**New files:**
- `src/components/layout/LifeOSLayout.tsx` — shared shell with header, bottom nav, and content area. Auth check, pull-to-refresh, profile settings all live here (extracted from Dashboard.tsx)
- `src/components/layout/BottomNav.tsx` — 5-item mobile bottom bar (Home/Wellness/Growth/Planner/Wealth)
- `src/components/layout/ControllablePoweredBy.tsx` — subtle "Powered by" chip row showing which controllables drive each page

**Route changes in `App.tsx`:**
- `/dashboard` → `/home` (redirect `/dashboard` to `/home` for back-compat)
- `/wellness` — new route
- `/growth` — new route
- `/planner` — existing, stays
- `/money` → also accessible as `/wealth`

### Phase 2: Home Page (refactor from Dashboard)

**File:** `src/pages/Home.tsx`

Extract from the current 1800-line Dashboard.tsx. Home becomes the command center:
- Daily greeting + system status (GreetingBanner)
- AI daily brief (from dashboard intelligence)
- Top actions for today (AIRecommendedActions)
- Domain summary cards (4 mini-cards linking to Wellness/Growth/Planner/Wealth)
- Controllable summary (5 controllable status indicators)
- Cross-system insights ("Low Wellness reducing Planner execution")
- Operator Console stays here

Move Experience tab content → accessible from a "History" button in settings/profile or a collapsible section on Home.
Move Guide tab content → accessible from settings or an info button.

### Phase 3: Wellness Page

**File:** `src/pages/Wellness.tsx`

Pulls existing components into a dedicated body/energy page:
- Controllable "Powered by" bar: Habit + Wellness
- Today's wellness score / battery (from BrainBodyTracker)
- Movement card
- Nutrition card (MealPlanCard, MealTracker)
- Sleep card
- 7-day trend (from WellnessStreakHistory)
- Quick logging actions (inline wellness logger)
- AI wellness insight (filtered to Habit + Wellness controllables)
- Wellness goals (WellnessGoalsCard)

Components reused from current codebase:
- `BrainBodyTracker`, `WellnessGoalsCard`, `MealPlanCard`, `WellnessStreakHistory`, `DailyOSCard`

### Phase 4: Growth Page

**File:** `src/pages/Growth.tsx`

The home of the 5-ring system and self-leadership tools:
- Controllable "Powered by" bar: Perspective + Habit + Environment
- 5 Rings hero (DailyRings — moved from CommandModeView)
- AI growth insight
- Reframe Studio (from ring tools)
- Proof of Self (proof actions, IG proof)
- Environment Reset card
- Growth streaks / pattern insights
- Weekly story / momentum view (WeeklyRecapCard)
- Build assessment (BuildOverviewModule)
- Controllable Levels progression

Components reused:
- `DailyRings`, `WeeklyRecapCard`, `ForecastCard`, `BuildOverviewModule`, `ControllableLevelsCard`, `InstagramInputCard`, `IGProofHistory`

### Phase 5: Enhance Planner Page

**File:** `src/pages/Planner.tsx` (update existing)

- Add Controllable "Powered by" bar: Awareness + Habit + Wellness + Environment
- Add AI planner insight section (wellness-aware scheduling suggestions)
- Keep existing planner functionality intact
- Remove the back-arrow navigation (now part of persistent nav)

### Phase 6: Enhance Wealth Page

**File:** `src/pages/Money.tsx` (update existing, add `/wealth` route alias)

- Add Controllable "Powered by" bar: Awareness + Perspective + Habit + Environment
- Add daily spend check-in prompt at top
- Add AI wealth insight section
- Keep existing money functionality intact
- Remove the back-arrow navigation

### Phase 7: Cleanup

- Slim down `Dashboard.tsx` to a redirect → `/home`
- Extract shared auth/entitlements logic into a `useLifeOSAuth` hook (or reuse existing patterns)
- Move Guide content to a modal or settings subsection
- Move Experience content to a "History" section accessible from Home or Profile

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/layout/LifeOSLayout.tsx` |
| Create | `src/components/layout/BottomNav.tsx` |
| Create | `src/components/layout/ControllablePoweredBy.tsx` |
| Create | `src/pages/Home.tsx` |
| Create | `src/pages/Wellness.tsx` |
| Create | `src/pages/Growth.tsx` |
| Edit | `src/pages/Planner.tsx` — add controllable bar, remove back-arrow |
| Edit | `src/pages/Money.tsx` — add controllable bar, remove back-arrow |
| Edit | `src/App.tsx` — new routes, redirects |
| Edit | `src/pages/Landing.tsx` — update CTA links if needed |
| Deprecate | `src/pages/Dashboard.tsx` — redirect to `/home` |
| Edit | `src/components/dashboard/DashboardModeToggle.tsx` — remove (no longer needed) |

## Key Decisions

1. **Bottom nav over sidebar on mobile** — matches the "calm, premium" feel and keeps all 5 domains one tap away
2. **Desktop gets a subtle left sidebar** — expands the bottom nav into a narrow rail with icons + labels
3. **No tabs inside pages** — each page is a single scrollable view with clear sections, avoiding the current tab-within-tab complexity
4. **Guide becomes secondary** — moved to profile/settings, not a primary nav item
5. **Experience data distributed** — streak history goes to Wellness, snapshot history to Growth, badges to Home or Profile

