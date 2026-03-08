

## Plan: Dietary Preferences & Restrictions for Meal Plans

### Problem
Users can't specify food restrictions like "no lunch meat", "whole foods only", or "single ingredient foods". The AI meal plan generator has no way to receive these preferences.

### Changes

#### 1. Extend MealPreferences with dietary rules
**File: `src/hooks/useMealPreferences.ts`**
- Add two new fields to `MealPreferences`:
  - `dietaryRestrictions: string[]` — free-text tags like "no lunch meat", "no processed food", "gluten free"
  - `dietaryStyle: string` — optional preset like "whole foods", "single ingredient", "clean eating", or empty for no preset

#### 2. Add dietary input UI to the config panel
**File: `src/components/nutrition/MealPlanCard.tsx`**
- Below the macro targets section in the config panel, add:
  - A **dietary style** selector with quick-pick chips: "Whole Foods", "Single Ingredient", "Clean Eating", "No Restrictions"
  - A **free-text input** for custom restrictions with an "Add" button — typed entries appear as removable tags (e.g., "no lunch meat ✕", "no pork ✕")
- Save both fields alongside existing preferences on generate

#### 3. Pass restrictions to the AI prompt
**File: `supabase/functions/ai-meal-plan/index.ts`**
- Accept `dietary_restrictions` (string[]) and `dietary_style` (string) from the request body
- Append them to the system prompt, e.g.: `"Dietary style: whole foods, single ingredient only. Restrictions: no lunch meat, no pork."`
- The AI will incorporate these into meal generation

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useMealPreferences.ts` | Add `dietaryRestrictions` and `dietaryStyle` fields |
| `src/components/nutrition/MealPlanCard.tsx` | Add dietary style chips + free-text restriction tags to config panel |
| `supabase/functions/ai-meal-plan/index.ts` | Include dietary preferences in AI system prompt |

