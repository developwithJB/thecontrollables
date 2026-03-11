

# Wearable Sync Audit: Findings and Fixes

## Key Finding: WHOOP Does Not Provide Steps

**WHOOP does not expose a steps API.** It's a recovery/strain device — it tracks strain score, recovery, HRV, sleep, and heart rate, but not step counts. In `wearable-sync/index.ts` line 264, the WHOOP sync explicitly writes `steps: null`. This is correct behavior, not a bug.

Fitbit and Oura both pull steps properly. The issue is that the UI doesn't communicate this limitation to the user.

## Audit Summary

### What Works Well
- **Token refresh**: All three providers (WHOOP, Fitbit, Oura) have proper token refresh logic before sync
- **Normalization**: All data flows through `health_sync_data` with provider-agnostic columns
- **Manual fallback**: `ConfirmLastNightDialog` correctly falls back to emoji ratings when no wearable is connected
- **On-demand sync**: Manual "Sync Now" buttons exist in `WearableSummaryCard`, `HealthDataSync`, and `ConfirmLastNightDialog`
- **App resume**: `useAppResume` invalidates all active queries after 2+ minutes backgrounded, refreshing cached wearable data

### Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **No automatic daily sync** — sync only happens when user manually taps "Sync Now" or opens the check-in dialog. There's no scheduled/cron trigger. | High |
| 2 | **Steps show as empty for WHOOP** — UI shows "steps" metric slot but WHOOP can never populate it; confusing UX | Medium |
| 3 | **WearableSummaryCard connect button hardcodes `whoop`** — line 83 always passes `provider: "whoop"` regardless of what the user has connected | Medium |
| 4 | **No auto-sync on app open** — `useAppResume` invalidates queries (re-reads cached DB data) but doesn't trigger a fresh `wearable-sync` call to pull new data from the provider API | High |

## Plan

### 1. Add auto-sync on dashboard load
In the Dashboard page (or a new `useAutoWearableSync` hook), trigger `wearable-sync` once per session when the user has a connected wearable and hasn't synced in the last 4 hours. Store last-sync timestamp in `sessionStorage` to avoid redundant calls.

### 2. Hide steps metric for WHOOP
In `WearableSummaryCard` and `ConfirmLastNightDialog`, conditionally hide the steps display when `provider === "whoop"`. Show strain score as the WHOOP-specific equivalent instead.

### 3. Fix hardcoded provider in WearableSummaryCard connect
The "Connect Wearable" button in `WearableSummaryCard` (line 83) hardcodes `provider: "whoop"`. Change it to open the `HealthDataSync` dialog instead so users can pick their provider.

### 4. Manual fallback clarity
The manual check-in flow (`ConfirmLastNightDialog` without a wearable) already works well — 3 emoji taps for sleep/movement/nutrition → optional notes → log. No changes needed here.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useAutoWearableSync.ts` | **New** — auto-sync hook triggered on dashboard load, throttled to every 4 hours |
| `src/pages/Dashboard.tsx` | Add `useAutoWearableSync` call |
| `src/components/wellness/WearableSummaryCard.tsx` | Hide steps for WHOOP; fix hardcoded provider on connect button |
| `src/components/dashboard/ConfirmLastNightDialog.tsx` | Hide steps reference for WHOOP in the wearable summary step |

