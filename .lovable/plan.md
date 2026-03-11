

# Fuel Plan — Core Feature Integration

## What Already Exists
The codebase already has substantial nutrition infrastructure:
- **MealPlanBuilder** — swipe-based meal builder with mood selection, per-slot generation
- **MealSwiper** — card swipe UI (accept/reject/save)
- **MealPlanCard** — full Fuel Check card with today/week toggle, config, recipe library, meal logging
- **MealWeekComparison** — week plan view with grocery list, calendar export
- **GroceryListSheet** — AI-generated grocery list with share/copy/image export
- **RecipeLibrary** — saved recipes with day picker
- **WellnessFuelSummary** — compact today's fuel card
- **useMealTracking** — hook with plan generation, week generation, meal logging, planner integration
- **useMealPreferences** — dietary preferences stored in profiles

## What Needs to Be Built

### Phase 1 — Body Page Fuel Plan Module + Cross-Page Integration

#### 1. Elevate Fuel Plan on Body Page (`src/pages/Wellness.tsx`)
Currently Body shows `WellnessFuelSummary` (a compact read-only card). Replace it with the full `MealPlanCard` component which already has:
- Generate meals button
- Today/Week toggle
- Swipe builder
- Recipe library
- Grocery list
- Meal logging

Also add a "What should we eat tonight?" quick action button that opens the MealPlanBuilder with `single_meal_type: "dinner"`.

**Changes to `src/pages/Wellness.tsx`:**
- Import `MealPlanCard` instead of just `WellnessFuelSummary`
- Add a section header "Fuel Plan" before the nutrition area
- Render `MealPlanCard` as the primary nutrition module
- Add a quick action button below it: "What should we eat tonight?"

#### 2. New `FuelTodayCard` Component (`src/components/dashboard/FuelTodayCard.tsx`)
A compact card for the Today page showing:
- Tonight's planned meal (from today's meal plan)
- Next meal needing a decision (if slot is empty)
- Estimated prep time
- Quick actions: "Swap tonight's meal" → opens MealPlanBuilder for dinner, "What should we eat?" → opens builder
- If no plan exists: single CTA "Plan today's meals"

Data source: `useMealTracking` (todayPlan) — already fetches today's meals.

#### 3. Add FuelTodayCard to Today Page (`src/pages/Home.tsx`)
Insert `FuelTodayCard` between TodayActions and Plan vs Actual (position 3.5). Keep it compact — one card, not a full module.

#### 4. New `GroceryRhythmCard` Component (`src/components/money/GroceryRhythmCard.tsx`)
A lightweight card for Money page showing:
- Number of meals planned this week (from `meal-week-plans` query)
- Estimated grocery items count (from grocery list if generated)
- Takeout risk indicator: "No meals planned — takeout risk is higher"
- Simple insight text based on planning state

No new data model needed — derives from existing `meal_plans` table.

#### 5. Add GroceryRhythmCard to Money Page (`src/pages/Money.tsx`)
Insert after `FinancialControllables` and before `MoneyOverview`.

#### 6. Planner Meal Slot Visibility (`src/pages/Planner.tsx`)
The Planner already has `MealPlanCard` rendered in a toggle overlay (`showFuelCheck`). Enhance:
- Show a small inline meal indicator per day in the `PlannerDayView` or date strip when meals are planned (e.g., "🍽️ 3 meals")
- Already has the infrastructure — just surface it more prominently

### No Database Changes Needed
All required tables exist: `meal_plans`, `meal_logs`, `saved_recipes`, `profiles.meal_preferences`. The existing data model supports weekly generation, recipe save/reject, loose scheduling, and grocery export.

## Files to Create
| File | Purpose |
|---|---|
| `src/components/dashboard/FuelTodayCard.tsx` | Compact fuel card for Today page |
| `src/components/money/GroceryRhythmCard.tsx` | Grocery rhythm insight for Money page |

## Files to Modify
| File | Change |
|---|---|
| `src/pages/Wellness.tsx` | Replace `WellnessFuelSummary` with full `MealPlanCard` + section header + quick action |
| `src/pages/Home.tsx` | Add `FuelTodayCard` between TodayActions and PvA |
| `src/pages/Money.tsx` | Add `GroceryRhythmCard` after FinancialControllables |
| `src/pages/Planner.tsx` | Add inline meal count indicator to day headers when meals are planned |

## What Does NOT Change
- All existing nutrition components preserved (MealPlanBuilder, MealSwiper, etc.)
- All hooks and data models stay the same
- Edge functions unchanged (ai-meal-plan, ai-grocery-list, ai-meal-analyze)
- No new database tables or migrations needed
- Grocery list share/copy/export already works
- Recipe library already works
- The Controllables influence is already mapped in `ControllablePoweredBy`

