

# Phase 2: Cross-System Daily Briefing Engine

## Current State
- `DailyBriefingCard` displays 3 free-form AI text lines — no structure, no day type label, no clear separation of interpretation/focus/watchout
- `ai-briefing` edge function already gathers: recovery, planner items, calendar shape, meal plan, WHOOP, build data, controllable levels — rich context but unstructured output
- `TodayReadinessBar` shows day type + interpretation line (body + calendar) — good but separate from the briefing
- No growth rings context sent to briefing
- No money pressure context sent to briefing
- Briefing cached in `daily_briefings` table (content is a string)

## What to Build

### 1. Upgrade `ai-briefing` Edge Function — Structured Output
**File**: `supabase/functions/ai-briefing/index.ts`

Add two new data fetches:
- **Rings**: query `daily_ring_completions` for today to get completed ring count (0-5)
- **Money**: query `bills_subscriptions` for bills due within 3 days + any budget overspend from `budget_buckets`

Update the system prompt to produce **structured JSON** instead of 3 free-form lines:
```json
{
  "day_type": "Heavy Day",
  "interpretation": "Recovery is low and your afternoon is packed with meetings.",
  "focus": "Protect energy before noon and complete your main proof action early.",
  "watchout": "No dinner planned — pick something simple now to avoid decision fatigue tonight."
}
```

Day type labels to use: Recovery Day, Focus Day, Heavy Day, Reset Day, Fragmented Day, Momentum Day, Protected Day, Catch-Up Day.

Add prompt rules for cross-system synthesis:
- If rings completed > 3: acknowledge momentum
- If 0 rings completed and it's afternoon: nudge one small action
- If bills due soon + heavy day: note spending pressure
- If meal plan exists + strong recovery: acknowledge alignment

Cache the full JSON string in `daily_briefings.content`.

### 2. Redesign `DailyBriefingCard` — Structured Display
**File**: `src/components/dashboard/DailyBriefingCard.tsx`

Parse the briefing content as JSON (with fallback to old text format for cached briefings).

New UI structure:
- **Day type badge** at top (colored chip: "Focus Day", "Heavy Day", etc.)
- **Main interpretation** — primary text line
- **Recommended focus** — slightly smaller, with a subtle icon
- **Watchout/support note** — muted text with caution styling

Keep the refresh button, context grounding line, and free/paid gating.

### 3. Enhance Home.tsx — Pass Rings + Money Context
**File**: `src/pages/Home.tsx`

Pass `ringsCompleted` count to the briefing card's context grounding line. The actual data goes server-side (edge function fetches it), but the grounding line should show "Based on 42% recovery + 3 meetings + 2/5 rings".

## Files to Modify
| File | Change |
|---|---|
| `supabase/functions/ai-briefing/index.ts` | Add rings + money queries, structured JSON output prompt, cross-system synthesis rules |
| `src/components/dashboard/DailyBriefingCard.tsx` | Parse structured JSON, new UI with day type badge + interpretation + focus + watchout |
| `src/pages/Home.tsx` | Pass rings completed count to DailyBriefingCard context line |

## What Does NOT Change
- No database migrations — `daily_briefings.content` already stores string (JSON string works)
- `TodayReadinessBar` stays as-is — it provides the instant client-side read; briefing provides the AI synthesis
- All existing context gathering in `ai-briefing` preserved
- Caching logic preserved
- Entitlement gating preserved

