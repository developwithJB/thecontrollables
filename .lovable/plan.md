

# Season Close & Roll-Up

## Overview
Redesign `SeasonComplete.tsx` into a rich close-out screen with project stats, wearable aggregates, AI reflection, and a downloadable Season Certificate. Extend the `generate-certificate` edge function to support a "season" type. Update `Home.tsx` to pass new data. Add manual close trigger support.

## Database Migration

Add `season_id` column to `certificates` table (nullable, for season-type certs):

```sql
ALTER TABLE public.certificates 
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id),
  ADD COLUMN IF NOT EXISTS certificate_type text DEFAULT 'snapshot';
-- Allow season certs (no reset_session_id required)
ALTER TABLE public.certificates ALTER COLUMN reset_session_id DROP NOT NULL;
```

## Files to Modify

### 1. `supabase/functions/generate-certificate/index.ts`
- Accept new request shape: `{ season_id, type: "season" }` alongside existing `{ reset_session_id }` for snapshots
- When `type === "season"`:
  - Fetch season record (name, started_at, completed_at/now)
  - Fetch all projects for that season with momentum scores
  - Fetch aggregate `health_sync_data` for the season date range (avg recovery, best/worst week recovery)
  - Identify most-completed and most-struggled projects by task completion ratio from `planner_items`
  - Call Lovable AI (gemini-2.5-flash) with all stats to generate a one-paragraph Season reflection
  - Generate a Season-specific SVG certificate design: season name, duration, project list, reflection text
  - Upload to `certificates` storage bucket, upsert to `certificates` table with `season_id` and `certificate_type = 'season'`

### 2. `src/components/SeasonComplete.tsx` — Full Redesign
New props interface:
```typescript
interface SeasonCompleteProps {
  season: Season;                    // full season object
  projects: Project[];               // all projects in this season
  seasonSnapshots: SeasonSnapshot[];  // existing
  progress: SeasonProgress;          // existing
  healthData: HealthMetrics[];       // season-range health data
  onStartNewSeason: () => void;
  onDismiss: () => void;
}
```

New sections:
- **Header**: Season name + duration ("New City, New Start · 67 days")
- **Project Cards**: Each project with emoji, momentum score bar, completion status (done/paused/active task counts)
- **Wearable Aggregate**: Average recovery, best week, hardest week (computed client-side from healthData)
- **Standout Projects**: "Most momentum" and "Most struggled" based on momentum_score or task completion ratio
- **AI Reflection**: Call `generate-certificate` with `type: "season"` which returns both `certificate_url` and `reflection_text`. Display the reflection paragraph.
- **Season Certificate**: Download button using existing `CertificatePreview` pattern
- **CTA**: "Start a new Season →" opens SeasonSetup

### 3. `src/hooks/useSeason.ts`
- Add `closeSeason` callback for manual close (sets `completed_at` to now, `status` to `completed`)
- Extend `shouldShowSeasonComplete` to also check if `ends_at` has passed
- Return `closeSeason` from hook

### 4. `src/hooks/useCertificate.ts`
- Add a `useSeasonCertificate(seasonId)` export that queries `certificates` by `season_id` instead of `reset_session_id`, and calls `generate-certificate` with `{ season_id, type: "season" }`

### 5. `src/pages/Home.tsx`
- Pass `activeSeason`, `activeProjects`, and season-range health data to `SeasonComplete`
- Fetch health data for the season date range (started_at to now) from `health_sync_data`
- Wire "Start a new Season" CTA to open `SeasonSetup` instead of directly calling `startSeason`
- Add a manual "Close Season" action (via `closeSeason`) accessible from `SeasonBanner` or settings

### 6. `src/components/dashboard/SeasonBanner.tsx`
- Add a "Close Season" menu option that triggers the manual close flow

## Key Logic

**Best/Hardest Week** (client-side from healthData array):
- Group health records by ISO week
- Average recovery_score per week
- Best = highest avg, Hardest = lowest avg

**Most Momentum / Most Struggled**:
- Rank projects by `momentum_score` — highest = most momentum, lowest = most struggled

**AI Reflection** (edge function, gemini-2.5-flash):
- Prompt: "Write one paragraph reflecting on a user's Season. Season: [name], [X days]. Projects: [list with momentum scores]. Average recovery: [X%]. Best week recovery: [X%]. Hardest week: [X%]. Most progress: [project]. Most struggled: [project]. Be specific, reference project names, connect body data to output."

## Hierarchy Preserved
Snapshots = weekly pulse (unchanged). Projects = month-scale container. Seasons = life-scale arc. No changes to snapshot mechanics.

