

# Phase 2 Wearable Intelligence Layer

## Current State
- **Body page**: Shows raw `WearableSummaryCard` (numbers only) + `WearableTrendsCard` (sparklines). No interpretation or guidance.
- **Today page**: `TodayReadinessBar` shows recovery/sleep numbers but no interpretation. `DailyBriefingCard` gets wearable data server-side but the client doesn't show body-state interpretation beyond the AI text.
- **Plan page**: Has `useHealthData` import but only uses it for PvA overlay. No recovery-aware planning recommendations.
- **Growth page**: No wearable data used at all.
- **AI Briefing edge function**: Already fetches WHOOP data + health_sync_data and includes in prompts. Already solid.
- **Dashboard Intelligence edge function**: Fetches health data for synthesis but doesn't produce body-state interpretations.
- **`useHealthData` hook**: Returns `latest` + `trend` (7 days) — this is the foundation.

## What to Build

### 1. New Component: `BodyReadinessCard` — Body Page Interpretation Layer
**File:** `src/components/wellness/BodyReadinessCard.tsx`

A card that sits between `WearableSummaryCard` and `WearableTrendsCard` on the Body page. It takes `useHealthData` output and produces:

- **Readiness headline**: e.g., "Your body is undercharged today" / "Strong recovery — good day for effort"
- **Recovery interpretation**: "Recovery is low at 42%. Prioritize energy protection."
- **Sleep interpretation**: "6h 12m sleep — below your 7-day average of 7h 20m"
- **Strain interpretation**: "Strain has been elevated for 3 days. Recovery behaviors matter tonight."
- **Body recommendation**: One actionable line based on the combination

All logic is client-side, rule-based (no AI call needed):
- Recovery >= 67: "Strong recovery"
- Recovery 34-66: "Moderate recovery"  
- Recovery < 34: "Low recovery"
- Sleep trend declining (avg last 3 < avg last 7): "Sleep debt building"
- Strain elevated 3+ consecutive days above 14: "Elevated strain pattern"

### 2. New Component: `BodyStateGuidance` — Subjective vs Objective
**File:** `src/components/wellness/BodyStateGuidance.tsx`

Compact card on Body page that compares the user's latest manual wellness log (from `wellness_logs`) with wearable data. Shows:
- "You reported high energy, but recovery is low — your body may need more than you feel"
- "Your body and self-report are aligned today"
- "Your body looks more recovered than you feel"

Query: latest `wellness_logs` entry for today vs `useHealthData.latest`.

### 3. Upgrade Body Page (`src/pages/Wellness.tsx`)
Insert `BodyReadinessCard` after `WearableSummaryCard` and `BodyStateGuidance` after that, before `WearableTrendsCard`. Only render when wearable is connected.

### 4. New Component: `PlannerBodyContext` — Planner Recovery Recommendation
**File:** `src/components/planner/PlannerBodyContext.tsx`

Small banner at the top of PlannerDayView (when wearable is connected) showing a single recovery-aware planning tip:
- Low recovery: "Low recovery today — reduce overload and add buffer time"
- Poor sleep: "Short sleep — consider moving deep work earlier"
- Strong readiness: "Strong readiness — good day for focused blocks"
- Elevated strain: "Elevated strain — consider lighter effort windows"

### 5. Add PlannerBodyContext to Planner (`src/pages/Planner.tsx`)
Pass `useHealthData` latest to the day view area. Render `PlannerBodyContext` above the day items when `isToday(selectedDate)` and wearable is connected.

### 6. New Component: `GrowthBodyInsight` — Growth Page Supporting Layer  
**File:** `src/components/dashboard/GrowthBodyInsight.tsx`

Compact card on Growth page showing one body-aware growth insight:
- Compare latest Notice check-in energy (from `wellness_logs` or `circuit_checks`) with wearable recovery
- Show pattern insights: "Your best Growth days tend to follow stronger sleep" (derived from 7-day trend)
- Support Charge ring with passive body data context

### 7. Add GrowthBodyInsight to Growth Page (`src/pages/Growth.tsx`)
Import `useHealthData`, render `GrowthBodyInsight` after `DailyRings` when wearable is connected.

### 8. Enhance TodayReadinessBar — Add Interpretation
**File:** `src/components/dashboard/TodayReadinessBar.tsx`

Add a second line below the metrics row: a single interpretation sentence using the same rule-based logic as `BodyReadinessCard`. Examples:
- "Low recovery + packed day — protect energy early"
- "Strong sleep + moderate load — good day for focused work"

This turns the readiness bar from data display into data interpretation.

## Files to Create
| File | Purpose |
|---|---|
| `src/components/wellness/BodyReadinessCard.tsx` | Body page: interpret recovery, sleep, strain into guidance |
| `src/components/wellness/BodyStateGuidance.tsx` | Body page: subjective vs objective comparison |
| `src/components/planner/PlannerBodyContext.tsx` | Planner: recovery-aware planning tip |
| `src/components/dashboard/GrowthBodyInsight.tsx` | Growth: body-aware growth insight |

## Files to Modify
| File | Change |
|---|---|
| `src/pages/Wellness.tsx` | Add BodyReadinessCard + BodyStateGuidance after WearableSummaryCard |
| `src/pages/Planner.tsx` | Add PlannerBodyContext above day items for today |
| `src/pages/Growth.tsx` | Import useHealthData, add GrowthBodyInsight after DailyRings |
| `src/components/dashboard/TodayReadinessBar.tsx` | Add interpretation line below metrics |

## What Does NOT Change
- No database changes — all interpretation is client-side rule-based using existing `health_sync_data`
- No edge function changes — AI briefing already uses wearable data well
- `useHealthData` hook stays the same — it already provides everything needed
- `WearableSummaryCard` and `WearableTrendsCard` stay as-is (numbers + sparklines)
- All entitlement gating stays the same

