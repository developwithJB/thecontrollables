

## Plan: Integration Hub — Unified Provider Management

### Current State

The app already has a partial Google Calendar OAuth flow via `planner_connections` table and `planner-gcal-oauth-start/callback` edge functions. These store tokens in `planner_connections`. The Integration Hub will supersede this with a unified `integration_connections` table and common edge function interface.

### Important Constraint

**Google Calendar, Todoist, Gmail, and Notion all require OAuth client credentials (client ID + secret) from their respective developer consoles.** These are not currently configured as secrets. Before any provider actually works end-to-end, you will need to add:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (may already exist for planner gcal)
- `TODOIST_CLIENT_ID` / `TODOIST_CLIENT_SECRET`
- `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`

Gmail uses the same Google OAuth credentials but with additional scopes.

---

### Phase 1: Database Migration

**`integration_connections`** — replaces scattered connection tables as the canonical store:

```sql
CREATE TABLE public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,        -- google_calendar, gmail, todoist, notion
  provider_account_id TEXT,      -- email or account identifier
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],                 -- granted scopes
  status TEXT NOT NULL DEFAULT 'active', -- active, error, expired, disconnected
  error_message TEXT,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',   -- provider-specific config (e.g. notion DB id)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE TABLE public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  sync_type TEXT NOT NULL,       -- full, incremental, export
  status TEXT NOT NULL,          -- started, success, partial, failed
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
```

RLS: user CRUD own rows on both tables. `updated_at` trigger on `integration_connections`.

---

### Phase 2: Edge Functions (Common Interface)

All provider functions follow the same pattern: auth check → load connection → call provider API → update connection status → log sync.

| Function | Purpose |
|---|---|
| `integration-oauth-start` | Generates OAuth URL for any provider (provider param determines scopes/endpoints) |
| `integration-oauth-callback` | Exchanges code, stores tokens in `integration_connections` |
| `integration-sync` | Dispatches sync by provider: gcal→planner, todoist→planner, gmail→daily-os summary, notion→export |
| `integration-disconnect` | Revokes token + marks connection disconnected |

**Google Calendar sync**: Read events for date range → upsert into `planner_items` with `external_event_id` for idempotency. Write mode: push planner time blocks back as calendar events.

**Todoist sync**: Import active tasks → create `planner_items`. Optional export: mark selected planner items to push back as Todoist tasks.

**Gmail summary**: Fetch unread count, starred messages, messages needing reply (heuristic: received from known contacts, no reply in thread), calendar invites. Return structured summary JSON — stored ephemerally, consumed by Daily OS card. No message content stored.

**Notion export**: Push weekly reviews and selected vault entries to a user-chosen Notion database via Notion API pages.create.

All syncs are idempotent (use external IDs, upsert logic, duplicate checks).

---

### Phase 3: React Hook — `useIntegrations.ts`

- `useIntegrationConnections()` — list all connections for current user
- `useConnectProvider(provider)` — initiates OAuth flow
- `useDisconnectProvider(connectionId)` — calls disconnect function
- `useSyncProvider(connectionId)` — triggers manual sync
- `useSyncLogs(connectionId?)` — recent sync history
- `useGmailSummary()` — fetches gmail summary for Daily OS consumption

All queries wrapped in error boundaries so a failed provider never blocks dashboard.

---

### Phase 4: Integrations Page — `/integrations`

**Provider cards** in a responsive grid, each showing:
- Provider icon + name
- Status badge (Connected / Error / Not Connected)
- Connected account (email)
- Last synced time
- Scopes granted
- Manual sync button
- Disconnect button
- Error message (if any)
- Recent sync log entries (collapsible)

**Providers displayed**: Google Calendar, Gmail, Todoist, Notion

Layout: simple card grid, mobile-stacked. No tabs needed for 4 providers.

**Components:**
```
src/pages/Integrations.tsx
src/hooks/useIntegrations.ts
src/components/integrations/ProviderCard.tsx
src/components/integrations/SyncLogList.tsx
src/components/integrations/IntegrationEmptyState.tsx
```

---

### Phase 5: Profile Settings Link

Add an "Integrations" button in `ProfileSettingsModal.tsx` (alongside Billing) that navigates to `/integrations`.

---

### Phase 6: Dashboard Consumption

- **Daily OS**: If Gmail connected, show inbox summary (unread count, starred, needs-reply) in the Daily OS card. Graceful fallback if not connected.
- **Planner**: If Google Calendar or Todoist connected, show synced items with source badges. Existing planner already handles external events.

Both consume data that's already in existing tables (planner_items, daily OS plan). The sync functions populate these tables — the UI doesn't need to know the source.

---

### Phase 7: Route + Version

- Add lazy-loaded `/integrations` route in `App.tsx`
- Bump version to `1.7.0`
- Add WhatsNewModal entry

---

### Files Summary

| Action | Path |
|---|---|
| Migration | `supabase/migrations/..._integration_hub.sql` |
| Create | `supabase/functions/integration-oauth-start/index.ts` |
| Create | `supabase/functions/integration-oauth-callback/index.ts` |
| Create | `supabase/functions/integration-sync/index.ts` |
| Create | `supabase/functions/integration-disconnect/index.ts` |
| Create | `src/hooks/useIntegrations.ts` |
| Create | `src/pages/Integrations.tsx` |
| Create | `src/components/integrations/ProviderCard.tsx` |
| Create | `src/components/integrations/SyncLogList.tsx` |
| Edit | `src/App.tsx` — add `/integrations` route |
| Edit | `src/components/ProfileSettingsModal.tsx` — add Integrations link |
| Edit | `src/components/WhatsNewModal.tsx` — v1.7.0 entry |
| Edit | `src/lib/version.ts` — bump to 1.7.0 |

### Secrets Required

Before providers work, these secrets need to be configured:
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (may already exist)
- `TODOIST_CLIENT_ID` + `TODOIST_CLIENT_SECRET`
- `NOTION_CLIENT_ID` + `NOTION_CLIENT_SECRET`

I will prompt for these during implementation.

