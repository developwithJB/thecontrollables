

# Today Page Optimization — Plan + Body = Today

The current Today page structure (Greeting → Briefing → Actions → PvA → Rings → Forecast → Ask) is already close. The changes focus on making each module higher-signal and improving the PvA hero treatment.

## Changes

### 1. New `TodayReadinessBar` Component
Create a new lightweight component that sits between the Greeting and the Briefing card. This is a single horizontal bar showing today's key signals at a glance — answering "How am I today?" in 2 seconds:

```
Recovery: 72%  |  Sleep: 7h 12m  |  Plan: 6 items  |  Day type: Moderate
```

- Sources: `useHealthData` (latest metrics) + planner items count for today
- If no wearable: show only plan load + a subtle "Connect wearable" chip
- If no calendar: show only body data + a subtle "Connect calendar" chip  
- If both missing: show a gentle "Connect Plan + Body to unlock your daily read"
- This replaces the need for cross-system insight cards — the bar IS the cross-system insight

### 2. Upgrade `DailyBriefingCard`
The existing briefing already uses Plan + Body context from the edge function. Enhance the **client-side card** to:
- Show a compact context line above the briefing text: e.g. "Based on 72% recovery + 6 planned items"
- Pass `healthLatest` and `todayPlannerCount` as props so the card can render context even before the AI briefing loads
- This makes the briefing feel grounded in real data, not just AI text

### 3. Elevate `PlanVsActualView` as Hero Module
Current behavior requires BOTH sources. Fix:
- In `Home.tsx`, change `hasPvaData` logic: show PvA whenever calendar data OR wearable data exists (currently requires items AND health)
- Inside PvA, when one source is missing, show a subtle inline prompt ("Connect your wearable to complete the picture") instead of blocking the whole module
- Add a small section header above PvA: "Plan vs. Actual" with a subtitle "What was planned · What your body says · What it means"

### 4. Simplify `ForecastCard`
Current card has 3 tabs (Snapshot/Month/Year). Simplify to show only the most relevant forecast inline — no tabs needed on Today:
- Show `snapshot_forecast` (or `tomorrow_forecast`) as the primary text
- Add a single secondary line for "watchout" from `month_forecast` if available
- Remove the tab UI on the Today page (keep the full tabbed version on Growth if needed)
- This makes it scannable in 3 seconds instead of requiring tab interaction

### 5. Reorder: Rings Below PvA
Already in the correct position per the last refactor. No change needed — just confirming Rings stay as a supplementary row below PvA, not a hero.

### 6. `GreetingBanner` Cleanup
The greeting currently shows: streak, XP level, Build Level, Season, Snapshot Focus, and a Weekly Insight expander. Simplify:
- Remove the `Weekly Insight` expander (AI insight belongs in Briefing, not the greeting)
- Remove `Build Level` badge (belongs on Growth)
- Keep: greeting + name, streak, season indicator, snapshot focus
- This makes the greeting a quick identity bar, not a mini-dashboard

### 7. `AskDashboardBar` — Minor Polish
Keep as-is but add one more contextual chip: "What should I protect today?" — the most common synthesis question.

## Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/TodayReadinessBar.tsx` | **NEW** — horizontal signal bar (recovery, sleep, plan load, day type) |
| `src/pages/Home.tsx` | Add TodayReadinessBar after greeting, pass health/planner data. Fix `hasPvaData` logic to show with either source. Add PvA section header. |
| `src/components/dashboard/DailyBriefingCard.tsx` | Add optional `healthContext` and `plannerCount` props to show "Based on X% recovery + Y items" context line |
| `src/components/dashboard/ForecastCard.tsx` | Create a `compact` prop variant — single forecast text + one watchout line, no tabs |
| `src/components/dashboard/GreetingBanner.tsx` | Remove Weekly Insight expander, remove Build Level badge |
| `src/components/dashboard/AskDashboardBar.tsx` | Add "What should I protect today?" chip |

## What Does NOT Change
- All hooks, data, and backend logic stay the same
- Edge function `ai-briefing` already gathers Plan + Body context — no changes needed
- TodayActions carousel stays in position 3
- All dialogs (ConfirmLastNight, ValidatePlan, etc.) stay as modal overlays
- CompactRingsRow stays as supplementary row

