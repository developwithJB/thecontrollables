

# Post-Generation Review Flow for Week Plan

## Problem
"Regenerate This Week" immediately generates and saves all 7 days of meals without letting the user review them. The swipe-to-keep/skip flow that exists for daily plans (MealPlanBuilder) is completely bypassed.

## Solution
After `generateWeekPlan` completes, instead of just showing a toast, open a **review walkthrough** that presents each day's meals as swipeable cards. The user can keep or skip individual meals across all 7 days before the final plan is saved.

## Approach

### 1. Change `generateWeekPlan` to return results without auto-saving
Currently it calls the AI and immediately upserts into `meal_plans`. Change it to:
- Still call AI for all 7 days
- **Return** the results but **don't upsert** yet
- Store results in component state for review

### 2. New component: `WeekPlanReviewSheet.tsx`
A bottom sheet that walks the user through the generated week, one day at a time:
- Shows day header (e.g. "Wed, Mar 12")
- Displays each meal as a swipeable card (reuses `MealSwiper`)
- Swipe right = keep, swipe left = skip/remove from that day
- After reviewing all days, show a summary screen with "Confirm Week" button
- On confirm, upsert the kept meals into `meal_plans`

Flow: Day 1 meals → swipe each → Day 2 meals → ... → Summary → Confirm

### 3. Wire into `MealWeekComparison.tsx`
- After `generateWeekPlan.mutate()` resolves, open `WeekPlanReviewSheet` with the generated data
- On confirm from the review sheet, call a new `saveWeekPlan` mutation that does the upserts
- On cancel, discard everything

### 4. Update `useMealTracking.ts`
- Split `generateWeekPlan` into two parts:
  - `generateWeekPlan`: calls AI for 7 days, returns results (no DB write)
  - `saveWeekPlan`: new mutation that upserts the confirmed meals into `meal_plans`

## Files

| File | Change |
|------|--------|
| `src/components/nutrition/WeekPlanReviewSheet.tsx` | New — day-by-day swipe review walkthrough |
| `src/hooks/useMealTracking.ts` | Split generateWeekPlan: remove auto-save, add saveWeekPlan |
| `src/components/nutrition/MealWeekComparison.tsx` | Store generated results in state, open review sheet after generation |

