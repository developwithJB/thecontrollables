

# AI-Forward Dashboard Upgrade Plan

## Summary
Transform the completed-state dashboard from a static progress tracker into an intelligent, AI-native operating system. The rings remain the visual hero; intelligence wraps around them through modular cards, signal pills, a command bar, and smarter copy.

## Architecture Overview

The existing codebase already has strong infrastructure to build on:
- `generate-insights` edge function (AI-powered, uses Lovable AI gateway)
- `usePredictions` hook + `PredictionCard` component (forecasts already exist)
- `useObservations` hook + `ObservationCard` (passive pattern detection exists)
- `AIChat` component with streaming via `ai-chat` edge function
- `DailyRecapCard` (to be replaced with the new AI Insight Card)
- `useDailyRings` with `completeRing`, `completedCount`, ring responses

The upgrade reuses and extends these existing systems rather than rebuilding.

## New Edge Function

### `dashboard-intelligence` (new)
Single edge function that returns a structured AI analysis for the completed-state dashboard. Called once when all 5 rings are filled (or 3+). Uses Lovable AI (gemini-3-flash-preview) with tool calling to return structured output:

```json
{
  "pattern_detected": "Habit and Environment were your strongest stabilizers today.",
  "why_it_matters": "Your consistency is reinforced by structure, not just motivation.",
  "best_next_move": "Lock in tomorrow's first proof action before bed.",
  "tomorrow_forecast": "Momentum looks strong, but delayed recovery could lower energy early.",
  "signals": {
    "energy_trend": { "label": "Stable", "direction": "up" },
    "confidence_signal": { "label": "High", "direction": "up" },
    "stress_load": { "label": "Low", "direction": "neutral" },
    "drift_risk": { "label": "Low", "direction": "down" },
    "strongest_today": "Habit",
    "most_neglected_week": "Environment"
  },
  "why_fully_charged": [
    "You completed all 5 rings",
    "Your strongest momentum driver was follow-through",
    "Time intentionality was above baseline"
  ],
  "recommended_actions": [
    { "text": "Plan tomorrow's proof action", "ring": "prove" },
    { "text": "Review what gave you energy", "ring": "charge" },
    { "text": "Build a better morning setup", "ring": "align" }
  ],
  "memory_comparisons": [
    "This is your third Fully Charged day in the last 7",
    "Habit is consistently your strongest controllable"
  ],
  "center_rotations": [
    "Fully Charged",
    "Strongest Signal: Habit",
    "Drift Risk Tomorrow: Low",
    "Best Next Move: Recharge early"
  ]
}
```

The function gathers today's ring data, recent daily_rings history (7 days), observations, predictions, wellness logs, and build scores — then sends it all to the AI with a structured tool-calling schema.

## New Frontend Components

### 1. `AIInsightCard` (replaces `DailyRecapCard` in completed state)
- Premium card with subtle glow, pulse icon, "Generated from today's signals" footer
- 4 scannable sections: Pattern Detected, Why It Matters, Best Next Move, Tomorrow Forecast
- Each section has a label + short text, not paragraphs
- Refresh button to regenerate
- Shown when `completedCount >= 3`

### 2. `AISignalsRow`
- Horizontal scrollable row of compact signal pills
- 6 signals: Energy Trend, Confidence Signal, Stress Load, Drift Risk, Strongest Today, Most Neglected This Week
- Each pill: icon + label + value + directional indicator (up/down/neutral arrow)
- Subtle system-monitor aesthetic with muted borders and gentle glow on active signals

### 3. `TomorrowForecastCard`
- Compact predictive card shown in completed state
- Fields: Momentum level, Main risk, Best first action, Priority ring for tomorrow
- Uses data from the `dashboard-intelligence` response
- Can also incorporate existing `usePredictions` data as fallback

### 4. `AskDashboardBar`
- Sticky or inline command bar: "Ask your Dashboard..."
- Suggestion chips: "Explain today", "Forecast tomorrow", "Find weak point", "Coach me now"
- Tapping a chip or typing opens the existing `AIChat` component in a drawer, pre-seeded with that prompt
- Wired into existing `ai-chat` edge function — no new AI orchestration needed

