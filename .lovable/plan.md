

# Rebrand Operator → Ask Dashboard + Fix Recommended Actions + Remove Focus

## Changes

### 1. Remove Focus Mode from Home (`src/pages/Home.tsx`)
- Delete the entire focus section (lines 472-504) — the `isFocusActive` block and the "Start Focus Mode" fallback
- Remove `useFocusMode` import and hook call
- Remove `Target`, `Pencil` icon imports if unused after

### 2. Replace OperatorConsole with AskDashboardBar + ForecastCard (`src/pages/Home.tsx`)
- Remove the `OperatorConsole` block (lines 506-522)
- After CompactRingsRow, render:
  1. `AskDashboardBar` — the "Ask your Dashboard..." input with chips
  2. `ForecastCard` — the Snapshot/Month/Year forecast tabs
  3. `AIRecommendedActions` — with click handlers that actually do something
- Add `useDashboardIntelligence` hook to Home page to feed data to ForecastCard and AIRecommendedActions

### 3. Make Recommended Actions clickable (`src/components/dashboard/AIRecommendedActions.tsx`)
- The `recommended_actions` from the AI have `text` and `ring` fields but no navigation
- Map each ring to a route: notice/choose → `/growth`, charge → `/wellness`, prove → `/growth`, align → `/planner`
- Add `useNavigate` and navigate on click
- Also open a relevant action (e.g., ring completion) when possible via toast or direct nav

### 4. Remove OperatorConsole import from Home
- Clean up unused imports (`OperatorConsole`, `useFocusMode`, related icons)

## Files to change

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Remove focus section + OperatorConsole. Add AskDashboardBar, ForecastCard, AIRecommendedActions with intelligence hook |
| `src/components/dashboard/AIRecommendedActions.tsx` | Add navigation on click — map ring → route |

