
# Fix: Nudge Suppression Leaves "Pending" Slot + Stale Dashboard Cache

## Problem Summary

Two related issues affecting the user `developwithjb@gmail.com`:

1. **No email today**: The nudge function claimed the send slot (inserted "pending" into `email_nudge_logs`) but then hit the "no active session" suppression and returned early without sending or updating the status. The slot is permanently blocked.

2. **App stuck on yesterday**: After completing Day 1 of a new snapshot, the `current_day` column was bumped to 2 in the database, but the client's React Query cache still holds stale data from the previous session. The `useReset` hook uses `calculateCurrentDay()` (date-based) for display, which is correct, but the dashboard-summary cache may still reference the old completed session's data, making the UI feel "stuck".

## Root Cause

In `supabase/functions/send-daily-nudge/index.ts`, lines 919-931: when suppression conditions are met (today's actions already completed, or no active session), the function increments `skippedCount` and returns — but the `email_nudge_logs` row stays as "pending" forever. The email is never sent, and on re-invocation, the insert would fail (duplicate), so the email can never be retried.

This is NOT a global issue. Other users either:
- Were not at their target hour (7 AM local)
- Had active sessions and received their nudge normally

## Fix Plan

### 1. Update nudge suppression to mark skipped slots (send-daily-nudge/index.ts)

When a nudge is skipped due to suppression (lines 919-931), update the `email_nudge_logs` status from "pending" to "skipped" so:
- The slot is properly recorded (no retry attempts)
- Admin monitoring can distinguish "skipped" from "pending" (stuck) entries
- The deduplication still works (row exists, no duplicate sends)

Add status update before each `skippedCount++; return;` block:

```typescript
// After claiming but before skipping, mark as skipped
await supabase
  .from("email_nudge_logs")
  .update({ status: "skipped" })
  .eq("user_id", userId)
  .eq("nudge_date", localDate);
```

### 2. Fix today's missed email for this user

Manually update the Feb 16 nudge log from "pending" to "skipped" so the record is accurate. The email window for today (7 AM) has already passed, so no re-send is needed -- but the data should be clean.

### 3. Invalidate stale cache on session transitions (useReset.ts)

In the `acceptCovenantMutation.onSuccess` callback (line 291), also invalidate the `dashboard-summary` query key so the dashboard immediately reflects the new session:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["reset-session"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  // ...
}
```

This already partially exists but the `dashboard-summary` key is missing from the invalidation list, which can cause the dashboard to show stale data from the previous session.

### 4. Also handle the email-not-sent suppression path (no active session after auto-complete)

The real edge case: the nudge function auto-completes an expired session at line 201-209, then returns context with `sessionId: null`. The function then skips the email at line 927. But the user still deserves a nudge -- they just need a "start a new snapshot" nudge instead of a "continue your snapshot" nudge.

Update the suppression logic: when there is no active session, instead of skipping entirely, send a re-engagement nudge ("Start your next snapshot").

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-daily-nudge/index.ts` | Mark skipped slots as "skipped" instead of leaving them "pending"; optionally send re-engagement nudge when no active session |
| `src/hooks/useReset.ts` | Add `dashboard-summary` to invalidation in `acceptCovenantMutation.onSuccess` |

## Not Global

Confirmed: only 1 user (JB) has a Feb 16 nudge log. Other users either aren't at their target hour yet or don't have nudges enabled. No other users are affected by the stale cache issue since no other users created a new session today.