### 5. `WhyFullyChargedCard`
- Small explanation card listing 3-4 bullet reasons for reaching Fully Charged
- Uses `why_fully_charged` from the intelligence response
- Only shown when `completedCount === 5`

### 6. `SmartCenterState` (upgrade to ring center)
- When `completedCount === 5`, the center `5/5` text rotates through smart labels every 4 seconds
- Labels from `center_rotations` in the intelligence response
- Tapping expands a mini AI summary overlay
- Uses `AnimatePresence` for smooth text transitions

### 7. `AIRecommendedActions` (replaces static Quick Access)
- Dynamic action buttons derived from `recommended_actions`
- Each shows: action text + associated ring color dot
- Falls back to existing Planner/Build/IG Proof buttons if no AI data available

### 8. `MemoryComparisonRow`
- Small section with 2-3 comparison insights from `memory_comparisons`
- Each line prefixed with a subtle dot indicator
- Copy style: "This is your third Fully Charged day in the last 7"

## Hook

### `useDashboardIntelligence(userId, completedCount, rings)`
- Calls `dashboard-intelligence` edge function when `completedCount >= 3`
- Caches response for the day (staleTime: 30 minutes)
- Returns: `{ data, isLoading, refresh }`
- All new components consume this single hook

## Changes to Existing Files

### `DailyRings.tsx`
- Replace `DailyRecapCard` with `AIInsightCard` when completed state
- Add `SmartCenterState` to the ring center (replace static `5/5` display when fully charged)
- Add `AISignalsRow` below rings
- Add `WhyFullyChargedCard` in fully charged state
- Add `MemoryComparisonRow` after the fully charged message

### `CommandModeView.tsx`
- Add `AskDashboardBar` below rings
- Replace static Quick Access buttons with `AIRecommendedActions`
- Add `TomorrowForecastCard` after the weekly review

## Copy Direction
All new components use system-intelligence language:
- "Pattern detected", "Emerging signal", "Primary driver"
- "Likely bottleneck", "Recommended intervention", "Forecast"
- "Generated from today's signals", "System load"
- Footer on AI cards: `text-[10px] text-muted-foreground/50`

## Design Direction
- Subtle `bg-gradient-to-br from-accent/5 to-transparent` on intelligence cards
- `backdrop-blur-sm` on signal pills
- Gentle pulse animation on the AI icon when data is fresh
- No sci-fi aesthetics — premium, calm, dark-mode native
- All cards use existing `rounded-xl border bg-card shadow-sm` pattern

## File Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/dashboard-intelligence/index.ts` |
| Create | `src/hooks/useDashboardIntelligence.ts` |
| Create | `src/components/dashboard/AIInsightCard.tsx` |
| Create | `src/components/dashboard/AISignalsRow.tsx` |
| Create | `src/components/dashboard/TomorrowForecastCard.tsx` |
| Create | `src/components/dashboard/AskDashboardBar.tsx` |
| Create | `src/components/dashboard/WhyFullyChargedCard.tsx` |
| Create | `src/components/dashboard/SmartCenterState.tsx` |
| Create | `src/components/dashboard/AIRecommendedActions.tsx` |
| Create | `src/components/dashboard/MemoryComparisonRow.tsx` |
| Edit | `src/components/dashboard/DailyRings.tsx` — integrate new components |
| Edit | `src/components/dashboard/CommandModeView.tsx` — add command bar + recommended actions |

## Implementation Order
1. Edge function `dashboard-intelligence` + hook `useDashboardIntelligence`
2. `AIInsightCard` + `AISignalsRow` + `TomorrowForecastCard` (Phase 1 core)
3. `AIRecommendedActions` replacing static Quick Access (Phase 1)
4. `AskDashboardBar` wired to existing AI chat (Phase 2)
5. `WhyFullyChargedCard` + `MemoryComparisonRow` (Phase 2)
6. `SmartCenterState` ring center upgrade (Phase 2)

