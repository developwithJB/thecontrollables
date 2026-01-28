
# Fix: Display Most Recent Snapshot on Dashboard

## Problem
The dashboard is showing an old snapshot (Jan 7-13) instead of the most recent one (Jan 22-28) because the `SnapshotReviewCard` component queries for the "last ended session" by ordering on `created_at` (when the database record was inserted) rather than by actual dates (`start_date` or `completed_at`).

This happens when test/seed data is inserted with newer `created_at` timestamps but older actual snapshot dates.

## Root Cause
In `src/components/dashboard/SnapshotReviewCard.tsx` (lines 35-51):
```typescript
const { data: lastSession } = useQuery({
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reset_sessions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["completed", "expired", "paused"])
      .order("created_at", { ascending: false })  // <-- BUG: should order by actual dates
      .limit(1)
      .maybeSingle();
    ...
  }
});
```

## Solution
Change the ordering from `created_at` to `start_date` (descending). This ensures the most recent **actual** snapshot is shown, regardless of when the database record was inserted.

## Changes Required

### File: `src/components/dashboard/SnapshotReviewCard.tsx`

1. **Update the query ordering** (line 43):
   - Change `.order("created_at", { ascending: false })` 
   - To `.order("start_date", { ascending: false })`

This single-line change ensures:
- The snapshot with the most recent `start_date` is displayed first
- Test/seed data won't incorrectly appear as "most recent"
- The user always sees their actual most recent completed week

## Technical Details

| Session ID | start_date | created_at | Status |
|------------|------------|------------|--------|
| `a15fa860...` | 2026-01-22 | 2026-01-22 | completed (should show) |
| `a2222222...` | 2026-01-07 | 2026-01-26 | completed (showing incorrectly) |

After the fix, `a15fa860...` (Jan 22-28) will correctly display because it has the most recent `start_date`.
