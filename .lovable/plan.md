

# Plan: Fix Today's Actions — Save Flow, Wearable Sync, and Plan Validation

## Problems Found

1. **"Confirm last night" never saves correctly**: The `ConfirmLastNightDialog` calls `useWellness.logWellness()` which writes to the `wellness_logs` table. But the `todayTimeLogged` prop that marks the action complete comes from `todayTimeLog` in `useDashboardSummary`, which reads the `time_logs` table. These are two completely different tables — so the action never flips to "completed."

2. **"Validate today's plan" is a dead end**: Currently `onOpenPromises={() => navigate("/growth")}` — it just dumps the user on the Growth page with no specific flow to confirm or review their plan.

3. **No wearable data integration**: If a user has a connected wearable (WHOOP, Fitbit, Oura), the dialog should pull that data first and show it, rather than forcing manual emoji entry for sleep/movement.

4. **Actions are too generic**: The action list doesn't adapt based on whether the user has a wearable, their journey, or their actual app state.

## Changes

### 1. Fix save detection — `ConfirmLastNightDialog` + completion signal

**`src/components/dashboard/ConfirmLastNightDialog.tsx`**
- After logging wellness, also upsert a row into `time_logs` (the table that `todayTimeLogged` checks), so the action properly marks complete
- Add a wearable data step: use `useHealthData` to check if a wearable is connected. If yes, show synced sleep/movement data as pre-filled values before emoji selection. User can override with emojis if needed
- Flow becomes: Step 0 (wearable summary, if connected) → Step 1 (sleep emoji, pre-selected if wearable data) → Step 2 (movement emoji) → Step 3 (nutrition emoji) → Step 4 (notes + submit)

**`src/components/dashboard/ConfirmLastNightDialog.tsx`** — additional invalidations:
- After submit, also invalidate `["dashboard-summary"]` so `todayTimeLog` refreshes

### 2. Fix "Validate today's plan" — inline dialog

**`src/components/dashboard/ValidatePlanDialog.tsx`** (new file)
- A drawer/dialog that shows:
  - Today's planner items (from `planner_items` table) in a quick checklist
  - Pending promises with resolve/skip buttons
  - A "Confirm plan" button that marks the action complete
- Store completion in localStorage keyed by userId + date (similar to `reviewBuildDoneToday` pattern)

**`src/pages/Home.tsx`**
- Add `showValidatePlan` state
- Change `onOpenPromises` from `navigate("/growth")` to `() => setShowValidatePlan(true)`
- Render `ValidatePlanDialog`

**`src/components/dashboard/TodayActions.tsx`**
- Track `validatePlanCompleted` via localStorage (userId + date key)
- Pass completion status to the "Validate today's plan" action item

### 3. Make Today's Actions smarter

**`src/components/dashboard/TodayActions.tsx`**
- Always show "Confirm last night" and "Validate today's plan" as the two core actions (these capture yesterday's data and confirm today's plan)
- Journey-specific and day-based bonus actions remain as-is (they already adapt)
- Remove the `pendingPromisesCount > 0` gate on "Validate today's plan" — it should always appear so users can confirm their daily focus even without promises

## Files

| Action | File |
|--------|------|
| Edit | `src/components/dashboard/ConfirmLastNightDialog.tsx` — fix save to write `time_logs`, add wearable data step, invalidate dashboard-summary |
| Create | `src/components/dashboard/ValidatePlanDialog.tsx` — inline plan validation drawer |
| Edit | `src/pages/Home.tsx` — add ValidatePlanDialog state and rendering |
| Edit | `src/components/dashboard/TodayActions.tsx` — always show "Validate today's plan", track its completion via localStorage |

