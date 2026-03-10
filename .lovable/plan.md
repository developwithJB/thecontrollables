

# Fix: WHOOP OAuth Callback DB Error — Missing `metadata` Column

## Root Cause

The `wearable-oauth-callback` edge function (line 160) includes a `metadata` field in the upsert to `wearable_connections`, but that column does not exist on the table. The exact error from logs:

```
Could not find the 'metadata' column of 'wearable_connections' in the schema cache
```

## Fix

Two changes needed:

### 1. Add `metadata` column to `wearable_connections` table

Run a database migration:

```sql
ALTER TABLE public.wearable_connections
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
```

This stores WHOOP profile info (whoop_user_id, name, email) which is useful for webhook matching and display.

### 2. Also add `scopes` column if missing

The upsert also writes a `scopes` field (line 158). Verify it exists; if not, add it too:

```sql
ALTER TABLE public.wearable_connections
ADD COLUMN IF NOT EXISTS scopes text;
```

## Files Summary

| Action | Detail |
|--------|--------|
| DB Migration | Add `metadata jsonb` and `scopes text` columns to `wearable_connections` |

No code file changes needed — the edge function is already correct, it just needs the table to match.

