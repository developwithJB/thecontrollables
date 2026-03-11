

# Phase 2: Calendar Intelligence Layer

## Current State
- **Planner items** have `start_time`, `end_time`, `item_type` (task/time_block/routine_instance/external_event) — enough to derive meeting density, focus gaps, and context-switching load
- **TodayReadinessBar** already shows planner count + body state interpretation — uses `plannerCount` as a simple number
- **PlannerBodyContext** shows recovery-aware tips — no calendar shape awareness
- **GrowthBodyInsight** uses wearable data only — no schedule context
- **GroceryRhythmCard** has meal count — no calendar load context
- **AI Briefing** sends `todayPlannerRes.data.length` — just a count, no time structure
- **Dashboard Intelligence** sends `plannerItems` as title/status — no time-based analysis

## What to Build

### 1. Calendar Intelligence Utility (`src/lib/calendarIntelligence.ts`)
Pure function library that takes today's `PlannerItem[]` and produces structured signals. All downstream components use this single source of truth.

**Inputs**: array of PlannerItem with start_time/end_time  
**Outputs**:
```typescript
interface CalendarIntelligence {
  dayType: "heavy" | "light" | "focus" | "fragmented" | "recovery_window" | "admin_heavy" | "moderate";
  meetingCount: number;
  meetingMinutes: number;
  focusBlocks: { start: string; end: string; minutes: number }[];
  longestFocusBlock: number; // minutes
  contextSwitches: number;
  overloadedPeriod: "morning" | "afternoon" | "evening" | null;
  interpretation: string; // human-readable summary
  plannerTip: string; // actionable recommendation
}
```

Rules (all client-side):
- Meetings = items with both start_time and end_time (external_event or time_block)
- Focus blocks = gaps ≥ 45 min between meetings
- Context switches = number of meeting-to-meeting transitions with < 15 min gap
- Fragmented = 4+ context switches
- Heavy = 4+ hours of meetings
- Overloaded period = AM/PM half with > 60% of meetings
- Focus day = < 2 meetings, longest focus block > 2h

### 2. Enhance PlannerBodyContext — Add Calendar Shape
**File**: `src/components/planner/PlannerBodyContext.tsx`

Add `calendarIntel` as optional prop. Combine body + calendar into a single tip:
- Low recovery + heavy day → "Low recovery on a packed day — cut what you can and protect breaks."
- Strong recovery + focus day → "Strong readiness + open schedule — ideal for deep work."
- Fragmented day → "High context-switching risk today — batch similar tasks."
- Overloaded afternoon → "Afternoon is dense with meetings — front-load focus work."

### 3. New Component: `PlannerDayLoadSummary`
**File**: `src/components/planner/PlannerDayLoadSummary.tsx`

Compact card at top of PlannerDayView showing:
- Day type badge (Heavy / Light / Focus / Fragmented)
- Meeting count + total meeting time
- Best focus window
- Overload warning if applicable

Only renders when the day has timed items.

### 4. Enhance TodayReadinessBar — Calendar Intelligence
**File**: `src/components/dashboard/TodayReadinessBar.tsx`

Add `calendarIntel` optional prop. Enhance interpretation to include calendar shape:
- Current: "Low recovery + packed day — protect energy early"
- New: "Low recovery + fragmented afternoon — protect morning for focus work"

Replace raw "X items" with day type + meeting count when calendar intel is available.

### 5. Enhance GrowthBodyInsight — Calendar Context  
**File**: `src/components/dashboard/GrowthBodyInsight.tsx`

Add `calendarIntel` optional prop. Add calendar-aware growth insight rules:
- Heavy schedule day → "Dense schedule today — keep growth actions small and achievable"
- Fragmented day → "High context-switching may reduce reflection quality — find one quiet moment"

### 6. Enhance GroceryRhythmCard — Calendar Pattern
**File**: `src/components/money/GroceryRhythmCard.tsx`

Add `plannerCount` optional prop. When plannerCount > 6 and meals < 3:
- "Heavy schedule + few meals planned — convenience spending risk is higher"

### 7. AI Briefing — Calendar Shape Context
**File**: `supabase/functions/ai-briefing/index.ts`

Enhance today's planner query to include `start_time, end_time, item_type`. Compute meeting count, total meeting minutes, and focus availability server-side. Add to context:
- "Today's schedule: X meetings (Yh Zm total), longest focus block: Ah Bm, day type: Heavy/Focus/etc."

Add prompt rule: "If calendar shape is provided, reference schedule pressure and focus availability in your readiness read."

### 8. Dashboard Intelligence — Calendar in Forecasts
**File**: `supabase/functions/dashboard-intelligence/index.ts`

Same enhancement: compute meeting density from planner items (which are already fetched). Add to contextPrompt:
- "Calendar load today: X meetings, Y total meeting hours, Z context switches"

Add prompt rule: "If calendar load is heavy, factor schedule pressure into energy_trend and recommended_actions."

## Files to Create
| File | Purpose |
|---|---|
| `src/lib/calendarIntelligence.ts` | Pure utility: derive calendar signals from planner items |
| `src/components/planner/PlannerDayLoadSummary.tsx` | Visual day load summary card for Planner |

## Files to Modify
| File | Change |
|---|---|
| `src/components/planner/PlannerBodyContext.tsx` | Accept + use calendarIntel prop |
| `src/components/dashboard/TodayReadinessBar.tsx` | Accept + use calendarIntel prop, smarter interpretation |
| `src/components/dashboard/GrowthBodyInsight.tsx` | Accept + use calendarIntel prop |
| `src/components/money/GroceryRhythmCard.tsx` | Accept plannerCount prop, calendar-aware insight |
| `src/pages/Planner.tsx` | Compute calendarIntel for selected day, pass to components, add PlannerDayLoadSummary |
| `src/pages/Home.tsx` | Compute calendarIntel from today's items, pass to TodayReadinessBar |
| `src/pages/Growth.tsx` | Compute calendarIntel, pass to GrowthBodyInsight |
| `src/pages/Money.tsx` | Pass plannerCount to GroceryRhythmCard |
| `supabase/functions/ai-briefing/index.ts` | Fetch start_time/end_time, compute calendar shape, add to context + prompt |
| `supabase/functions/dashboard-intelligence/index.ts` | Compute calendar density from existing planner data, add to context + prompt |

## What Does NOT Change
- No database migrations — planner_items already has start_time/end_time
- No new hooks — uses existing `usePlannerItems` / `useTodayPlannerItems`
- Existing body intelligence components keep working when calendarIntel is undefined
- All edge function structure preserved — just richer context

