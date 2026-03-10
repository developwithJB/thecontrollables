

# Fix: Wellness Goals Auto-Update from Wearable Data

## Problem

When WHOOP (or any wearable) syncs data, the "Your Goals" card doesn't update because the query cache keys it depends on (`health-sync-today`, `health-data-trend`) are never invalidated after a sync. The `HealthDataSync` component only invalidates `health-sync-last` and `brain-body`.

## Changes

### 1. Add missing cache invalidations after wearable sync

**Edit:** `src/components/dashboard/HealthDataSync.tsx`

After sync success (~line 94), add:
```typescript
queryClient.invalidateQueries({ queryKey: ["health-sync-today"] });
queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
```

Same for the import handler (~line 146).

### 2. Add cache invalidations after OAuth callback

**Edit:** `src/pages/Wellness.tsx`

In the `wearable_connected` handler (~line 38), also invalidate health data queries so goals refresh immediately:
```typescript
queryClient.invalidateQueries({ queryKey: ["health-sync-today"] });
queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
queryClient.invalidateQueries({ queryKey: ["brain-body"] });
```

### 3. Auto-trigger sync after new wearable connection

**Edit:** `src/pages/Wellness.tsx`

In the `wearable_connected` handler, after showing the toast, automatically invoke a sync so data populates goals without requiring the user to manually press "Sync":
```typescript
supabase.functions.invoke("wearable-sync", { body: { provider: connected } });
```

This is fire-and-forget; the invalidation from HealthDataSync will catch the update, or the staleTime (2 min) will pick it up naturally.

## Files Summary

| File | Change |
|------|--------|
| `src/components/dashboard/HealthDataSync.tsx` | Add `health-sync-today` and `health-data-trend` invalidations after sync |
| `src/pages/Wellness.tsx` | Invalidate health queries + auto-trigger sync on new connection |

