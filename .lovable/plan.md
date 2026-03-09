

# Passive Capture Layer — System Intelligence (v1.9.0)

## Overview

Build a background intelligence system that derives behavioral observations from existing user activity. The system learns passively, surfaces insights only when actionable, and allows users to confirm or dismiss inferences.

## Data Model

### Table: `user_observations`
Stores derived behavioral patterns with lifecycle tracking.

```sql
CREATE TABLE public.user_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  observation_type TEXT NOT NULL,
  -- Types: task_slippage, focus_window, sleep_energy_correlation, meal_consistency,
  -- planner_trend, promise_followthrough, circle_pattern, season_momentum, money_stress
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,           -- planner, wellness, meals, promises, etc.
  confidence NUMERIC(3,2) DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, dismissed
  supporting_refs JSONB DEFAULT '[]',     -- [{table, id, context}]
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  occurrences INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: user CRUD own observations
-- Index on (user_id, observation_type, status)
```

### Table: `user_preferences_inferred`
Stores stable learned preferences for planning/recovery optimization.

```sql
CREATE TABLE public.user_preferences_inferred (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preference_key TEXT NOT NULL,
  -- Keys: best_focus_time, preferred_routine_density, low_energy_tendency,
  -- overload_threshold, meal_timing_pattern, sleep_recovery_window
  preference_value JSONB NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  source_observations JSONB DEFAULT '[]', -- observation IDs that support this
  first_derived_at TIMESTAMPTZ DEFAULT now(),
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

-- RLS: user read/update own preferences
```

## Edge Function: `derive-observations`

Background function (invokeable by Operator Console, scheduled daily, or on-demand).

**Process:**
1. Gather last 30 days of user activity across all sources
2. Run pattern detection algorithms (rule-based with optional AI enhancement)
3. Upsert observations (increment occurrences, update last_seen_at)
4. Update inferred preferences when patterns reach high confidence

**Pattern Detection Rules:**

| Pattern | Source Tables | Detection Logic |
|---------|---------------|-----------------|
| Task slippage | `planner_items` | Same task rescheduled 3+ times |
| Best focus window | `planner_items` | Completion rate by time-of-day |
| Sleep-energy correlation | `wellness_logs`, `health_sync_data` | Low sleep → low ratings pattern |
| Meal consistency | `meal_logs` | Logging gaps, irregular timing |
| Planner completion trend | `planner_items` | Weekly completion % delta |
| Promise follow-through | `integrity_logs` | % kept vs broken over 30d |
| Circle patterns | `challenge_progress` | Show-up consistency |
| Season momentum | `reset_sessions`, `daily_resets` | Streak length, gap frequency |
| Money stress signals | `recurring_bills`, `transactions` | Overdue bills, budget overruns |

**Output:** Returns array of new/updated observations for immediate UI display.

## Hook: `src/hooks/useObservations.ts`

```typescript
interface Observation {
  id: string;
  observation_type: string;
  title: string;
  description: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'dismissed';
  occurrences: number;
  first_seen_at: string;
}

useObservations(userId) → {
  observations: Observation[],
  pendingObservations: Observation[], // high-value, surfaceable
  confirmedObservations: Observation[],
  inferredPreferences: Record<string, any>,
  confirmObservation(id),
  dismissObservation(id),
  isLoading, error
}
```

## UI Components

### 1. `ObservationCard.tsx`
A small, dismissible card for surfacing high-value observations.

- Shows when confidence > 0.7 and occurrences >= 3
- "The system noticed..." prefix
- One-tap confirm (✓) or dismiss (×)
- Links to relevant module (e.g., "View Planner trends")

### 2. Settings Section: `ObservationsSettingsCard.tsx`
Added to ProfileSettingsModal:

- Section: "What the System Learns"
- Lists observation types with toggle to enable/disable each
- "View inferred preferences" expandable section
- Clear explanation: "The app learns from your patterns to improve suggestions. No data is shared."

### 3. Dashboard Integration

`OperatorConsole` will read from `user_observations` and `user_preferences_inferred` to:
- Personalize recommendations (use inferred best_focus_time)
- Surface "The system noticed..." cards in warnings array
- Ground rationale in observed patterns

## Integration Points

### Operator Console Enhancement
Update `operator-console` edge function to:
1. Query `user_preferences_inferred` for learned preferences
2. Include high-confidence observations in rationale
3. Surface pending observations as optional warnings

### Planner Enhancement
Planner can use `best_focus_time` preference to suggest optimal scheduling.

### Observation Derivation Triggers
- Daily via scheduled cron (future)
- On-demand when Operator Console is loaded (first request of day)
- After significant activity (Snapshot completion, 5+ planner items completed)

## Files Summary

| Action | Path |
|--------|------|
| Migration | `supabase/migrations/..._passive_capture.sql` |
| Create | `supabase/functions/derive-observations/index.ts` |
| Create | `src/hooks/useObservations.ts` |
| Create | `src/components/dashboard/ObservationCard.tsx` |
| Create | `src/components/settings/ObservationsSettingsCard.tsx` |
| Edit | `src/components/ProfileSettingsModal.tsx` — add observations settings |
| Edit | `supabase/functions/operator-console/index.ts` — integrate observations |
| Edit | `src/lib/version.ts` — bump to 1.9.0 |
| Edit | `src/components/WhatsNewModal.tsx` — v1.9.0 entry |

## Privacy & Consent

- All observations are user-specific, never cross-user aggregated
- Users can view, confirm, or dismiss any observation
- Settings section explains what is inferred and provides control
- No external sharing — data stays in user's row

## Acceptance Criteria

1. System derives observations from existing activity without user input
2. Observations improve Operator Console recommendations
3. Users can inspect and dismiss incorrect inferences in Settings
4. "The system noticed..." cards appear only when actionable
5. Confirm/dismiss is one-tap, optional

