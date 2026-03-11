

# Meal Slot Assignment on Keep

## Problem
When a user swipes right to keep a meal during the week review, it auto-assigns to the current day it was generated for. The user should be able to choose which day and meal slot (e.g. Monday's Lunch, Tuesday's Dinner) it goes to.

## Solution
Add a slot picker dialog that appears when the user swipes right. It shows a grid of Day + Meal Type options so the user confirms exactly where the kept meal lands.

### Changes to `src/components/nutrition/WeekPlanReviewSheet.tsx`

1. **Add a `pendingAssign` state** — when user swipes right, instead of immediately adding to `keptMeals`, store the meal in `pendingAssign` and show a picker.

2. **Inline slot picker UI** — a small dialog/popover with:
   - Row per day (Mon–Sun from `generatedDays` dates, formatted as "Mon, Mar 12")
   - Columns for Breakfast / Lunch / Dinner / Snack
   - Tap a cell to assign the meal there
   - Already-assigned slots shown as occupied (greyed out or with the meal name)

3. **Update `keptMeals` structure** — change from `Record<number, MealPlanMeal[]>` to allow cross-day assignment. When user picks "Tuesday Dinner", the meal is placed in the Tuesday index with `meal_type` overridden to "dinner".

4. **Same flow for `handleSaveToLibrary`** — also show the slot picker before assigning.

5. **Summary screen** — already groups by day, no changes needed since kept meals land in the correct day bucket.

### UI Detail
The slot picker will be a compact `AlertDialog` that opens on accept:
- Title: "Where should [meal name] go?"
- Scrollable list of days, each with 4 tappable pill buttons (Breakfast, Lunch, Dinner, Snack)
- Occupied slots show a checkmark and are still tappable (replaces existing)
- Cancel dismisses and skips the meal (not kept)

### Files
| File | Change |
|------|--------|
| `src/components/nutrition/WeekPlanReviewSheet.tsx` | Add pendingAssign state, slot picker dialog, update keptMeals to support cross-day assignment |

