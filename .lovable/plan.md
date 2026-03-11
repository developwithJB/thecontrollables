

# Meal Planning Upgrade + PvA Label Fix

## Overview
Three changes: (1) Move the Fuel Check / Meal Planning module into the Planner page, (2) rebuild the meal generation flow to be collaborative with the 🛰️ Wellness character using the Tinder-style swiper, and (3) rename "Body" → "Actual" in the Plan vs Actual view.

## Changes

### 1. Rename "Body" → "Actual" in PlanVsActualView
**File**: `src/components/planner/PlanVsActualView.tsx`
- Line 274: Change `"Body"` → `"Actual"`
- Keep all the wearable metric rows (Recovery, Sleep, HRV, Strain) under the "Actual" column — they represent what actually happened

### 2. Move MealPlanCard from Wellness to Planner
**File**: `src/pages/Planner.tsx`
- Import `MealPlanCard` from `@/components/nutrition/MealPlanCard`
- Add it as a collapsible section in the Planner page (below the calendar connect section, or as a tab alongside the PvA view)
- Add a 🛰️ Fuel Check toggle button in the Planner toolbar (next to the PvA toggle)
- Pass `userId`, `isPaid`, `onUpgrade` props

**File**: `src/pages/Wellness.tsx`
- Remove the `MealPlanCard` import and rendering (lines 17, 129-136)
- Keep all other wellness content intact

### 3. Rebuild Meal Generation as Collaborative Swiper Flow
**File**: `src/components/nutrition/MealPlanCard.tsx` — Major rewrite of the generation flow:

Currently: Click "Generate" → AI returns a flat list → done. No swiper, no collaboration, no ability to reject individual meals.

New flow:
1. User clicks "Generate Today's Meal Plan" → opens a conversational flow with the 🛰️ Wellness character
2. 🛰️ asks a quick preference question: "What sounds good today?" with quick-tap chips (e.g. "Light & fresh", "High protein", "Comfort food", "Surprise me")
3. AI generates meals one meal-type at a time (breakfast first, then lunch, then dinner, then snacks)
4. Each meal suggestion is presented via the existing `MealSwiper` component (Tinder-style cards with swipe right to accept, left to reject, up to save)
5. If rejected, 🛰️ generates an alternative for that slot
6. Once all slots are filled, show the final plan with ability to tap any meal to swap it (re-triggers swiper for that slot)
7. Each meal in the final plan has a delete (X) button to remove it

**New component**: `src/components/nutrition/MealPlanBuilder.tsx`
- Full-screen sheet/drawer that contains the collaborative flow
- State machine: `idle` → `asking_preferences` → `generating_breakfast` → `swiping_breakfast` → `generating_lunch` → ... → `review`
- Renders chat bubbles from 🛰️ Wellness character ("Here's a breakfast idea..." / "How about this for lunch?")
- Uses `MealSwiper` for each meal slot
- On reject: calls AI for a replacement suggestion for that specific meal type
- On accept: locks that slot, moves to next meal type
- Review screen shows all accepted meals with delete/swap per meal
- "Confirm Plan" button saves via existing `generatePlan` / `updatePlanMeals` mutations

**File**: `src/components/nutrition/MealSwiper.tsx`
- Add optional `onRegenerate` callback prop for requesting a new suggestion
- Add a recipe image placeholder area at the top of the card (for future image support)

### 4. Meal Logging for Plan vs Actual (Food)
**File**: `src/components/nutrition/MealLogEntry.tsx` — enhance to support:
- Photo upload button (camera icon) that captures/uploads food photo via existing storage
- Quick "Confirm as eaten" tap for planned meals
- Text input for logging unplanned meals
- This data feeds into the "Actual" column for food tracking

## Files to Change

| File | Change |
|------|--------|
| `src/components/planner/PlanVsActualView.tsx` | Rename "Body" → "Actual" |
| `src/pages/Planner.tsx` | Add MealPlanCard/Fuel Check section |
| `src/pages/Wellness.tsx` | Remove MealPlanCard |
| `src/components/nutrition/MealPlanBuilder.tsx` | New — collaborative swiper flow with 🛰️ character |
| `src/components/nutrition/MealPlanCard.tsx` | Wire "Generate" to open MealPlanBuilder instead of direct API call |
| `src/components/nutrition/MealSwiper.tsx` | Add onRegenerate prop, image placeholder |
| `src/components/nutrition/MealLogEntry.tsx` | Add photo upload + confirm-as-eaten |

