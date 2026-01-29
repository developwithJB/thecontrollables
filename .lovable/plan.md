
# Fix Streak Counter to Show Actual Consecutive Check-In Days

## Problem

The fire streak indicator on the dashboard currently shows `completedDays.length` which only counts days completed in the **current 7-day Snapshot**. This means:
- After completing Day 7, starting a new Snapshot resets the counter to 0
- Users see "7d" as the maximum, which doesn't reflect their actual commitment across multiple Snapshots

## Solution

Calculate the **actual consecutive check-in streak** by:
1. Fetching all `daily_resets` entries for the user
2. Extracting unique check-in dates (converted to client's timezone)
3. Counting backwards from today to find how many consecutive days they checked in

---

## Technical Approach

### Option A: Calculate in Edge Function (Recommended)
Add streak calculation to the `dashboard-summary` edge function for timezone-accurate results.

### Implementation Details

**1. Update Edge Function** (`supabase/functions/dashboard-summary/index.ts`)

Add a new query to fetch daily_resets and calculate the consecutive streak:

```typescript
// Add to the parallel queries:
dailyResetsResult = supabase
  .from("daily_resets")
  .select("completed_at")
  .eq("user_id", userId)
  .order("completed_at", { ascending: false });

// After queries complete, calculate streak:
const calculateConsecutiveStreak = (completedDates: string[], today: string): number => {
  // Get unique dates in client's timezone, sorted descending
  const uniqueDates = [...new Set(
    completedDates.map(dateStr => toLocalDateString(dateStr))
  )].sort().reverse();
  
  if (uniqueDates.length === 0) return 0;
  
  // Check if user checked in today or yesterday (grace period)
  const todayDate = new Date(today + "T00:00:00");
  const firstDate = new Date(uniqueDates[0] + "T00:00:00");
  const daysDiff = Math.floor((todayDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If last check-in was more than 1 day ago, streak is broken
  if (daysDiff > 1) return 0;
  
  let streak = daysDiff === 0 ? 1 : 0; // Start with 1 if checked in today
  let currentDate = daysDiff === 0 ? todayDate : firstDate;
  
  // Count consecutive days going backwards
  for (let i = daysDiff === 0 ? 1 : 0; i < uniqueDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    
    if (uniqueDates[i] === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
};

const dailyResets = dailyResetsResult.data || [];
const consecutiveStreak = calculateConsecutiveStreak(
  dailyResets.map(r => r.completed_at),
  today
);
```

**2. Update Hook** (`src/hooks/useDashboardSummary.ts`)

Add `consecutiveStreak` to the `DashboardSummary` interface and expose it:

```typescript
interface DashboardSummary {
  // ... existing fields
  consecutiveStreak: number;
}

// In return:
const consecutiveStreak = summary?.consecutiveStreak ?? 0;
```

**3. Update Dashboard** (`src/pages/Dashboard.tsx`)

Replace `completedDays.length` with the new `consecutiveStreak`:

```typescript
const { consecutiveStreak, ... } = useDashboardSummary();

<GreetingBanner
  streakDays={consecutiveStreak}  // Changed from completedDays.length
  ...
/>
```

---

## Streak Logic Rules

1. **Streak counts consecutive calendar days** (in client's timezone)
2. **Today counts if checked in today**
3. **Yesterday grace**: If user hasn't checked in today yet, count from yesterday
4. **Streak breaks**: More than 1 day gap = streak resets to 0
5. **Cross-Snapshot**: Streaks persist across multiple 7-day Snapshots

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/dashboard-summary/index.ts` | Add daily_resets query and streak calculation |
| `src/hooks/useDashboardSummary.ts` | Add `consecutiveStreak` to interface and return |
| `src/pages/Dashboard.tsx` | Use `consecutiveStreak` instead of `completedDays.length` |

---

## Example Scenarios

**Scenario 1**: User completes Day 1-7 over 7 consecutive days
- Streak shows: `7d`

**Scenario 2**: User completes Day 1-7, starts new Snapshot, completes Day 1
- Streak shows: `8d` (not reset to 1d)

**Scenario 3**: User completes Day 1-3, misses a day, completes Day 4
- Streak shows: `1d` (reset due to gap)

**Scenario 4**: User completed yesterday but not today (morning)
- Streak shows: `Xd` (streak from yesterday, waiting for today's check-in)

---

## Testing Checklist

1. Complete a day in the current Snapshot and verify streak increments
2. Check streak persists across Snapshot boundaries
3. Verify streak resets when a day is missed
4. Test timezone edge cases (late night check-ins)
5. Verify the flame animation matches the new streak count
