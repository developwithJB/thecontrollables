

# Plan: Unified Health Data Layer — Provider-Agnostic, Controllable-Powered

## Current Architecture

The system already has two layers:
1. **WHOOP-specific tables** (`whoop_recoveries`, `whoop_sleeps`, `whoop_cycles`, `whoop_workouts`) — rich provider data
2. **`health_sync_data`** — normalized daily metrics (steps, sleep_minutes, active_minutes, heart_rate_avg) that all providers (Fitbit, Oura, WHOOP) already write to

The problem: the **UI layer** bypasses the normalized table and reads directly from WHOOP-specific tables via `useWhoopData`. This couples 5 components to WHOOP. The `health_sync_data` table also lacks key metrics (recovery, HRV, strain) that power the controllables.

## Changes

### 1. Extend `health_sync_data` with recovery/HRV/strain columns

**DB Migration** — add three nullable columns:

```sql
ALTER TABLE public.health_sync_data
ADD COLUMN IF NOT EXISTS recovery_score numeric,
ADD COLUMN IF NOT EXISTS hrv_ms numeric,
ADD COLUMN IF NOT EXISTS strain_score numeric;
```

These are universal concepts: WHOOP has direct values; Oura has readiness→recovery + HRV; Fitbit has stress score; Apple Watch has HRV. Each sync function maps its data into these columns.

### 2. Update `wearable-sync` edge function

**Edit:** `supabase/functions/wearable-sync/index.ts`

- In the WHOOP `health_sync_data` normalization (step 5, ~line 241), add `recovery_score`, `hrv_ms`, `strain_score` from the already-fetched WHOOP data
- In the Oura sync, map readiness score → `recovery_score`, HRV → `hrv_ms`
- Fitbit sync: map resting HR trends as available (future-proofed, null for now)

### 3. Create `useHealthData` hook (provider-agnostic)

**New file:** `src/hooks/useHealthData.ts`

Replaces `useWhoopData` with a universal interface:

```typescript
interface HealthMetrics {
  recovery: number | null;      // 0-100
  sleepScore: number | null;    // 0-100
  strain: number | null;        // 0-21 (WHOOP scale, normalized for others)
  hrv: number | null;           // ms
  restingHR: number | null;     // bpm
  sleepMinutes: number | null;
  activeMinutes: number | null;
  steps: number | null;
}

interface HealthDataResult {
  isConnected: boolean;
  provider: string | null;        // "whoop" | "fitbit" | "oura" | etc.
  latest: HealthMetrics;
  trend: HealthMetrics[];         // 7-day
  lastSynced: string | null;
}
```

- Reads from `wearable_connections` (any provider, not just WHOOP)
- Reads latest + 7-day trend from `health_sync_data` (provider-agnostic)
- For WHOOP users, enriches with WHOOP-specific data (sleep_performance_pct, etc.) from WHOOP tables as a bonus — but the core metrics come from the normalized table

### 4. Update 5 consumer components

Replace `useWhoopData` with `useHealthData` in:

| Component | What changes |
|-----------|-------------|
| `NoticeCheckInCard` | "WHOOP mismatch" → "Wearable mismatch" — uses `healthData.latest.recovery` |
| `RechargeEngineCard` | Recovery/strain/sleep hints become provider-agnostic |
| `PlannerWellnessBanner` | Low recovery / high strain messages use universal metrics |
| `WhoopSummaryCard` | Becomes `WearableSummaryCard` — shows metrics for any connected device |
| `WhoopTrendsCard` | Becomes `WearableTrendsCard` — charts from `health_sync_data` trend |

### 5. Wire health metrics into controllable scoring

**Edit:** `src/hooks/useBrainBodyHealth.ts`

- Already reads `health_sync_data` — extend to use the new `recovery_score`, `hrv_ms`, `strain_score` columns
- Add recovery as a factor in the Brain score (recovery → cognitive readiness)
- Add strain as a factor in the Body score (strain → physical load)

**Edit:** `src/components/dashboard/RechargeEngineCard.tsx`

- Auto-suggest recharge types based on health metrics (low recovery → suggest Recovery/Sleep; high strain + low sleep → suggest Rest)

### 6. Rename WHOOP-branded files

| Old | New |
|-----|-----|
| `WhoopSummaryCard.tsx` | `WearableSummaryCard.tsx` |
| `WhoopTrendsCard.tsx` | `WearableTrendsCard.tsx` |

Update imports in `src/pages/Wellness.tsx` and anywhere else they're referenced.

## Files Summary

| Action | File |
|--------|------|
| DB Migration | Add `recovery_score`, `hrv_ms`, `strain_score` to `health_sync_data` |
| Edit | `supabase/functions/wearable-sync/index.ts` — write new columns during WHOOP/Oura normalization |
| Create | `src/hooks/useHealthData.ts` — provider-agnostic hook |
| Rename+Edit | `WhoopSummaryCard.tsx` → `WearableSummaryCard.tsx` |
| Rename+Edit | `WhoopTrendsCard.tsx` → `WearableTrendsCard.tsx` |
| Edit | `NoticeCheckInCard.tsx`, `RechargeEngineCard.tsx`, `PlannerWellnessBanner.tsx` — swap to `useHealthData` |
| Edit | `useBrainBodyHealth.ts` — incorporate recovery/HRV/strain |
| Edit | `src/pages/Wellness.tsx` — update imports |
| Deprecate | `useWhoopData.ts` — keep temporarily for backward compat, re-export from `useHealthData` |

## What stays WHOOP-specific

- The WHOOP-specific tables (`whoop_recoveries`, etc.) remain — they store rich raw data
- The `wearable-sync` function continues writing to them for WHOOP users
- WHOOP webhook handler stays as-is
- Future providers (Apple Watch, Garmin) just need a sync function that writes to `health_sync_data` with the normalized columns

