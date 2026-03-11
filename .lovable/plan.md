

# Data Model Migration: Seasons, Projects, and Calendar Mappings

## Current State
- **`seasons`** table exists but is minimal: `id, user_id, name, started_at, completed_at, status, created_at`. Missing: `theme_text`, `ends_at`, `controllable_focus`.
- **`planner_items`** has no `project_id` column.
- **`health_sync_data`** has no `project_id` column.
- No `projects` or `project_calendar_mappings` tables exist.
- Existing enums: `app_role`, `planner_item_status`, `planner_item_type`. No enums for season/project status or controllable focus.

## Migration SQL

A single migration will:

### 1. Create enums
- `season_status` — `'active', 'closed'`
- `project_status` — `'active', 'paused', 'complete'`
- `controllable_focus` — `'awareness', 'perspective', 'habit', 'wellness', 'environment'`

### 2. Alter `seasons` table
- Add `theme_text text`
- Add `ends_at timestamptz` (nullable)
- Add `controllable_focus controllable_focus` (nullable — existing rows won't have it)
- Migrate `status` column from `text` to use `season_status` enum (default `'active'`)
- Drop `completed_at` (replaced by `ends_at` + `status = 'closed'`) — or keep for backward compat. Since existing code references `completed_at`, we will **keep it** and add the new columns alongside.

### 3. Create `projects` table
- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL`
- `season_id uuid FK → seasons(id) ON DELETE CASCADE`
- `name text NOT NULL`
- `emoji text default '📌'`
- `color_hex text default '#6366f1'`
- `controllable controllable_focus`
- `status project_status default 'active'`
- `momentum_score integer default 0 CHECK (0-100)`
- `created_at timestamptz default now()`
- RLS: users can CRUD their own rows

### 4. Create `project_calendar_mappings` table
- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL`
- `project_id uuid FK → projects(id) ON DELETE CASCADE`
- `calendar_event_keyword text NOT NULL`
- `gcal_calendar_id text` (nullable)
- `created_at timestamptz default now()`
- RLS: users can CRUD their own rows

### 5. Add `project_id` FK to `planner_items`
- `ALTER TABLE planner_items ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL`
- Nullable — existing rows unaffected

### 6. Add `project_id` FK to `health_sync_data`
- `ALTER TABLE health_sync_data ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL`
- Nullable — existing rows unaffected

### 7. RLS Policies
- **projects**: authenticated users SELECT/INSERT/UPDATE/DELETE where `user_id = auth.uid()`
- **project_calendar_mappings**: same pattern
- Existing `seasons`, `planner_items`, `health_sync_data` RLS unchanged (new columns are nullable FKs)

## No Code Changes
This is a schema-only migration. No application code changes in this step — the types file will auto-regenerate after migration.

