

## Plan: Wellness Goal-Setting Feature

### Overview
Allow users to set specific targets for sleep hours, daily steps, and wellness ratings (movement, nutrition, sleep quality). The dashboard will show progress toward these goals alongside existing Brain & Body scores.

### Database Schema

**New table: `wellness_goals`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| goal_type | text | 'sleep_hours', 'steps', 'sleep_rating', 'movement_rating', 'nutrition_rating' |
| target_value | integer | Target (e.g., 8 hours, 10000 steps, 4 rating) |
| created_at | timestamptz | When goal was set |
| updated_at | timestamptz | Last modified |
| UNIQUE(user_id, goal_type) |

RLS: Users can CRUD their own goals only.

### Files to Create

1. **`src/hooks/useWellnessGoals.ts`**
   - Fetch user's current goals
   - Calculate progress from `health_sync_data` and `wellness_logs`
   - Upsert goals when user sets targets

2. **`src/components/dashboard/WellnessGoalsCard.tsx`**
   - Card showing all active goals with progress bars
   - Goal type icons + current vs target display
   - Edit button to open goal setter

3. **`src/components/dashboard/SetGoalsDialog.tsx`**
   - Modal with sliders/inputs for each goal type
   - Quick presets: "Starter" (6k steps, 7h sleep), "Active" (10k steps, 8h sleep)
   - Clear labeling of metric units

### Files to Edit

1. **`src/pages/Dashboard.tsx`**
   - Add WellnessGoalsCard below BrainBodyTracker

2. **`src/components/dashboard/BrainBodyTracker.tsx`**
   - Optional: Show small goal indicator on factor chips when goals are set

### Goal Types & Defaults

| Goal Type | Unit | Default Target | Source |
|-----------|------|----------------|--------|
| sleep_hours | hours | 8 | health_sync_data.sleep_minutes |
| steps | count | 10,000 | health_sync_data.steps |
| sleep_rating | 1-5 | 4 | wellness_logs.sleep_rating |
| movement_rating | 1-5 | 4 | wellness_logs.movement_rating |
| nutrition_rating | 1-5 | 4 | wellness_logs.nutrition_rating |

### Progress Calculation
- For today's goals: compare latest `health_sync_data` or `wellness_logs` entry
- Show percentage complete with color coding: <50% red, 50-99% yellow, 100%+ green
- Display streak count when goal is met consecutively

### UI Preview

```text
┌─────────────────────────────────────┐
│ 🎯 Your Goals                       │
├─────────────────────────────────────┤
│ 😴 Sleep      7.5 / 8 hrs    ████░  │
│ 🚶 Steps      8,420 / 10k   ████░   │
│ 🥗 Nutrition  4 / 4         █████   │
│                                     │
│ [Edit Goals]                        │
└─────────────────────────────────────┘
```

