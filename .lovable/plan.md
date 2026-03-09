

# Operator Console — Structured AI Experience (v1.8.0)

## What Changes

The current AI experience is chat-first: users open a panel, pick a guide, type a message. The Operator Console flips this. Users see a structured card with today's priority, attention items, and one-tap actions. No typing required. Chat becomes a secondary "Talk it through" mode.

## Architecture

The existing `DailyOSCard` already returns structured JSON (top_three, quick_wins, blockers, fallback_plan) from the `daily-os-plan` edge function. The Operator Console builds on this pattern but adds:
- A unified recommendation engine that synthesizes signals from snapshot state, planner, money, wellness, build scores, and guide memory
- Structured response modes (Decision, Plan, Recovery, Focus, Review)
- Persistence for accepted/snoozed/dismissed suggestions
- A compact command input for natural-language shortcuts

## Database Schema

```sql
-- Operator suggestions with lifecycle tracking
CREATE TABLE public.operator_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suggestion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL, -- decision, plan, recovery, focus, review
  headline TEXT NOT NULL,
  summary TEXT,
  rationale TEXT, -- why this was recommended
  recommended_actions JSONB DEFAULT '[]', -- [{id, label, deep_link, xp_reward}]
  alternate_actions JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  confidence NUMERIC(3,2) DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, snoozed, dismissed, completed
  status_changed_at TIMESTAMPTZ,
  generated_by TEXT DEFAULT 'ai', -- ai or rules
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, suggestion_date, mode)
);
-- RLS: user CRUD own rows
```

## Edge Function: `operator-console`

Returns structured JSON, never free-form text. Accepts optional `command` parameter for natural-language shortcuts.

**Input:**
```json
{
  "command": "replan my day" | "simplify today" | "what am I missing" | "prep tomorrow" | "I feel off" | null,
  "localDate": "2026-03-09",
  "timezone": "America/New_York"
}
```

**Output:**
```json
{
  "mode": "plan",
  "headline": "Your afternoon is overloaded",
  "summary": "3 planner items overlap with a bill due today. Move the wellness log to morning.",
  "rationale": "Based on your planner having 5 items after 2pm and your Electric Bill due today",
  "recommended_actions": [
    { "id": "r1", "label": "Move wellness log to 8am", "deep_link": "/planner", "xp_reward": 5 },
    { "id": "r2", "label": "Pay Electric Bill ($120)", "deep_link": "/money", "xp_reward": 10 }
  ],
  "alternate_actions": [
    { "id": "a1", "label": "Skip wellness today", "deep_link": null }
  ],
  "warnings": ["You haven't logged meals in 3 days"],
  "fallback_if_low_energy": {
    "label": "Just do your snapshot check-in",
    "deep_link": "/reset"
  },
  "confidence": 0.82,
  "generated_by": "ai"
}
```

**Context gathering** (server-side, single function):
- Active snapshot state + current day
- Today's planner items
- Pending promises + due dates
- Bills due this week
- Wellness streak + last log
- Build scores (weakest controllable)
- Recent guide session themes
- Money: budget utilization
- Last meal log date

**Rule-based fallback** when AI unavailable:
- Prioritize by: uncompleted snapshot > overdue promises > bills due today > missed wellness > planner items
- Mode defaults to "plan"

**Command routing:**
| Command | Mode | Behavior |
|---------|------|----------|
| `replan my day` | Plan | Regenerate with current state |
| `simplify today` | Focus | Keep only top 2 items, defer rest |
| `what am I missing` | Review | Scan all modules for gaps |
| `prep tomorrow` | Plan | Generate tomorrow's plan |
| `I feel off` | Recovery | Low-energy suggestions, wellness-first |

## React Components

### `src/components/dashboard/OperatorConsole.tsx`
The primary card, replacing the AIGuidePanel position on the dashboard.

Structure:
- **Header**: "Operator" label + mode badge (Plan/Focus/Recovery/etc) + confidence dot
- **Headline**: Bold, 1-line summary of what matters now
- **Rationale**: Small text explaining why (grounded in data)
- **Recommended Actions**: Chips/buttons with deep links, one-tap to execute or navigate
- **Warnings**: Amber badges for attention items
- **Low Energy Fallback**: Single button at bottom
- **Command Input**: Compact text field with preset chip suggestions ("replan", "simplify", etc)
- **"Talk it through" link**: Opens existing AIGuidePanel in a sheet/drawer

States: loading skeleton, empty (no data yet), error (graceful message), populated.

### `src/components/dashboard/OperatorCommandInput.tsx`
Compact input with preset command chips. On submit, calls `operator-console` edge function with the command string.

### Refactored `AIGuidePanel`
Stays as-is internally but is no longer the primary surface. It's opened via a "Talk it through" button from the Operator Console or from the Guide tab.

## Hook: `src/hooks/useOperatorConsole.ts`

```typescript
useOperatorConsole(userId) → {
  suggestion, isLoading, error,
  acceptAction(actionId),
  snoozeAction(actionId),
  dismissSuggestion(),
  sendCommand(command),
  isCommandLoading
}
```

Uses React Query with 10-minute stale time (same as Daily OS). Persists interaction states to `operator_suggestions` table.

## Dashboard Integration

In `Dashboard.tsx`, the Operator Console card replaces the current position of `DailyBriefingCard` + `AIGuidePanel` at the bottom. The flow becomes:

1. **TodayActions** (checklist — unchanged)
2. **Secondary grid** (Planner, Money, Wellness, etc — unchanged)
3. **OperatorConsole** (new — replaces DailyBriefing + AIGuidePanel position)

The `DailyBriefingCard` content gets absorbed into the Operator Console headline/summary. The `AIGuidePanel` moves into a drawer triggered from the console.

The Guide tab stays unchanged (Controllable Levels, Game Rules, Manual).

## `/operator` Route

A full-screen version of the Operator Console with expanded detail:
- Full action history (today's accepted/snoozed/dismissed)
- Command history
- Link back to dashboard

Lazy-loaded in `App.tsx`.

## Telemetry

Track via existing `app_events`:
- `operator_suggestion_shown` (mode, confidence)
- `operator_action_accepted` (action_id, deep_link)
- `operator_action_snoozed`
- `operator_suggestion_dismissed`
- `operator_command_sent` (command text)
- `operator_chat_opened` (fallback to chat)

## Files Summary

| Action | Path |
|--------|------|
| Migration | `supabase/migrations/..._operator_console.sql` |
| Create | `supabase/functions/operator-console/index.ts` |
| Create | `src/hooks/useOperatorConsole.ts` |
| Create | `src/components/dashboard/OperatorConsole.tsx` |
| Create | `src/components/dashboard/OperatorCommandInput.tsx` |
| Create | `src/pages/Operator.tsx` |
| Edit | `src/pages/Dashboard.tsx` — replace DailyBriefing+AIGuidePanel with OperatorConsole |
| Edit | `src/App.tsx` — add `/operator` route |
| Edit | `src/lib/version.ts` — bump to 1.8.0 |
| Edit | `src/components/WhatsNewModal.tsx` — v1.8.0 entry |
| Edit | `README.md` — document Operator Console |

## Design Rules

- No placeholder or "coming soon" UI
- Every action chip navigates or performs a real action
- Rule-based fallback always works even if AI is down
- Operator Console never blocks dashboard load (independent query)
- Chat mode is one tap away but never the default view

