

## Plan: Planner Module (v1)

This is a large feature spanning database schema, a new route, a dashboard card, hooks, and integration with existing modules. The plan is structured in phases.

---

### Phase 1: Database Schema

Create 4 tables via migration:

**`planner_items`** — Core table for all planner entries
```sql
CREATE TYPE planner_item_type AS ENUM ('task', 'time_block', 'routine_instance', 'external_event');
CREATE TYPE planner_item_status AS ENUM ('todo', 'in_progress', 'done', 'skipped');

CREATE TABLE planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type planner_item_type NOT NULL DEFAULT 'task',
  status planner_item_status NOT NULL DEFAULT 'todo',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  energy_level TEXT CHECK (energy_level IN ('low','medium','high')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  routine_id UUID,                    -- FK to planner_routines if generated from one
  external_event_id TEXT,             -- provider-side ID for synced events
  connection_id UUID,                 -- FK to planner_connections
  snapshot_action_ref JSONB,          -- {snapshot_id, day, action_text}
  promise_id UUID,                    -- optional link to integrity_logs
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: user can CRUD own rows
```

**`planner_routines`** — Recurring templates
```sql
CREATE TABLE planner_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  recurrence TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'weekdays' | 'weekly'
  recurrence_days INTEGER[] DEFAULT '{}',   -- 0=Sun..6=Sat for weekly
  default_start_time TIME,
  default_end_time TIME,
  energy_level TEXT CHECK (energy_level IN ('low','medium','high')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: user can CRUD own rows
```

**`planner_connections`** — Calendar provider credentials (provider-safe)
```sql
CREATE TABLE planner_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'google_calendar', future: 'outlook', 'apple'
  provider_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_ids JSONB DEFAULT '[]',     -- selected calendars to sync
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, provider_account_id)
);
-- RLS: user can CRUD own rows
```

**`planner_sync_logs`** — Audit trail
```sql
CREATE TABLE planner_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES planner_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  events_imported INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: user can SELECT own rows
```

Add `updated_at` trigger on `planner_items`, `planner_routines`, `planner_connections`.

---

### Phase 2: Edge Functions

**`planner-gcal-oauth-start`** — Initiates Google Calendar OAuth flow, returns redirect URL. Uses existing GOOGLE_CLIENT_ID/SECRET secrets (will need to be added).

**`planner-gcal-oauth-callback`** — Exchanges code for tokens, stores in `planner_connections`.

**`planner-gcal-sync`** — Fetches events from Google Calendar API for a date range, upserts into `planner_items` with `item_type='external_event'`. Writes to `planner_sync_logs`.

Google Calendar integration requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets. These will need to be added before the sync works.

---

### Phase 3: React Hooks

**`src/hooks/usePlanner.ts`**
- `usePlannerItems(dateRange)` — React Query hook fetching `planner_items` for a date range
- `usePlannerMutations()` — create, update, complete, skip, reschedule, reorder mutations
- `usePlannerRoutines()` — CRUD for routines
- `usePlannerConnections()` — list connections, trigger sync
- `useTodayPlannerItems()` — lightweight query for dashboard card (today's items only, limit 5)

---

### Phase 4: Planner Page (`src/pages/Planner.tsx`)

**Mobile layout:**
- Horizontal scrollable date strip (Mon-Sun) at top
- Selected day's items below as a vertical list
- FAB button to add new item

**Desktop layout:**
- Left panel: week overview (7 columns, compact)
- Right panel: selected day detail with full item list

**Item components:**
- `PlannerItemRow` — displays item with status icon, title, time, energy badge; swipe actions for complete/skip on mobile
- `PlannerItemEditor` — sheet/dialog for create/edit with fields: title, type, date, start/end time, energy, routine link, notes
- `PlannerDateStrip` — horizontal week navigator
- `PlannerWeekGrid` — desktop week view
- `PlannerRoutineManager` — settings sheet to manage recurring routines
- `PlannerCalendarConnect` — Google Calendar connection UI

**Drag-to-reorder:** Use `@dnd-kit/sortable` (or manual touch handlers) within day list to reorder `sort_order`. No cross-day drag in v1.

**File structure:**
```
src/pages/Planner.tsx
src/components/planner/PlannerDateStrip.tsx
src/components/planner/PlannerDayView.tsx
src/components/planner/PlannerWeekGrid.tsx
src/components/planner/PlannerItemRow.tsx
src/components/planner/PlannerItemEditor.tsx
src/components/planner/PlannerRoutineManager.tsx
src/components/planner/PlannerCalendarConnect.tsx
src/components/planner/PlannerFab.tsx
```

---

### Phase 5: Dashboard Integration

**`src/components/dashboard/PlannerCard.tsx`** — Compact card on dashboard showing:
- "Today's Plan" header with item count
- Top 3-5 items with status indicators
- "Open Planner" link to `/planner`
- Empty state: "Plan your day" CTA

**Dashboard.tsx changes:**
- Add `PlannerCard` in the dashboard tab, positioned after `TodayActions`
- Import `useTodayPlannerItems` for data

**TodayActions integration (optional in v1):**
- Surface planner tasks alongside existing actions as a "Planned" subsection
- Completing a planner task from TodayActions updates `planner_items` status

**Snapshot-to-planner conversion:**
- In `SnapshotReviewCard` or snapshot detail, add "Add to Planner" button
- Creates a `planner_item` with `snapshot_action_ref` populated

---

### Phase 6: Telemetry & XP

- Track events: `planner_item_created`, `planner_item_completed`, `planner_item_skipped`, `planner_gcal_connected`, `planner_sync_completed`
- Completed planner tasks award XP (10 XP per task, same as completed_actions)
- Insert into `completed_actions` on planner task completion for experience/history visibility

---

### Phase 7: Route & App.tsx

- Add lazy-loaded `/planner` route in `App.tsx`
- Auth guard (same pattern as Dashboard — redirect to `/auth` if no session)

---

### Phase 8: README & What's New

- Update README with Planner feature description
- Add What's New entry for the Planner module

---

### Dependencies

- Need to add `@dnd-kit/core` and `@dnd-kit/sortable` for drag-to-reorder
- Google Calendar OAuth requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets

### Summary of files

| Action | Path |
|--------|------|
| Migration | `supabase/migrations/..._planner_tables.sql` |
| Create | `supabase/functions/planner-gcal-oauth-start/index.ts` |
| Create | `supabase/functions/planner-gcal-oauth-callback/index.ts` |
| Create | `supabase/functions/planner-gcal-sync/index.ts` |
| Create | `src/hooks/usePlanner.ts` |
| Create | `src/pages/Planner.tsx` |
| Create | `src/components/planner/*.tsx` (8 files) |
| Create | `src/components/dashboard/PlannerCard.tsx` |
| Edit | `src/App.tsx` — add `/planner` route |
| Edit | `src/pages/Dashboard.tsx` — add PlannerCard |
| Edit | `src/hooks/useActionTracking.ts` — add planner tracking methods |
| Edit | `supabase/config.toml` — add edge function JWT config |

