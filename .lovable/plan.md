

## Plan: Fitbit & Oura Ring OAuth Integrations

### Architecture

Both Fitbit and Oura use standard OAuth 2.0 authorization code flows. The integration stores tokens server-side and syncs data into the existing `health_sync_data` table.

```text
User taps "Connect Fitbit"
  → Redirect to Fitbit OAuth consent
  → Callback edge function exchanges code for tokens
  → Tokens stored in wearable_connections table
  → Sync edge function pulls sleep/steps/activity data
  → Data written to health_sync_data (existing table)
  → Brain & Body tracker auto-refreshes
```

### Required Secrets (4 total)
- `FITBIT_CLIENT_ID` + `FITBIT_CLIENT_SECRET` — from dev.fitbit.com
- `OURA_CLIENT_ID` + `OURA_CLIENT_SECRET` — from cloud.ouraring.com

### Database Changes

**New table: `wearable_connections`**
- `id`, `user_id`, `provider` (fitbit/oura), `access_token`, `refresh_token`, `token_expires_at`, `scopes`, `connected_at`, `last_synced_at`
- Unique constraint on `(user_id, provider)`
- RLS: users can only read/update/delete their own connections

### Edge Functions (3 new)

1. **`wearable-oauth-start`** — Generates the OAuth authorization URL for the requested provider (Fitbit or Oura) and returns it to the client. Includes PKCE or state parameter for security.

2. **`wearable-oauth-callback`** — Handles the redirect from Fitbit/Oura after user consents. Exchanges the authorization code for access/refresh tokens and stores them in `wearable_connections`.

3. **`wearable-sync`** — Authenticated function that reads stored tokens, calls the Fitbit/Oura REST APIs for the last 7 days of sleep, steps, and activity data, normalizes it, and upserts into `health_sync_data` with the appropriate source (`fitbit` or `oura`). Handles token refresh automatically.

### API Endpoints Used

**Fitbit:**
- `GET /1/user/-/sleep/date/{date}.json` — sleep duration, stages
- `GET /1/user/-/activities/date/{date}.json` — steps, active minutes, calories
- `GET /1/user/-/activities/heart/date/{date}/1d.json` — resting heart rate

**Oura:**
- `GET /v2/usercollection/daily_sleep` — sleep duration, efficiency
- `GET /v2/usercollection/daily_activity` — steps, active calories, movement
- `GET /v2/usercollection/heartrate` — heart rate data

### UI Changes

**File: `src/components/dashboard/HealthDataSync.tsx`**
- Add two new tabs: "Fitbit" and "Oura Ring" alongside existing Apple Health and Google Fit tabs
- Each shows a "Connect" button if no connection exists, or "Connected · Sync Now" if already linked
- Connect button calls `wearable-oauth-start` and opens the returned URL
- Add a disconnect option per provider
- Query `wearable_connections` to show connection status

**File: `src/pages/Dashboard.tsx`**
- Add a route-level handler for OAuth callback redirect (query param `?wearable_callback=fitbit&code=...`)
- On mount, detect callback params, call `wearable-oauth-callback`, then redirect cleanly

### Data Flow
All wearable data lands in the same `health_sync_data` table with `source` set to `fitbit` or `oura`. The existing `useBrainBodyHealth` hook already queries this table and will automatically incorporate the new data with zero changes needed.

### Files Changed

| File | Change |
|---|---|
| `wearable_connections` table | New migration — token storage |
| `supabase/functions/wearable-oauth-start/index.ts` | New — generate OAuth URL |
| `supabase/functions/wearable-oauth-callback/index.ts` | New — exchange code, store tokens |
| `supabase/functions/wearable-sync/index.ts` | New — pull data from APIs, upsert to health_sync_data |
| `src/components/dashboard/HealthDataSync.tsx` | Add Fitbit/Oura tabs with connect/sync UI |
| `src/pages/Dashboard.tsx` | Handle OAuth callback redirect |
| `supabase/config.toml` | Register 3 new edge functions |

