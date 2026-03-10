

# Dashboard Forecast & Quick Historical Entry

## Overview

Two features: (1) expand the forecast from "tomorrow" to snapshot/month/year projections based on actual behavioral data, and (2) add a quick-entry form for logging past days' data (backfill).

## 1. Expanded Forecast Card

Replace the single `TomorrowForecastCard` with a multi-horizon `ForecastCard` that shows three tabs: **This Snapshot** (remaining days), **This Month**, **This Year**.

### Edge Function Changes (`dashboard-intelligence`)
- Add snapshot context: query `reset_sessions` for the active session (start_date, current_day, journey_id) and `planner_items` for upcoming planned items
- Add 3 new fields to the AI tool schema:
  - `snapshot_forecast`: string — projection for remaining snapshot days based on current trajectory
  - `month_forecast`: string — projection for the current month
  - `year_forecast`: string — high-level trajectory projection for the year
- Update the system prompt to instruct the AI to generate these forecasts grounded in completion rates, ring patterns, and planner data

### Frontend Changes
- **New component**: `src/components/dashboard/ForecastCard.tsx` — replaces `TomorrowForecastCard`. Uses tabs (Snapshot / Month / Year) to display the three forecasts plus the existing tomorrow_forecast
- **Update** `useDashboardIntelligence.ts` — extend `DashboardIntelligence` interface with the 3 new fields
- **Update** `CommandModeView.tsx` — swap `TomorrowForecastCard` for `ForecastCard`

## 2. Quick Historical Entry

A sheet/drawer that lets users backfill rings for past dates. Useful for users who missed logging or want to record data retroactively.

### Frontend
- **New component**: `src/components/dashboard/QuickHistoryEntry.tsx`
  - Date picker (defaults to yesterday, max = today - 1, min = snapshot start)
  - Toggle switches for each of the 5 rings (Notice, Choose, Prove, Charge, Align)
  - Optional notes field
  - "Save" upserts into `daily_rings` for that date
- **Update** `CommandModeView.tsx` — add a "Log Past Day" button in the quick-access row that opens the sheet

### Data
- Uses existing `daily_rings` table — upsert by `user_id` + `ring_date` (the table already has these columns)
- No schema changes needed

## Files to change

| File | Change |
|------|--------|
| `supabase/functions/dashboard-intelligence/index.ts` | Add snapshot/planner context queries; add 3 forecast fields to AI tool schema |
| `src/hooks/useDashboardIntelligence.ts` | Extend interface with `snapshot_forecast`, `month_forecast`, `year_forecast` |
| `src/components/dashboard/ForecastCard.tsx` | New — multi-tab forecast card replacing TomorrowForecastCard |
| `src/components/dashboard/QuickHistoryEntry.tsx` | New — sheet for backfilling past ring data |
| `src/components/dashboard/CommandModeView.tsx` | Swap forecast card, add "Log Past Day" button |
| `src/components/dashboard/TomorrowForecastCard.tsx` | Delete (replaced by ForecastCard) |

