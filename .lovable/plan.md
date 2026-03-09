

## Plan: Circle Streak Leaderboard

### Challenge
Wellness logs have RLS restricting reads to the logged-in user only. We cannot query other circle members' wellness streaks client-side.

### Solution
Create a **security definer database function** that computes wellness streaks for all participants of a given circle, gated by the caller being a participant. Then build a leaderboard UI component inside the existing CircleCard.

### Database Changes

**New function: `get_circle_wellness_streaks(p_challenge_id uuid)`**
- Returns `TABLE(user_id uuid, display_name text, streak integer)`
- Security definer — bypasses RLS
- Validates caller is a participant via `is_challenge_participant(auth.uid(), p_challenge_id)`
- For each participant: queries their `wellness_logs` dates (last 60 days), calculates consecutive-day streak backward from today with 1-day grace period
- Orders by streak descending

### Files to Create

1. **`src/components/dashboard/CircleLeaderboard.tsx`**
   - Compact leaderboard table within the circle card area
   - Shows rank, avatar initial, display name, fire emoji + streak count
   - Highlights current user's row
   - Crown icon for #1 position
   - Only renders when circle exists and has data

### Files to Edit

1. **`src/hooks/useCircle.ts`**
   - Add a `useQuery` calling the new `get_circle_wellness_streaks` RPC
   - Return `streakLeaderboard` data

2. **`src/components/dashboard/CircleCard.tsx`**
   - Import and render `CircleLeaderboard` below the member dots section
   - Pass leaderboard data and current userId

### UI Preview

```text
┌─────────────────────────────────────┐
│ 🏆 Streak Leaderboard              │
├─────────────────────────────────────┤
│ 👑 1. Marcus        🔥 14          │
│    2. Sarah         🔥 9           │
│    3. You           🔥 5           │
└─────────────────────────────────────┘
```

Compact, fits below existing member dots in CircleCard. No new page or tab needed.

