

# Daily Synthesis Line

## Overview
Add an AI-generated one-liner per day that connects planner output to wearable body data. Only shown when both data sources exist for that day.

## Database

Add a new `daily_synthesis` table to cache generated lines:

```sql
CREATE TABLE public.daily_synthesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  synthesis_date date NOT NULL,
  synthesis_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, synthesis_date)
);
ALTER TABLE public.daily_synthesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own synthesis" ON public.daily_synthesis FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own synthesis" ON public.daily_synthesis FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

## Edge Function Update — `dashboard-intelligence/index.ts`

Add an optional `daily_synthesis` request path. The client sends `{ action: "daily_synthesis", days: [{ date, planned, completed, recovery, hrv, strain }] }`. For each day that has both planner and wearable data:

1. Check `daily_synthesis` table for cached entry — if exists, return it.
2. If not cached, call Lovable AI with the prompt:
   > "The user had [X] tasks planned. They completed [Y]. Their recovery was [Z]%, HRV [A]ms, strain [B]. Generate one sentence (max 18 words) that connects their body state to their output. Be observational, not judgmental. Never use the word 'missed.' Focus on the pattern, not the failure."
3. Use tool calling to extract `{ synthesis: string }`.
4. Insert into `daily_synthesis` table and return.

Branch on `action` field in request body — existing behavior is the default when no action is specified.

## Frontend

### New hook: `src/hooks/useDailySynthesis.ts`
- Accepts the same `PvADay[]` array
- Filters to days with both items and health data
- Calls `supabase.functions.invoke("dashboard-intelligence", { body: { action: "daily_synthesis", days: [...] } })`
- Returns `Record<string, string>` mapping `yyyy-MM-dd` → synthesis text
- Uses React Query with `staleTime: Infinity` (cached in DB, no need to refetch)

### `PlanVsActualView.tsx`
- Accept new optional prop: `syntheses?: Record<string, string>`
- Below the grid columns (after the existing observation block), render the synthesis line when present:

```tsx
{synthesisText && (
  <div className="mt-1.5 pl-3 border-l-2 border-accent/40 py-1">
    <p className="text-[11px] text-muted-foreground italic">{synthesisText}</p>
  </div>
)}
```

- Replace the existing `generateObservation` block with the AI synthesis when available (synthesis takes priority; fall back to the static observation if no synthesis exists).

### `Home.tsx` and `Planner.tsx`
- Call `useDailySynthesis(pvaData)` and pass the result as `syntheses` prop to `PlanVsActualView`.

## Files to Change

| File | Change |
|------|--------|
| DB migration | Create `daily_synthesis` table with RLS |
| `supabase/functions/dashboard-intelligence/index.ts` | Add `daily_synthesis` action branch |
| `src/hooks/useDailySynthesis.ts` | New hook to fetch/cache synthesis lines |
| `src/components/planner/PlanVsActualView.tsx` | Accept `syntheses` prop, render styled line |
| `src/pages/Home.tsx` | Wire up `useDailySynthesis` and pass to PvA |
| `src/pages/Planner.tsx` | Wire up `useDailySynthesis` and pass to PvA |

