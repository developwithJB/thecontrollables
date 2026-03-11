

# Fix: WHOOP Sync Missing Recovery and Sleep Data

## Root Cause

The `syncWhoop` function has three bugs causing recovery and sleep data to be silently lost:

### Bug 1: Silent API failures (no error logging)
When WHOOP API returns a non-200 response (rate limit, auth issue), the code only enters the `if (resp.ok)` block — failed responses are completely ignored with no logging. This means recovery and sleep API calls could be failing with 429 (rate limit) after the cycles call succeeds, and we'd never know.

### Bug 2: No delays between rapid API calls
The function fires 4 sequential WHOOP API calls (cycles, recovery, sleep, workouts) with zero delay between them. WHOOP's API has rate limits, and the first call (cycles) succeeds while subsequent calls may get throttled.

### Bug 3: Date key mismatch in normalization
Recovery, sleep, and strain data can map to different dates depending on timestamps. For example, today's cycle (strain) maps to today's date via `start_time`, but if recovery's `recorded_at` or sleep's `end_time` falls on a slightly different UTC date boundary, they land in separate `health_sync_data` rows. The frontend then fetches `latest` (the most recent row) which may only have strain.

Additionally, the normalization step re-reads from `whoop_recoveries`/`whoop_sleeps`/`whoop_cycles` tables. If the writes to those tables failed silently (constraint issues), normalization would use stale or empty data.

## Changes

### `supabase/functions/wearable-sync/index.ts` — rewrite `syncWhoop`

1. **Add detailed logging for every API call** — log response status and body when not OK, so we can diagnose failures
2. **Add 300ms delays between API calls** to avoid WHOOP rate limits
3. **Build the normalization map directly from API responses** (in-memory) instead of re-reading from the DB after upserts — this eliminates the dependency on intermediate table writes succeeding
4. **Align dates using cycle mapping** — WHOOP recovery is keyed by `cycle_id`, and each cycle has a `start` date. Map recovery and sleep to the same date as their parent cycle, rather than using independent timestamps that may cross UTC day boundaries
5. **Add `sleep_performance_pct` to the normalization** — the WHOOP sleep score (84% in the screenshot) is available from the sleep response but currently not carried into `health_sync_data`. Store it and use it as the `sleepScore` instead of computing a rough estimate from minutes
6. **Return a richer response** with counts per data type so the frontend can show what was actually synced

### Detailed logic for in-memory normalization:

```text
API responses (in-memory)
  ├─ cycles[]    → keyed by cycle.id
  ├─ recoveries[] → keyed by rec.cycle_id → look up cycle start date
  ├─ sleeps[]    → keyed by sleep end_time date
  └─ workouts[]  → informational only

For each cycle:
  date = cycle.start.split("T")[0]
  dayMap[date].strain = cycle.score.strain
  dayMap[date].active_minutes = strain * 5

For each recovery:
  date = find parent cycle's start date via cycle_id
  fallback: recovery.created_at.split("T")[0]
  dayMap[date].recovery = rec.score.recovery_score
  dayMap[date].hrv = rec.score.hrv_rmssd_milli
  dayMap[date].resting_hr = rec.score.resting_heart_rate

For each sleep:
  date = sleep.end.split("T")[0]
  dayMap[date].sleep_minutes = sum of stages
  dayMap[date].sleep_score = sleep.score.sleep_performance_percentage
```

This ensures all three metrics land on the same date row in `health_sync_data`.

## Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/wearable-sync/index.ts` — rewrite `syncWhoop` with logging, delays, in-memory normalization, and cycle-based date alignment |

