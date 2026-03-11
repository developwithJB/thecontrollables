

# Wearable Data Becomes Project-Aware

## Changes

### 1. `supabase/functions/wearable-sync/index.ts` — Post-sync project attribution

After each provider sync completes (line ~368), add a new function `attributeProjectIds` that:

1. Gets all synced dates from the dayMap/days array
2. For each date, queries `planner_items` where `scheduled_date = date AND user_id = userId AND project_id IS NOT NULL` to find which projects had blocks
3. For each unique `project_id` found, updates `health_sync_data` for that date — since the `project_id` column is a single nullable FK (not an array), and multiple projects may share a day, we duplicate the health record: upsert one `health_sync_data` row per project per date (change the conflict key to include `project_id`, or update existing rows). 

**However**, the current unique constraint on `health_sync_data` is `(user_id, sync_date, source)` — adding per-project rows requires a schema change. Instead of duplicating rows, the simpler approach: store project attributions as a **separate lightweight join** or update `project_id` to the "primary" project (most blocks that day). Given the existing single FK column, we'll set `project_id` to the project with the most planner items that day, and also return all project IDs in a post-sync step so the client can use them.

**Migration needed**: Add an `attributed_project_ids text[]` column to `health_sync_data` to store all project IDs for the day (since the FK column only holds one). This keeps the single-FK for primary project and adds the array for multi-project days.

**Post-sync function** (called after line 368):
```
async function attributeProjectIds(userId, syncedDates, supabase) {
  for each date:
    query planner_items for project_ids on that date
    update health_sync_data SET project_id = primary, attributed_project_ids = all
}
```

### 2. DB Migration — Add `attributed_project_ids` column

```sql
ALTER TABLE public.health_sync_data ADD COLUMN attributed_project_ids text[] DEFAULT '{}';
```

### 3. `supabase/functions/dashboard-intelligence/index.ts` — Project-aware synthesis

Update `handleDailySynthesis` to accept project context. The payload changes from per-day to per-day-per-project:

- New payload shape: each entry includes `project_name`, `project_controllable`, and task counts scoped to that project
- Cache key changes: `daily_synthesis` table needs a `project_id` column so project-specific syntheses are cached separately
- Updated AI prompt: instructs the model to reference the project by name and tailor the synthesis to the controllable type (fitness → physical readiness, work → cognitive readiness)

**Migration**: Add `project_id uuid` to `daily_synthesis` table; update unique constraint to `(user_id, synthesis_date, project_id)`.

### 4. `src/hooks/useDailySynthesis.ts` — Send project context

Update the hook to group items by `project_id`, build per-project payloads, and return syntheses keyed by `date:project_id` instead of just `date`.

### 5. `src/components/planner/PlanVsActualView.tsx` — Consume project-keyed syntheses

Update `computeProjectStats` to look up syntheses by `date:projectId` key so each project card gets its own synthesis line.

## Files

| File | Change |
|------|--------|
| New migration SQL | Add `attributed_project_ids text[]` to `health_sync_data`, add `project_id uuid` to `daily_synthesis` with updated unique constraint |
| `supabase/functions/wearable-sync/index.ts` | Add `attributeProjectIds()` post-sync step |
| `supabase/functions/dashboard-intelligence/index.ts` | Update `handleDailySynthesis` prompt and caching for project-aware synthesis |
| `src/hooks/useDailySynthesis.ts` | Group by project, send project context, return project-keyed map |
| `src/components/planner/PlanVsActualView.tsx` | Update synthesis lookup to use project-keyed keys |

