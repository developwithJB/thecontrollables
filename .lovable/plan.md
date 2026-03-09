

## Plan: Wellness Logging Streak Counter with Bonus XP

### Overview
Add a streak counter that tracks consecutive days of wellness logging (entries in `wellness_logs`). Display the streak on the Brain & Body tracker card and award bonus XP at streak milestones (3, 7, 14, 30 days).

### No Database Changes Needed
The `wellness_logs` table already has `user_id` and `log_date` with a unique constraint. Streaks can be calculated client-side from existing data. XP is awarded via insert into `xp_logs` (existing table).

### Changes

#### 1. Extend `useWellness.ts` with streak calculation
- Fetch up to 60 recent `wellness_logs` (instead of 7) to compute streak
- Calculate consecutive days backward from today (with 1-day grace period matching existing streak logic)
- Return `streak: number` and `isStreakNew: boolean` (just hit a milestone)
- After a successful `logWellness`, check if the new streak hits a milestone (3, 7, 14, 30) and insert bonus XP into `xp_logs`:
  - 3-day: +25 XP
  - 7-day: +50 XP
  - 14-day: +100 XP
  - 30-day: +200 XP

#### 2. Show streak in `BrainBodyTracker.tsx`
- When `hasData` is true and streak > 0, display a fire emoji + streak count badge next to the header (e.g., "🔥 5")
- Animate the badge on milestone days with a pulse effect
- Keep it minimal — a small badge, not a new card

#### 3. Show streak milestone toast in `useWellness.ts`
- When bonus XP is awarded, enhance the existing toast: "Battery logged! 🔥 5-day streak! +50 XP bonus"

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useWellness.ts` | Add streak calculation, milestone XP awards, enhanced toast |
| `src/components/dashboard/BrainBodyTracker.tsx` | Display streak badge in header |

