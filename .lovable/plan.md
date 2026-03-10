

# Plan: Make "Confirm Last Night" Action Seamless

## Problem
Clicking "Confirm last night" in Today's Actions navigates to `/wellness` but nothing happens — the user lands on a static page with no prompt to log their sleep, movement, or nutrition. The `BrainBodyTracker` component has a built-in `QuickCheckIn` flow (emoji-based rating for sleep/movement/nutrition), but it's not auto-triggered.

## Solution
Instead of navigating away to `/wellness`, open the confirmation flow **inline as a dialog** right from the Dashboard. This keeps the user in context and marks the action complete without a jarring page switch.

## Changes

### 1. `src/pages/Home.tsx`
- Add state `showConfirmLastNight` (boolean)
- Change `onOpenTimeLog` from `() => navigate("/wellness")` to `() => setShowConfirmLastNight(true)`
- Import and render a `ConfirmLastNightDialog` when open
- On successful log, invalidate relevant queries so `todayTimeLogged` flips to true and the action card auto-completes

### 2. Create `src/components/dashboard/ConfirmLastNightDialog.tsx`
A new dialog component containing:
- The same 3-step emoji quick check-in flow (sleep, movement, nutrition) already in `BrainBodyTracker`'s `QuickCheckIn` — extract or duplicate the pattern
- A notes textarea (optional)
- On submit: calls the existing `logWellness` function from `useWellness`
- On success: closes dialog, shows toast, invalidates `brain-body-wellness` and `today-time-log` queries
- Styled as a bottom sheet on mobile for thumb-friendly interaction

### 3. `src/components/dashboard/TodayActions.tsx`
- No changes needed — already calls `action()` which will now open the dialog instead of navigating

## Result
User taps "Confirm last night" → dialog slides up → 3 quick emoji taps + optional notes → done → action card marks complete → carousel advances to next action. No page navigation required.

## Files

| Action | File |
|--------|------|
| Create | `src/components/dashboard/ConfirmLastNightDialog.tsx` |
| Edit | `src/pages/Home.tsx` — swap navigate for dialog state, render dialog |

