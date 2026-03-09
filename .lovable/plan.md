

## Plan: Daily OS Card — Command Center for the Day

Replace the existing `DailyBriefingCard` (motivational 3-liner) with a structured **DailyOSCard** that acts as the user's daily operating panel. Add a new edge function that returns structured JSON, a persistence table for user interactions (mark done, snooze, dismiss), and a deterministic fallback for free/offline users.

---

### Phase 1: Database

**New table: `daily_os_plans`** — Stores the generated plan per user/day with interaction state.

```sql
CREATE TABLE public.daily_os_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '{}',
  -- plan_data schema: {
  --   top_three: [{id, title, reason, source, deep_link, status}],
  --   suggested_time_blocks: [{title, start, end, energy, source}],
  --   quick_wins: [{id, title, action_link, reason}],
  --   blockers_or_risks: [{text, reason}],
  --   fallback_plan: {title, description},
  --   why_today: string,
  --   generated_by: "ai" | "rules"
  -- }
  interactions JSONB NOT NULL DEFAULT '{}',
  -- interactions: { "<item_id>": "done"|"snoozed"|"dismissed" }
  refresh_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date)
);

ALTER TABLE public.daily_os_plans ENABLE ROW LEVEL SECURITY;
-- Standard user CRUD policies on own rows
```

---

### Phase 2: Edge Function — `daily-os-plan`

New edge function that gathers context from existing tables and returns structured JSON.

**Data gathered** (all via service role, same pattern as `dashboard-summary`):
- Active Snapshot (day, journey, controllable)
- Today's planner items (from `planner_items`)
- Pending promises (from `integrity_logs`)
- Wellness streak + today's log status
- Build scores (weakest controllable)
- Meal plan status
- Circle membership
- Season status
- Recent completed actions (last 3 days)

**Two generation paths:**

1. **AI path** (paid users): Send context to `google/gemini-2.5-flash-lite`, get structured JSON matching the schema above. System prompt enforces JSON output with reason codes.

2. **Rules path** (free users or AI failure): Deterministic prioritization:
   - Priority 1: Incomplete Snapshot check-in
   - Priority 2: Pending promises due today
   - Priority 3: First planner task of the day
   - Quick wins: Log wellness, reflect on yesterday, ask The Controllables
   - Fallback: "Low battery mode — just log wellness and one promise review"
   - Why today: Generated from Build weakest area + streak status

**Caching**: Check `daily_os_plans` first. Only regenerate if no row exists for today OR user explicitly requests refresh (with max 3 refreshes/day).

**Response shape:**
```json
{
  "plan": { ...structured plan... },
  "cached": true|false,
  "generated_by": "ai"|"rules"
}
```

---

### Phase 3: React Hook — `useDailyOS`

**`src/hooks/useDailyOS.ts`**
- `useDailyOSPlan(userId)` — React Query hook fetching today's plan
- `useUpdateDailyOSInteraction()` — Mutation to mark items done/snoozed/dismissed (updates `interactions` JSONB in `daily_os_plans`)
- `useRefreshDailyOS()` — Mutation to regenerate (increments `refresh_count`, max 3)

Interactions update locally via optimistic updates and persist to the `daily_os_plans.interactions` column.

---

### Phase 4: UI — `DailyOSCard` Component

**`src/components/dashboard/DailyOSCard.tsx`** — Replaces `DailyBriefingCard`.

**Layout (mobile-first):**

1. **Header**: "Daily OS" + date + refresh button (shows count remaining)

2. **Top 3 Priorities**: Numbered list with:
   - Status indicator (todo/done/snoozed)
   - Title + source badge (Snapshot, Planner, Promise)
   - Complete button (checkmark) and snooze button (clock icon)
   - Reason code shown as muted subtitle ("Based on your Build score" / "Due today")

3. **Quick Actions Row**: Horizontal scroll of pill buttons deep-linking to:
   - `/planner` (Plan)
   - `/reset` (Snapshot check-in)
   - Promises modal
   - Wellness log
   - Meal tracker

4. **Why This Matters Today**: 1-2 sentence grounded explanation in a subtle callout box.

5. **Low Energy Fallback**: Collapsible section "If today goes sideways" with a simplified 2-item plan.

**States:**
- Loading: Skeleton matching the layout
- Empty/no session: "Start a Snapshot to activate Daily OS"
- Error: Graceful fallback to rules-based plan client-side
- Free user teaser: Show rules-based plan with "Unlock AI-powered priorities" upsell

**Interaction behavior:**
- Marking an item "done" strikes it through and persists to DB
- Snoozed items move to bottom with "snoozed" badge
- Dismissed items hide entirely
- All interactions are optimistic (instant UI, async DB write)

---

### Phase 5: Dashboard Integration

**`src/pages/Dashboard.tsx` changes:**
- Replace `DailyBriefingCard` import and usage with `DailyOSCard`
- Move it above `TodayActions` (it becomes the first card after GreetingBanner + SeasonBanner + SnapshotReviewCard)
- Pass `userId`, `isPaid`, `isTrialing`, `hasActiveSnapshot`, `onUpgrade` props
- Remove old `DailyBriefingCard` import

---

### Phase 6: Telemetry

Track events: `daily_os_viewed`, `daily_os_item_completed`, `daily_os_item_snoozed`, `daily_os_refreshed`, `daily_os_quick_action_tapped`.

---

### Files Summary

| Action | Path |
|--------|------|
| Migration | `daily_os_plans` table |
| Create | `supabase/functions/daily-os-plan/index.ts` |
| Create | `src/hooks/useDailyOS.ts` |
| Create | `src/components/dashboard/DailyOSCard.tsx` |
| Edit | `src/pages/Dashboard.tsx` — swap DailyBriefingCard → DailyOSCard |
| Keep | `DailyBriefingCard.tsx` — leave in place but unused (can delete later) |

