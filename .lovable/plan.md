

# Health Data Integration — Apple Health & Google Fit

## Reality Check

Apple Health and Google Fit/Health Connect **cannot be accessed directly from a web app**. Apple HealthKit is strictly on-device (requires native iOS app). Google Fit's REST API is deprecated, and Health Connect is Android-only with no web API.

There are two practical paths:

```text
┌─────────────────────────────────────────────────┐
│  Option A: Third-Party Health Aggregator (Terra) │
│  ─ Handles native SDK on both platforms          │
│  ─ Provides REST API to your backend             │
│  ─ Requires paid API key + user installs widget  │
│  ─ Full automation after setup                   │
├─────────────────────────────────────────────────┤
│  Option B: Manual Import + Smart Shortcuts       │
│  ─ Apple Health XML export → upload & parse      │
│  ─ Google Fit CSV export → upload & parse        │
│  ─ No extra API keys or apps needed              │
│  ─ Periodic re-upload (weekly prompt)            │
│  ─ Can build toward native app later             │
└─────────────────────────────────────────────────┘
```

**My recommendation: Option B first** — it ships fast, costs nothing, works for everyone, and aligns with the "light to use" ethos. The upload is a one-time weekly action. We can add Terra API later as a premium upgrade.

## What Gets Built (Option B)

### 1. New Edge Function: `parse-health-export`
- Accepts uploaded Apple Health XML or Google Fit CSV
- Extracts: steps, sleep hours, active minutes, heart rate (if available)
- Returns structured JSON with daily summaries
- Uses Lovable AI to intelligently parse varied export formats

### 2. New DB Table: `health_sync_data`
```
user_id, sync_date, source (apple_health/google_fit/manual),
steps, sleep_minutes, active_minutes, heart_rate_avg,
raw_data jsonb, synced_at
```
RLS: user owns their rows.

### 3. New Component: `HealthDataSync.tsx`
- Settings card accessible from BrainBodyTracker ("Connect Health Data")
- Two buttons: "Import Apple Health" / "Import Google Fit"
- Each shows step-by-step instructions with screenshots:
  - Apple: Health app → Profile → Export All Health Data → Upload ZIP
  - Google: Google Takeout → Fit data → Upload
- File upload input that accepts .xml/.zip/.csv
- Shows last sync date and summary of imported data

### 4. Updated `useBrainBodyHealth.ts`
- Query `health_sync_data` alongside existing wellness/time/meal logs
- Auto-populate sleep, movement, and nutrition factors from synced health data
- Health data takes priority over manual ratings when available
- Fallback to manual entry gracefully

### 5. Dashboard Integration
- BrainBodyTracker shows a small "📲 Connect" chip if no health data synced
- Tapping opens HealthDataSync modal
- Weekly nudge in TodayActions: "Sync your health data" if last sync > 7 days

## Files
- **New**: `supabase/functions/parse-health-export/index.ts`, `src/components/dashboard/HealthDataSync.tsx`
- **Migration**: Create `health_sync_data` table with RLS
- **Edit**: `src/hooks/useBrainBodyHealth.ts` (consume synced data), `src/components/dashboard/BrainBodyTracker.tsx` (add connect chip)

## Implementation Order
1. DB migration for `health_sync_data`
2. `parse-health-export` edge function
3. `HealthDataSync` component with import instructions + upload
4. Update `useBrainBodyHealth` to consume synced data
5. Wire connect chip into BrainBodyTracker

