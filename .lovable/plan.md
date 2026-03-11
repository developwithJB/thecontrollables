

# Fix: Rejected meals keep repeating

## Problem
When a user skips/rejects a meal, `handleReject` calls `generateForSlot` with identical parameters. The AI endpoint has no knowledge of previously rejected meals, so it returns the same suggestion.

## Solution
Track rejected meal names in `MealPlanBuilder` state, pass them to the edge function as `exclude_names`, and add an exclusion instruction to the AI prompt.

### 1. `src/components/nutrition/MealPlanBuilder.tsx`
- Add `rejectedNames` state (`string[]`)
- On reject, push the meal name into `rejectedNames`
- Pass `exclude_names: rejectedNames` in the `onGenerate` call inside `generateForSlot`
- Reset `rejectedNames` when moving to next slot or resetting builder

### 2. `supabase/functions/ai-meal-plan/index.ts`
- Read `exclude_names` from request body (optional `string[]`)
- If present, add to prompt: `"Do NOT suggest any of these meals (already rejected): ${exclude_names.join(", ")}. Suggest something completely different."`

### 3. `src/components/nutrition/MealPlanCard.tsx`
- Pass through `exclude_names` from `onGenerate` config to the edge function call (ensure it's forwarded in the request body)

| File | Change |
|------|--------|
| `src/components/nutrition/MealPlanBuilder.tsx` | Track rejected names, pass to generate |
| `supabase/functions/ai-meal-plan/index.ts` | Accept `exclude_names`, add to prompt |
| `src/components/nutrition/MealPlanCard.tsx` | Forward `exclude_names` in API call |

