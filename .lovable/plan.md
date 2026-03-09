
## Plan: Vault Module — Unified Searchable Life Record

### What already exists (federation sources, no duplication)
- `daily_resets` — reflection, commitment, release text per Snapshot day
- `integrity_logs` — promises, kept/broken status
- `guide_sessions` — AI chat message history (JSONB `messages` array)
- `reset_sessions` — Snapshot metadata (start, journey, status)
- `wellness_logs` — daily sleep/movement/nutrition + notes
- `planner_items` — tasks and time blocks with notes

### New tables needed
1. **`vault_entries`** — first-class freeform entries (note, journal, weekly_review)
2. **`vault_saved_views`** — saved filter presets (optional, v1 stub)

---

### Phase 1: Database Migration

```sql
CREATE TABLE public.vault_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type  TEXT NOT NULL DEFAULT 'note',
  -- CHECK: 'note' | 'journal' | 'reflection' | 'weekly_review'
  title       TEXT,
  body        TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  controllable TEXT,       -- awareness | perspective | habit | wellness | environment
  snapshot_id UUID,        -- links to reset_sessions.id
  season_id   UUID,        -- links to seasons.id
  source_ref  JSONB,       -- { table, row_id } for federated items
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vault_saved_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  filters    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on both: standard user CRUD own rows
-- updated_at trigger on vault_entries
```

---

### Phase 2: Edge Function — `vault-weekly-review`

Generates a weekly review from real activity, not generic prose.

**Gathers from existing tables for the target week:**
- `daily_resets` (reflections + commitments for that week)
- `integrity_logs` (promises made/kept that week)
- `planner_items` (completed/skipped tasks)
- `wellness_logs` (avg sleep/movement/nutrition)
- `xp_logs` (total earned + sources)
- `completed_actions` (snapshot actions done)
- existing `vault_entries` for the week

**Returns structured JSON:**
```json
{
  "summary": "...",
  "highlights": ["..."],
  "patterns": ["..."],
  "next_week_intention": "..."
}
```
Saves result as a `vault_entry` with `entry_type='weekly_review'` to prevent re-generation.

Uses `LOVABLE_API_KEY` (already configured) with `google/gemini-2.5-flash-lite`.

**Deterministic fallback** (no AI): template-filled using raw counts and real text from existing tables.

---

### Phase 3: React Hook — `useVault.ts`

**`useVaultTimeline(userId, filters)`**
- Fetches `vault_entries` filtered by type/date/controllable/season/snapshot + pagination
- Client-side search across title/body/tags using lowercased string matching (fast for v1; no FTS needed at this scale)

**`useVaultEntry()`** — create, update, delete, pin/unpin, favorite mutations

**`useVaultWeeklyReview(userId, weekStart)`** — triggers edge function, checks if review already exists for the week before generating

**`useVaultQuickCapture()`** — lightweight mutation for the dashboard capture bar

**Federation view** — a `useFederatedTimeline` helper that queries federated sources (wellness notes, promises, AI sessions) and merges them with `vault_entries` in JS, sorted by date. No materialized view or DB copy — pure client federation with React Query.

Federated item types mapped to Vault display:
| Source table | Vault type label |
|---|---|
| `daily_resets` | `reflection` |
| `integrity_logs` | `promise` |
| `guide_sessions` | `ai_action` |
| `wellness_logs` | note (wellness) |
| `vault_entries` | note/journal/weekly_review |

---

### Phase 4: Vault Page — `src/pages/Vault.tsx`

**Route:** `/vault`

**Mobile layout:**
```text
┌─────────────────────────────┐
│ [← Back]  Vault  [+ Capture]│
│ ┌───────────────────────────┐
│ │ [Search bar]              │
│ └───────────────────────────┘
│ [All] [Notes] [Reflections] [Promises] [AI] [Reviews]
│ ─── filter chips ───────────────────────────────
│  Apr Wellness note…         📌 May 3
│  Burnout reflection…            Apr 28
│  "I will stop…" (promise)       Apr 22
│  Weekly Review Apr 14–20        Apr 20
│  Guide: On habit…               Apr 18
└─────────────────────────────┘
```

**Desktop split layout:**
- Left panel: timeline + search/filter sidebar
- Right panel: entry detail or editor

**Components:**
```
src/pages/Vault.tsx
src/hooks/useVault.ts
src/components/vault/VaultTimeline.tsx        — scrollable feed
src/components/vault/VaultEntryCard.tsx       — single timeline item
src/components/vault/VaultEntryEditor.tsx     — create/edit sheet
src/components/vault/VaultSearchBar.tsx       — search + filter strip
src/components/vault/VaultFilterPanel.tsx     — type/date/controllable/season filters
src/components/vault/VaultQuickCapture.tsx    — inline capture widget (also used on dashboard)
src/components/vault/WeeklyReviewCard.tsx     — generated review display
src/components/vault/VaultEmptyState.tsx      — contextual empty state per filter
```

**Search behavior:**
- Searches `title`, `body`, `tags` client-side across all loaded entries (vault_entries + federated)
- Debounced 200ms
- Highlights matching text in results
- Example: "burnout" → finds daily_reset reflections + vault notes containing the word

**Filters:**
- Type tabs (chips)
- Date range picker (this week / last week / last 30 days / custom)
- Controllable multi-select
- Snapshot selector
- Pinned / Favorites toggle

---

### Phase 5: Dashboard Quick Capture

**`VaultQuickCapture` on Dashboard** — a single-line "Capture a thought…" text input that expands on focus into a minimal write mode:
- Title (optional)
- Body (required, 3+ lines)
- Type selector (note / journal / reflection)
- Tags chips
- Submit instantly → creates `vault_entry` → toast confirmation with "View in Vault" link

Positioned between `PlannerCard` and `MealPlanCard` in `Dashboard.tsx`. Compact by default, does not add visual weight to the home screen.

---

### Phase 6: Dashboard Vault Link

Add a small **"Vault"** entry point in the dashboard's navigation section (alongside existing Planner link / quick-access icons) and a compact **"Your Vault"** section showing:
- Count of entries this week
- Last pinned entry teaser (1 line)
- Link to `/vault`

This is a single small card, not a full module expansion.

---

### Phase 7: App.tsx Route

Add lazy-loaded `/vault` route with same auth guard pattern as `/planner`.

---

### Phase 8: Telemetry

Track: `vault_entry_created`, `vault_entry_pinned`, `vault_quick_capture_used`, `vault_search_executed`, `vault_weekly_review_generated`, `vault_filter_applied`.

---

### Phase 9: README + What's New

- Update `APP_VERSION` to `1.6.0`
- Add `"1.6.0"` entry to `CHANGELOG` in `WhatsNewModal.tsx`
- Update README with Vault feature description

---

### Files summary

| Action | Path |
|---|---|
| Migration | `supabase/migrations/..._vault_tables.sql` |
| Create | `supabase/functions/vault-weekly-review/index.ts` |
| Create | `supabase/config.toml` — add `[functions.vault-weekly-review]` |
| Create | `src/hooks/useVault.ts` |
| Create | `src/pages/Vault.tsx` |
| Create | `src/components/vault/` (7 component files) |
| Edit | `src/App.tsx` — add `/vault` route |
| Edit | `src/pages/Dashboard.tsx` — add VaultQuickCapture + VaultCard |
| Edit | `src/components/WhatsNewModal.tsx` — add 1.6.0 entry |
| Edit | `src/lib/version.ts` — bump to 1.6.0 |

**No changes to existing source-of-truth tables.** All federated reads are SELECT-only.
