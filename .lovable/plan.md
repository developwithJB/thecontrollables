

# Recipe Library + Fuel Visibility on Wellness + Assign-to-Week Flow

## Overview
Three changes: (1) Add a `saved_recipes` database table so users can save and browse recipes, (2) create a Pinterest-style recipe card grid with detail view, "Add to week" action (which also auto-adds ingredients to grocery list), (3) show a read-only Fuel summary on Wellness that links to the Planner for planning.

## Database

### New table: `saved_recipes`
```sql
CREATE TABLE public.saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  emoji text DEFAULT '🍽️',
  image_url text,
  prep_minutes integer,
  est_calories integer,
  est_protein integer,
  est_carbs integer,
  est_fat integer,
  meal_type text NOT NULL DEFAULT 'dinner',
  tags text[] DEFAULT '{}',
  ingredients jsonb DEFAULT '[]',
  instructions jsonb DEFAULT '[]',
  source text DEFAULT 'swiper',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recipes" ON public.saved_recipes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## New Components

### `src/components/nutrition/RecipeLibrary.tsx`
- Pinterest-style masonry grid of recipe cards
- Each card: image placeholder (emoji fallback), name, calories, prep time, tags
- Tap opens `RecipeDetailSheet`
- "Add to [Day]" button on each card — opens a day picker, then inserts into `meal_plans` for that date and appends ingredients to grocery context
- Filter chips: All / Breakfast / Lunch / Dinner / Snack
- Empty state: "Save recipes from the meal builder to build your library"

### `src/components/nutrition/RecipeDetailSheet.tsx`
- Bottom sheet with full recipe info: image, name, description, macros, ingredients list, instructions steps
- Actions: "Add to this week" (day picker), "Remove from library", "Share"

### `src/components/nutrition/WellnessFuelSummary.tsx`
- Read-only card for Wellness page showing today's planned meals (from `meal_plans`)
- Shows meal names + total planned calories
- CTA: "Plan in Planner →" links to `/planner` with fuel check toggled
- No editing — planning lives only in Planner

## Modified Components

### `MealSwiper.tsx`
- `onSaveToLibrary` now persists to `saved_recipes` table (currently it's a no-op callback)

### `MealPlanCard.tsx`
- Add a "Recipe Library" button that opens `RecipeLibrary` sheet
- When user taps "Add to week" from library, insert recipe as a meal into the selected day's `meal_plans`

### `MealPlanBuilder.tsx`
- Wire the `onSaveToLibrary` callback to actually insert into `saved_recipes`

### `src/pages/Wellness.tsx`
- Add `WellnessFuelSummary` card (read-only view of today's planned fuel)

### `src/pages/Planner.tsx`
- No structural change; RecipeLibrary is accessed via MealPlanCard which is already in Planner

### `src/hooks/useMealTracking.ts`
- Add `saveRecipe` mutation (insert into `saved_recipes`)
- Add `useSavedRecipes` query
- Add `addRecipeToDay` mutation (inserts recipe as a meal into `meal_plans` for a given date)

## Files to Change

| File | Change |
|------|--------|
| **Migration** | Create `saved_recipes` table with RLS |
| `src/components/nutrition/RecipeLibrary.tsx` | New — Pinterest grid + day assignment |
| `src/components/nutrition/RecipeDetailSheet.tsx` | New — full recipe detail + actions |
| `src/components/nutrition/WellnessFuelSummary.tsx` | New — read-only fuel card for Wellness |
| `src/hooks/useMealTracking.ts` | Add saveRecipe, useSavedRecipes, addRecipeToDay |
| `src/components/nutrition/MealPlanCard.tsx` | Add Recipe Library button |
| `src/components/nutrition/MealPlanBuilder.tsx` | Wire save-to-library to DB |
| `src/components/nutrition/MealSwiper.tsx` | No change needed (callback already passed through) |
| `src/pages/Wellness.tsx` | Add WellnessFuelSummary card |

