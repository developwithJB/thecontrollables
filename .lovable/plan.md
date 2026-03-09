

# Planner Unified Timeline — Show All Daily Activity

## Problem

The Planner only queries `planner_items`. When the user completes rings, logs wellness, plans meals, etc., those write to `daily_rings`, `wellness_logs`, `meal_plans` — but nothing appears in the Planner. It shows empty even though the user has been active all day.

## Solution

Merge activity from multiple tables into the Planner day view as "virtual items" alongside real planner items. Unconfirmed/planned items render at reduced opacity; confirmed actuals render solid.

## Architecture

```text
PlannerDayView receives:
  plannerItems[]       ← from planner_items table (as today)
  activityItems[]      ← NEW: merged from daily_rings, wellness_logs, meal_plans, completed_actions

Both rendered in a single timeline, sorted by time/type.
Activity items are read-only (no edit/delete/reorder).
```

## Changes

### 1. New hook: `src/hooks/usePlannerActivity.ts`

Fetches activity for a date range from:
- `daily_rings` → creates virtual items for each completed ring ("✓ Notice Ring — …response…")
- `wellness_logs` → "Wellness Check-in: Sleep 4/5, Movement 3/5…"
- `meal_plans` → "Meal Plan: breakfast, lunch, dinner"
- `completed_actions` → any completed actions for the day

Returns `ActivityItem[]` with fields: `id`, `title`, `subtitle`, `source` (ring/wellness/meal/action), `time` (created_at), `isConfirmed` (boolean — true if actually completed/logged, false if planned/future).

### 2. Update `src/components/planner/PlannerDayView.tsx`

- Accept new `activityItems` prop
- Merge activity items into the timeline below planner items, grouped in an "Activity Log" section
- Activity items use a distinct, simpler row component (`ActivityItemRow`) — no drag, no edit, no status toggle
- Confirmed items: full opacity, solid left border with source color
- Unconfirmed/future items: 40% opacity, dashed left border

### 3. New component: `src/components/planner/ActivityItemRow.tsx`

Simple read-only row showing:
- Source icon (ring icon, heart for wellness, utensils for meals)
- Title + subtitle
- Timestamp
- Solid vs transparent styling based on `isConfirmed`

### 4. Update `src/pages/Planner.tsx`

- Call `usePlannerActivity(weekRange.start, weekRange.end, user?.id)`
- Group activity by date key, pass to `PlannerDayView`
- Also pass activity into `PlannerWeekGrid` item counts so the week grid shows dots for days with activity

### 5. Update `src/components/planner/PlannerWeekGrid.tsx`

- Accept `activityByDate` prop
- Show activity count alongside planner items in each day cell

## Visual Treatment

| State | Style |
|-------|-------|
| Confirmed actual (ring done, wellness logged) | Full opacity, solid colored left border, check icon |
| Planned/future (meal plan for later, incomplete ring) | 40% opacity, dashed border, circle icon |
| Manual planner item | Existing style (unchanged) |

## No DB Changes

All data already exists in existing tables. This is purely a read-side merge.

