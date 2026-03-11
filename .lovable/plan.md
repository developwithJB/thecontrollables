

# Phase 2: Weekly Review and Pattern Detection

## Current State
- **WeeklyRecapCard** (Growth page): Shows ring heatmap + completion stats + local recap text. Rings-only, no cross-system patterns.
- **WeeklyWellnessReport** (Wellness page): Shows sleep/movement/nutrition averages with week-over-week trend. Wellness-only.
- **generate-insights** edge function: 30-day behavioral insights (check-ins, promises, XP, build scores). No weekly scope, no body/calendar/money cross-referencing.
- No AI-powered weekly review exists. No pattern detection across systems.

## What to Build

### 1. New Edge Function: `generate-weekly-review`
**File**: `supabase/functions/generate-weekly-review/index.ts`

Fetches last 7 days of cross-system data:
- **Rings**: `daily_rings` — completion counts per day
- **Planner**: `planner_items` — meeting count + time blocked per day (start_time/end_time)
- **Wellness**: `wellness_logs` — sleep/movement/nutrition ratings
- **Health**: `health_sync_data` — recovery, strain, HRV
- **Meals**: `meal_plans` — days with/without meals planned
- **Money**: `recurring_bills` — bills due this week; `budget_buckets` — overspend detection

Computes summary stats server-side, then sends to AI with structured JSON output prompt:

```json
{
  "headline": "Your week in one sentence",
  "supported_by": "What worked best",
  "drained_by": "What cost the most energy",
  "strongest_system": "Plan | Body | Growth | Fuel | Money",
  "weakest_system": "Plan | Body | Growth | Fuel | Money",
  "patterns": ["pattern 1", "pattern 2"],
  "next_week": "One recommendation for next week"
}
```

Pattern detection rules in prompt:
- Low sleep before overloaded days
- Better ring completion on lighter calendar days
- Takeout risk when meals unplanned
- Low recovery after consecutive high-strain days
- Spending drift on stressful weeks

Cache result in a new row concept — use `daily_briefings` table with a sentinel date pattern (e.g., briefing_date = week-start date, controllable = 'weekly_review') to avoid a new table.

### 2. New Hook: `useWeeklyReview`
**File**: `src/hooks/useWeeklyReview.ts`

Invokes `generate-weekly-review`. Caches in React Query (staleTime: 12h). Only available Thu–Sun (enough data). Only for paid users.

### 3. Redesign WeeklyRecapCard — Cross-System Review
**File**: `src/components/dashboard/WeeklyRecapCard.tsx`

Replace the current rings-only recap with the structured AI review:
- **Headline** as primary text
- **Strongest / Weakest system** badges
- **Supported by / Drained by** rows with subtle icons
- **Patterns** as compact list (max 2–3)
- **Next week recommendation** with forward arrow
- Keep the ring heatmap as a visual anchor
- Fallback to current local-only recap when AI review unavailable (free users or < Thursday)

### 4. Add Weekly Review Entry Point to Home (Today)
**File**: `src/pages/Home.tsx`

Add a lightweight "Weekly Review" prompt card that appears Thu–Sun, linking to Growth page where the full review lives. Small card: "Your weekly review is ready →" with a week summary teaser (headline only).

### 5. Update `supabase/config.toml`
Add `verify_jwt = false` for the new function.

## Files to Create
| File | Purpose |
|---|---|
| `supabase/functions/generate-weekly-review/index.ts` | Cross-system weekly review AI generation |
| `src/hooks/useWeeklyReview.ts` | Client hook to fetch and cache weekly review |

## Files to Modify
| File | Change |
|---|---|
| `src/components/dashboard/WeeklyRecapCard.tsx` | Redesign with AI cross-system review, keep ring heatmap, add pattern display |
| `src/pages/Home.tsx` | Add lightweight weekly review prompt card (Thu–Sun) |
| `supabase/config.toml` | Add verify_jwt config for generate-weekly-review |

## What Does NOT Change
- No database migrations — reuse `daily_briefings` table for caching
- WeeklyWellnessReport on Wellness page stays as-is
- generate-insights (30-day) stays separate
- All existing ring heatmap logic preserved as fallback

