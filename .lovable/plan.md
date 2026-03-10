

# WHOOP Integration — Phase 1 Implementation Plan

## Architecture Decision

Extend the existing **wearable OAuth pattern** (`wearable-oauth-start`, `wearable-oauth-callback`, `wearable-sync`) to support WHOOP as a third provider. Store rich WHOOP-specific data in new dedicated tables, while also writing normalized summaries into `health_sync_data` so existing components (BrainBodyTracker, WellnessGoals) work automatically.

## Prerequisites — Secrets Required

Before implementation, you need to provide two secrets from the WHOOP Developer Portal:
- `WHOOP_CLIENT_ID`
- `WHOOP_CLIENT_SECRET`

The redirect URI to configure in WHOOP: `https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/wearable-oauth-callback`

Scopes to request: `read:recovery read:cycles read:sleep read:workout read:profile offline`

## Database Changes (Migration)

**New tables:**

1. `whoop_recoveries` — recovery_score, hrv_rmssd_milli, resting_heart_rate, spo2_percentage, skin_temp_celsius, whoop_cycle_id, recorded_at, user_id, whoop_id (unique)
2. `whoop_sleeps` — sleep_performance_pct, sleep_consistency_pct, sleep_efficiency_pct, respiratory_rate, total_in_bed_ms, total_awake_ms, total_light_ms, total_sws_ms, total_rem_ms, sleep_cycle_count, disturbance_count, start_time, end_time, whoop_id (unique), user_id
3. `whoop_cycles` — whoop_id (unique), start_time, end_time, strain, kilojoules, avg_heart_rate, max_heart_rate, user_id
4. `whoop_workouts` — whoop_id (unique), activity_type, strain, avg_heart_rate, start_time, end_time, whoop_cycle_id, user_id

All tables: RLS enabled, user can only read own rows, service role writes via edge functions.

## Edge Function Changes

### 1. `wearable-oauth-start` — Add WHOOP provider

Add `"whoop"` to the allowed providers list. Build auth URL:
- Auth endpoint: `https://api.prod.whoop.com/oauth/oauth2/auth`
- Scopes: `read:recovery read:cycles read:sleep read:workout read:profile offline`
- Use `WHOOP_CLIENT_ID`

### 2. `wearable-oauth-callback` — Add WHOOP token exchange

Add WHOOP branch:
- Token endpoint: `https://api.prod.whoop.com/oauth/oauth2/token`
- Use `WHOOP_CLIENT_ID` + `WHOOP_CLIENT_SECRET`
- After token storage, fetch WHOOP profile and store `whoop_user_id` in wearable_connections metadata or a column

### 3. `wearable-sync` — Add WHOOP sync logic

New `syncWhoop()` function that:
- Fetches 7 days of recovery, sleep, cycles, workouts from WHOOP API v1
- Upserts into the 4 dedicated WHOOP tables (dedupe by `whoop_id`)
- Also writes normalized daily summaries into `health_sync_data` (source = "whoop") so BrainBodyTracker works immediately
- Handles token refresh using WHOOP's refresh endpoint

### 4. New: `whoop-webhook` edge function

- Accepts POST from WHOOP
- Validates webhook payload
- Triggers sync for the affected user
- Stores raw event in a `whoop_webhook_events` table for debugging
- Idempotent processing

## Frontend Changes

### 1. `useIntegrations.ts` / `HealthDataSync.tsx`

Add `"whoop"` to the wearable provider list so the existing connect/disconnect/sync UI works for WHOOP.

### 2. New: `WhoopSummaryCard.tsx`

Compact card for the Wellness page showing:
- Today's recovery score (color-coded green/yellow/red)
- Last night's sleep performance
- Today's strain
- Last synced timestamp
- Connect/disconnect state

### 3. `Wellness.tsx`

Add `WhoopSummaryCard` above BrainBodyTracker. When WHOOP is connected, the BrainBodyTracker automatically gets richer data via `health_sync_data`.

### 4. `useWhoopData.ts` hook

Query the WHOOP-specific tables for:
- Latest recovery, sleep, strain
- 7-day trends
- Used by WhoopSummaryCard and available for Home/Planner AI insights

## Files Summary

| Action | File |
|--------|------|
| Migration | Create 4 WHOOP tables + webhook_events table + RLS policies |
| Edit | `supabase/functions/wearable-oauth-start/index.ts` — add whoop provider |
| Edit | `supabase/functions/wearable-oauth-callback/index.ts` — add whoop token exchange |
| Edit | `supabase/functions/wearable-sync/index.ts` — add syncWhoop + refresh |
| Create | `supabase/functions/whoop-webhook/index.ts` |
| Create | `src/hooks/useWhoopData.ts` |
| Create | `src/components/wellness/WhoopSummaryCard.tsx` |
| Edit | `src/components/dashboard/HealthDataSync.tsx` — add whoop to provider list |
| Edit | `src/pages/Wellness.tsx` — add WhoopSummaryCard |

Phase 2 (Home/Planner AI integration) and Phase 3 (Growth cross-system insights) will follow once the data pipeline is working.

