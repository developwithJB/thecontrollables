

# Weave Fuel Plan Across Life OS

## Current State
- **Today**: `FuelTodayCard` already renders on Home — shows tonight's meal, next unplanned slot, swap actions. Missing: grocery gap warning.
- **Plan (Day View)**: Shows meal count badge ("🍽️ 3 meals"). Missing: lunch/dinner slot detail, energy-aware meal suggestions.
- **Plan (Week Grid)**: No meal visibility at all.
- **Money**: `GroceryRhythmCard` already renders with weekly meal count and takeout risk.
- **AI Briefing**: Does NOT fetch or reference meal plan data.
- **Dashboard Intelligence**: Does NOT include meal planning context in forecasts.

## Changes

### 1. Enhance FuelTodayCard — Add Grocery Gap Warning
**File:** `src/components/dashboard/FuelTodayCard.tsx`

Query today's meal ingredients and check if a grocery list exists for the week. If meals are planned but no grocery list has been generated, show a subtle warning: "Ingredients not confirmed — generate your grocery list."

Add a query to `meal_plans` for this week to check if any grocery list action has been taken (derive from plan count vs. a simple "has grocery been generated" check). Show inline warning below the dinner row.

### 2. PlannerDayView — Show Lunch & Dinner Slots
**File:** `src/components/planner/PlannerDayView.tsx`

Replace the simple "🍽️ X meals" badge with a compact meal slot summary below the day header showing actual meal names for lunch and dinner (the two most relevant planning slots). Query already exists — extend it to return meal details, not just count.

```
🍽️ Lunch: Chicken Salad · Dinner: Pasta Carbonara
```

If a slot is empty on a busy day (5+ planner items), show: "Light meal suggested — busy day."

### 3. PlannerWeekGrid — Add Meal Dots Per Day
**File:** `src/components/planner/PlannerWeekGrid.tsx`

Add a `mealCountsByDate` prop (Record<string, number>) passed from `Planner.tsx`. Show a small 🍽️ indicator per day cell when meals > 0, alongside existing task indicators.

**File:** `src/pages/Planner.tsx`

Fetch weekly meal counts and pass as prop to `PlannerWeekGrid`.

### 4. AI Briefing — Include Meal Plan Context
**File:** `supabase/functions/ai-briefing/index.ts`

Add a query for today's `meal_plans` row. If meals exist, add to context: "Today's meal plan: [meal names]. Dinner: [name]." If no meals are planned, add: "No meals planned today — food decisions remain open."

Update the system prompt to include: "If meal plan data is present, weave food context into your readiness read. Low recovery + unplanned meals = suggest quick simple options. Busy day + planned meals = acknowledge preparation."

### 5. Dashboard Intelligence — Include Meal Planning in Forecasts
**File:** `supabase/functions/dashboard-intelligence/index.ts`

Add a query for this week's meal plans (count of days with plans). Add to context prompt:
- "Meals planned this week: X/7 days"
- "If meal planning is low and calendar is heavy, note food-related spending risk in forecast"

Update the system prompt to include nutrition as a factor in forecasts and recommended actions.

## Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/FuelTodayCard.tsx` | Add grocery gap warning when meals planned but no grocery list |
| `src/components/planner/PlannerDayView.tsx` | Show lunch/dinner names + energy-aware suggestion on busy days |
| `src/components/planner/PlannerWeekGrid.tsx` | Add `mealCountsByDate` prop, show 🍽️ indicator per day |
| `src/pages/Planner.tsx` | Fetch weekly meal counts, pass to WeekGrid |
| `supabase/functions/ai-briefing/index.ts` | Query today's meal plan, add to context + prompt rules |
| `supabase/functions/dashboard-intelligence/index.ts` | Query weekly meal plan coverage, add to context + forecast prompt |

## What Does NOT Change
- No new database tables or migrations
- No new components created (all enhancements to existing)
- FuelTodayCard position on Today stays the same
- GroceryRhythmCard on Money stays as-is
- All existing hooks and edge function structure preserved

