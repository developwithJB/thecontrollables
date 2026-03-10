

# Phase 2: WHOOP Data → Home AI Brief + Planner Recommendations

## What We're Building

Inject WHOOP recovery, sleep, and strain data into the two AI edge functions that power the Home page intelligence and the Planner, so recommendations become wellness-aware.

## Changes

### 1. `dashboard-intelligence` edge function — Add WHOOP context

**File:** `supabase/functions/dashboard-intelligence/index.ts`

- After the existing parallel data fetch (line 32), add a query for the latest `whoop_recoveries`, `whoop_sleeps`, and `whoop_cycles` (last 7 days) using the service role client.
- Append a WHOOP context block to `contextPrompt` (line 99) with: recovery score, HRV, resting HR, sleep performance, strain, and 7-day trends.
- Update the system prompt to instruct the AI to factor WHOOP biometrics into signals (energy_trend, stress_load, drift_risk) and recommended_actions. Add guidance like: "If recovery < 33%, flag energy risk. If sleep performance < 70%, recommend lighter load. If strain is high + recovery low, suggest recovery behaviors."

### 2. `ai-briefing` edge function — Add WHOOP context

**File:** `supabase/functions/ai-briefing/index.ts`

- After existing context gathering (line 84), fetch latest WHOOP recovery + sleep for the user via service client.
- Append WHOOP summary to `contextParts`: recovery score, sleep performance, strain.
- Update system prompt to reference WHOOP data when available: "If WHOOP data is present, weave biometric signals into your observation and suggestion. Reference recovery, sleep quality, or strain when relevant."

### 3. `generate-predictions` edge function — WHOOP-aware risk detection

**File:** `supabase/functions/generate-predictions/index.ts`

- Add WHOOP data fetch alongside existing data gathering.
- Feed WHOOP recovery/sleep/strain into the prediction rules engine so risks like `burnout_risk` and `today_drift` can factor in low recovery or poor sleep as contributing signals.

### 4. Planner wellness banner (new component)

**File:** `src/components/planner/PlannerWellnessBanner.tsx` (new)

A small banner at the top of the Planner day view that shows a one-line WHOOP-powered insight when data is available:
- Recovery < 33%: "Recovery is low — consider a lighter schedule today"
- Sleep < 70%: "Sleep was short — protect your morning focus window"  
- High strain + low recovery: "High strain detected — add recovery buffer"
- Strong recovery: "Recovery is strong — good day for deep work"

Uses `useWhoopData` hook. Falls back to nothing if WHOOP isn't connected.

### 5. Integrate banner into Planner

**File:** `src/pages/Planner.tsx`

- Import and render `PlannerWellnessBanner` above the day view content, passing the user ID.

## Files Summary

| Action | File |
|--------|------|
| Edit | `supabase/functions/dashboard-intelligence/index.ts` — fetch + inject WHOOP context |
| Edit | `supabase/functions/ai-briefing/index.ts` — fetch + inject WHOOP context |
| Edit | `supabase/functions/generate-predictions/index.ts` — WHOOP-aware risk signals |
| Create | `src/components/planner/PlannerWellnessBanner.tsx` — compact wellness insight |
| Edit | `src/pages/Planner.tsx` — add wellness banner |

