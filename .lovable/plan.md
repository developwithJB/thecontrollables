

# 4-Week Seasons

Opt-in multi-week arcs that chain 4 consecutive Snapshots into a "Season," providing cumulative proof, continuity between weeks, and a season-end recap/reward.

## Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  seasons     │────▶│  reset_sessions  │     │  Season Recap    │
│  (new table) │     │  (season_id FK)  │     │  (UI component)  │
└─────────────┘     └──────────────────┘     └──────────────────┘
```

## What Gets Built

### 1. Database Migration
- **New `seasons` table**: `id`, `user_id`, `name` (optional custom name), `started_at`, `completed_at`, `status` (active/completed/abandoned), `created_at`. RLS: user can CRUD own rows only.
- **Add `season_id uuid` nullable column** to `reset_sessions` — links a Snapshot to its parent Season.
- RLS on seasons: standard user-owns-row pattern for SELECT, INSERT, UPDATE.

### 2. New hook: `useSeason.ts`
- `activeSeason` — query for user's season with status=active
- `startSeason()` — creates a season row, returns its ID
- `joinSeason(sessionId)` — sets `season_id` on the current reset_session
- `seasonSnapshots` — all reset_sessions with this season_id, ordered by start_date
- `seasonProgress` — computed: { weekNumber (1-4), totalCheckIns, totalXP, snapshotsCompleted }
- `completeSeason()` — marks season completed when 4th Snapshot finishes
- Auto-detect: when Day7Complete fires and user has an active season with < 4 snapshots, prompt "Continue Season" instead of generic "What's Next"

### 3. Dashboard: Season Progress Banner
New `SeasonBanner.tsx` component, shown above ResetProgressModule when user has an active season:
- "Season: Week 2 of 4" with a 4-segment progress bar (each segment = one Snapshot)
- Completed segments show green + check, active segment pulses, future segments are muted
- Cumulative stats: total check-ins, total XP across all season Snapshots
- Subtle: does not replace existing UI, just adds a thin banner

### 4. Day7Complete: Season Continuation
Modify the "What's Next?" section in `Day7Complete.tsx`:
- If user has an active season with < 4 Snapshots completed → show "Continue Your Season — Week N of 4" as primary CTA instead of recommended Snapshot
- Copy: "Week 1 is proof. Week 2 is momentum. Keep going."
- Still allow "Choose Different" and "Browse All" as secondary options
- If no active season → add a new option: "Start a 4-Week Season" below the existing What's Next section (opt-in, not forced)

### 5. Season Recap Screen
New `SeasonComplete.tsx` component triggered when the 4th Snapshot in a season completes:
- Celebration header: "Season Complete. 4 Weeks. Your Record."
- Cumulative stats card: total check-ins across 4 weeks, total XP, controllables covered
- 4-Snapshot timeline showing each week's emoji + name + check-in count
- Narrative line based on consistency (e.g., "28 days. 22 check-ins. That's a season of showing up.")
- Badge unlock: "Season Finisher" badge (add to badges.ts)
- "Start Another Season" and "Take a Break" CTAs

### 6. Snapshot History: Season View
In `SnapshotHistory.tsx`, group Snapshots that share a `season_id`:
- Show a collapsible "Season" card that contains 4 Snapshot rows with cumulative stats
- Season card header: "4-Week Season · [date range] · [X] check-ins"
- Standalone Snapshots (no season_id) render as they do today — no change

### 7. Start Season Flow
In `StartSnapshotDialog.tsx`, add a toggle/option:
- "Start as a 4-Week Season" checkbox (default unchecked)
- When checked: creates a season first, then links the first Snapshot to it
- Description: "Chain 4 Snapshots together. See your momentum build over a month."
- Premium-only feature (check entitlements)

## What Does NOT Change
- Solo Snapshot flow remains default — Seasons are opt-in
- Existing 7-day cycle, daily actions, check-ins unchanged
- Free users still get 1 Snapshot at a time (Seasons are Premium)
- No changes to edge functions or push notifications

## Implementation Order
1. Database migration (seasons table + season_id on reset_sessions)
2. `useSeason.ts` hook
3. `SeasonBanner.tsx` dashboard component
4. Day7Complete season continuation CTA
5. `SeasonComplete.tsx` recap screen
6. SnapshotHistory season grouping
7. StartSnapshotDialog season toggle
8. "Season Finisher" badge in badges.ts

## File Changes
- **New**: `src/hooks/useSeason.ts`, `src/components/dashboard/SeasonBanner.tsx`, `src/components/SeasonComplete.tsx`
- **Edit**: `src/pages/Dashboard.tsx` (add SeasonBanner), `src/components/Day7Complete.tsx` (season continuation), `src/components/dashboard/SnapshotHistory.tsx` (season grouping), `src/components/dashboard/StartSnapshotDialog.tsx` (season toggle), `src/lib/badges.ts` (Season Finisher badge)
- **Migration**: Create `seasons` table, add `season_id` to `reset_sessions`

