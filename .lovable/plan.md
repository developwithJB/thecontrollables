

# Fix: Migrate WHOOP Sync from Deprecated v1 to v2 API

## Root Cause
WHOOP removed their v1 API after October 1, 2025 (current date is March 2026). The edge function logs confirm:
```
[WHOOP] Recovery API 404: HTTP 404 Not Found
[WHOOP] Sleep API 404: HTTP 404 Not Found
[WHOOP] Workouts API 404: HTTP 404 Not Found
```
The `/developer/v1/cycle` endpoint still partially responds, but recovery, sleep, and workout v1 endpoints are dead.

## Solution
Migrate all WHOOP API calls in `syncWhoop` from v1 to v2 endpoints.

### Endpoint mapping (from WHOOP migration guide):
| Current (broken) | New (v2) |
|---|---|
| `/developer/v1/cycle` | `/developer/v2/cycle` |
| `/developer/v1/recovery` | `/developer/v2/recovery` |
| `/developer/v1/activity/sleep` | `/developer/v2/activity/sleep` |
| `/developer/v1/activity/workout` | `/developer/v2/activity/workout` |

### Key v2 differences to handle:
- IDs are UUIDs instead of integers (already using `String()` casts, so compatible)
- Recovery in v2 may reference sleep UUID instead of cycle ID — update the cross-referencing logic to handle both `cycle_id` and `sleep_id` fields
- Sleep response includes `v1_id` field alongside new UUID `id`
- Token refresh endpoint remains the same

### Changes in `supabase/functions/wearable-sync/index.ts`:
1. Change `baseUrl` from `https://api.prod.whoop.com/developer/v1` to `https://api.prod.whoop.com/developer/v2`
2. Update recovery cross-referencing: in v2, recovery objects may use `sleep_id` (UUID) instead of `cycle_id` (integer) — adapt the parent-cycle lookup to try both fields
3. Update upsert `whoop_id` values to use the new UUID format returned by v2
4. Keep all existing normalization logic, delay pattern, and error logging intact

## Files
| Action | File |
|---|---|
| Edit | `supabase/functions/wearable-sync/index.ts` — change baseUrl to v2, update recovery cross-referencing for v2 response format |

