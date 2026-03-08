

## Plan: Week-Level Meal Planning with Customizable Meal Slots

### Current State
- Meal plans are generated one day at a time with a fixed structure: breakfast, lunch, dinner, 1 snack
- No way to remove meals or add/remove snacks
- Week view only shows a plan-vs-actual calorie comparison chart

### Changes

#### 1. Add meal slot preferences to the generate flow

**File: `src/components/nutrition/MealPlanCard.tsx`**
- Replace the simple "Generate Today's Meal Plan" / "Regenerate" buttons with a configuration step
- Add a small inline UI (toggleable chips) letting users enable/disable: Breakfast, Lunch, Dinner
- Add snack count control: 0, 1, 2, 3 snacks (stepper or small buttons)
- Store these preferences in component state and pass them to `generatePlan.mutate()`
- When a plan exists, show an "Edit meals" button that reopens the config

**File: `src/hooks/useMealTracking.ts`**
- Extend `generatePlan` mutation to accept `{ excludeMeals?: string[], snackCount?: number }` in addition to existing preferences/calorie_target
- Pass these to the edge function

**File: `supabase/functions/ai-meal-plan/index.ts`**
- Accept `exclude_meals` (array of meal_type strings to skip) and `snack_count` (number, default 1)
- Adjust the AI prompt to only generate the requested meal types and the specified number of snacks (e.g. "snack_1", "snack_2")

#### 2. Allow removing individual meals from an existing plan

**File: `src/components/nutrition/MealPlanCard.tsx`**
- Add a small X/remove button on each meal row in the today view
- On tap, filter that meal out of the plan's meals array and update the DB via a new `updatePlan` mutation

**File: `src/hooks/useMealTracking.ts`**
- Add `updatePlanMeals` mutation that updates the `meals` JSON column for the current day's plan

#### 3. Week-level plan generation

**File: `src/components/nutrition/MealWeekComparison.tsx`**
- Add a "Plan This Week" button at the top of the week view
- On tap, generate plans for all 7 days (today through +6 days) by calling `generatePlan` for each date
- Show a progress indicator during generation
- Display each day as a collapsible row: date, total planned calories, expand to see meals

**File: `src/hooks/useMealTracking.ts`**
- Add `generateWeekPlan` mutation that loops through 7 dates, calling `ai-meal-plan` for each and upserting into `meal_plans`
- Accept the same meal slot preferences (excluded meals, snack count) for consistency

**File: `supabase/functions/ai-meal-plan/index.ts`**
- Accept optional `date` parameter (already exists) so it can generate for future dates

#### 4. Update MealTracker slots to be dynamic

**File: `src/components/nutrition/MealTracker.tsx`**
- Instead of hardcoded `MEAL_SLOTS`, derive slots from the current day's plan meals if a plan exists
- If no plan, fall back to the current 4 fixed slots
- This ensures the tracker matches whatever meals the user chose to include

### Files Changed

| File | Change |
|---|---|
| `src/components/nutrition/MealPlanCard.tsx` | Add meal config UI (toggle meals, snack stepper), remove-meal buttons, pass config to generate |
| `src/hooks/useMealTracking.ts` | Add `updatePlanMeals`, `generateWeekPlan` mutations; extend `generatePlan` params |
| `supabase/functions/ai-meal-plan/index.ts` | Accept `exclude_meals` and `snack_count`, adjust prompt |
| `src/components/nutrition/MealWeekComparison.tsx` | Add "Plan This Week" button, show daily meal breakdowns |
| `src/components/nutrition/MealTracker.tsx` | Derive meal slots from plan when available |

