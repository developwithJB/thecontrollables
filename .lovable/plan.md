

## Plan: Wellness Streak History Heatmap + Milestone Confetti

### Overview
Add two features:
1. **Streak history calendar heatmap** on the Experience tab showing wellness logging days
2. **Confetti celebration animation** when users hit streak milestones (7, 14, 30 days)

### Changes

#### 1. Create WellnessStreakHistory component
**New file: `src/components/experience/WellnessStreakHistory.tsx`**

A calendar heatmap card showing the last 12 weeks of wellness logging:
- Grid of 7 rows (days) × ~12 columns (weeks)
- Color intensity based on whether user logged that day (binary: logged vs not)
- Current streak displayed prominently at top with fire emoji
- Longest streak stat shown below
- Day cells show tooltip on hover with date and ratings

**Technical approach:**
- Accept `recentLogs` from `useWellness` hook (already fetches 60 days)
- Calculate a Set of logged dates for O(1) lookup
- Render CSS grid with dates going back ~84 days
- Use existing theme colors: logged days get `bg-wellness`, empty days get `bg-muted/30`

#### 2. Add confetti celebration to useWellness
**Edit: `src/hooks/useWellness.ts`**

Extend the return value to include:
- `hitMilestone: number | null` — set when user just hit a milestone (7, 14, 30)
- Reset after 3 seconds via `useEffect`

The existing `logWellness` already detects milestones for XP. We'll add state to track when a milestone was just hit so the UI can react.

#### 3. Create StreakCelebration confetti component
**New file: `src/components/experience/StreakCelebration.tsx`**

A full-screen overlay with:
- Confetti particles using framer-motion (similar pattern to TodayActions but bigger)
- Milestone badge in center: "🔥 7-Day Streak!" with XP bonus
- Auto-dismiss after 3 seconds

#### 4. Integrate into Dashboard
**Edit: `src/pages/Dashboard.tsx`**

- Import `WellnessStreakHistory` 
- Add it to the Experience tab after `InsightsAtAGlance` for paid users
- Import `StreakCelebration` and render conditionally when `hitMilestone` is truthy
- Pass `hitMilestone` from `useWellness` hook

### Files Changed

| File | Change |
|------|--------|
| `src/components/experience/WellnessStreakHistory.tsx` | **New** — calendar heatmap card |
| `src/components/experience/StreakCelebration.tsx` | **New** — confetti overlay component |
| `src/hooks/useWellness.ts` | Add `hitMilestone` state and auto-reset |
| `src/pages/Dashboard.tsx` | Integrate heatmap into Experience tab + show confetti |

### UI Preview

```text
┌──────────────────────────────────────────────────┐
│ 🔥 Wellness Streak                    Current: 7 │
├──────────────────────────────────────────────────┤
│ Week →  1   2   3   4   5   6   7   8   9  10 11 │
│ Mon    ■   ■   ■       ■   ■   ■   ■   ■   ■  ■  │
│ Tue    ■   ■       ■   ■   ■   ■   ■   ■   ■  ■  │
│ Wed        ■   ■   ■   ■   ■   ■   ■   ■   ■  ■  │
│ Thu    ■   ■   ■   ■       ■   ■   ■   ■   ■  ■  │
│ Fri    ■       ■   ■   ■   ■   ■   ■   ■   ■  ■  │
│ Sat    ■   ■       ■   ■   ■       ■   ■   ■     │
│ Sun        ■   ■   ■   ■       ■   ■   ■   ■  ■  │
├──────────────────────────────────────────────────┤
│ Longest streak: 14 days    Total logs: 52        │
└──────────────────────────────────────────────────┘
```

### Confetti Animation
- Reuse the motion pattern from TodayActions but scale up
- Show multiple emoji particles: 🎉 🔥 ⭐ 
- Central badge with milestone text
- Auto-dismiss with exit animation

