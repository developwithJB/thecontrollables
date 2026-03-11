

# Persist Fuel Check Action Buttons Across Today/Week Views

## Problem
The Today/Week toggle currently swaps the entire content — when viewing "Week", all action buttons (Add to Calendar, Share, Edit meals, Recipes, Regenerate, Log) disappear. These should always be visible regardless of which view is active.

## Solution
Restructure `MealPlanCard.tsx` so the action toolbar is rendered **outside** the Today/Week conditional block, always visible below the header alongside the view toggle. The Today/Week toggle only switches the content area (meal list vs. week comparison).

## Changes

### `src/components/nutrition/MealPlanCard.tsx`

**Header area** (lines 174-212): Move the action buttons (Calendar, Share, Edit meals, Recipes, Regenerate, Log, Generate) into a persistent toolbar row right below the header, **before** the Today/Week content area. This toolbar renders whenever a plan exists (or shows "Generate" when no plan exists), regardless of `view` state.

**Content area** (lines 214-532): The `view === "week"` / `view === "today"` conditional now **only** renders:
- **Today**: The meal list + macro breakdown (no action buttons — they're above)
- **Week**: The `MealWeekComparison` component

Layout structure becomes:
```
┌─ Header (Fuel Check title + Today/Week toggle) ─┐
├─ Action toolbar (always visible)                 ─┤
│  [Generate/Calendar] [Share] [Edit] [Recipes]     │
│  [Regenerate] [Log]                               │
├─ Content area (switches with Today/Week)         ─┤
│  Today: meal list + macros                        │
│  Week: MealWeekComparison                         │
└───────────────────────────────────────────────────┘
```

Specifically:
1. Extract the action buttons block (lines 458-517) out of the `todayPlan` conditional
2. Also extract the "Generate Today's Meal Plan" button from the empty state (lines 520-531)
3. Place both (conditionally: show generate when no plan, show full toolbar when plan exists) as a persistent row between header and content
4. Remove duplicate buttons from inside the today view content
5. The `showConfig` panel stays inside the today view since it's an editing flow

| File | Change |
|------|--------|
| `src/components/nutrition/MealPlanCard.tsx` | Extract action buttons to persistent toolbar above content area |

