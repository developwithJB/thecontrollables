

# Phase 3: WHOOP Deep Integration — Trends, Charge Ring Auto-Assist, Subjective vs Objective Insights

## What We're Building

Three capabilities to complete the WHOOP integration:

1. **7-day trend visuals** on the Wellness page (recovery, sleep, strain sparklines)
2. **Charge ring auto-assist** — when WHOOP detects sleep/movement/recovery activity, suggest pre-filling or auto-completing the Charge ring
3. **Subjective vs Objective comparison** — Notice check-in shows a mismatch hint when self-reported energy diverges from WHOOP recovery

## Changes

### 1. WHOOP 7-Day Trends Component

**New file:** `src/components/wellness/WhoopTrendsCard.tsx`

A card below the WhoopSummaryCard on the Wellness page showing three mini sparkline charts (using recharts `AreaChart`):
- **Recovery trend** — 7 data points, color-coded (green/yellow/red zones)
- **Sleep performance trend** — 7 data points in blue
- **Strain trend** — 7 data points in orange

Data comes from `useWhoopData` hook (already has `recoveryTrend` and `strainTrend`). Need to add a `sleepTrend` query to the hook.

### 2. Add `sleepTrend` to `useWhoopData` hook

**Edit:** `src/hooks/useWhoopData.ts`

Add a 7-day sleep performance trend query (similar to existing `recoveryTrend`), fetching `sleep_performance_pct` and `end_time` from `whoop_sleeps`.

### 3. Integrate trends into Wellness page

**Edit:** `src/pages/Wellness.tsx`

Import and render `WhoopTrendsCard` below `WhoopSummaryCard`, only when WHOOP is connected.

### 4. Charge Ring WHOOP Context

**Edit:** `src/components/dashboard/RechargeEngineCard.tsx`

- Import `useWhoopData` and pass `userId` 
- When WHOOP is connected, show a small context hint above the recharge grid:
  - If recovery < 50%: "WHOOP shows low recovery — prioritize sleep & recovery today"
  - If strain > 14: "High strain yesterday — movement is logged, consider lighter activity"
  - If sleep performance > 80% and recovery > 67%: "Great recovery — you're charged for a strong day"
- This makes the Charge ring feel wellness-aware without auto-completing it (preserving user agency)

### 5. Notice Check-In WHOOP Mismatch Hint

**Edit:** `src/components/dashboard/NoticeCheckInCard.tsx`

- Import `useWhoopData`
- After the user submits their mood/energy/stress, if WHOOP data is available, show a one-line comparison:
  - User reports high energy (4-5) but WHOOP recovery < 33%: "Your body may be more depleted than you feel — WHOOP recovery is low"
  - User reports low energy (1-2) but WHOOP recovery > 67%: "Your system is actually well-recovered — the low feeling may be mental"
- This creates the subjective vs objective insight the spec calls for

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/wellness/WhoopTrendsCard.tsx` — 7-day sparkline trends |
| Edit | `src/hooks/useWhoopData.ts` — add sleepTrend query |
| Edit | `src/pages/Wellness.tsx` — add WhoopTrendsCard |
| Edit | `src/components/dashboard/RechargeEngineCard.tsx` — WHOOP context hint |
| Edit | `src/components/dashboard/NoticeCheckInCard.tsx` — subjective vs objective mismatch |

