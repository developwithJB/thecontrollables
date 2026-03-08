

# Controllable Leveling System (1-99) + Meal Plan vs Actual Week View

## Two Features

### Feature 1: Per-Controllable Leveling (Pokemon-style, Lvl 1-99)

Each of the 5 controllables gets its own independent level (1-99), calculated from XP earned in that domain. This creates long-term progression that persists across snapshots.

**Data source**: `completed_actions` table already has a `controllable` column and `xp_awarded`. We sum XP per controllable to derive individual levels. No new tables needed.

**Leveling formula** (scaling curve like Pokemon):
- Level 1 = 0 XP, Level 2 = 50 XP, Level 10 = ~2,500 XP, Level 50 = ~62,500 XP, Level 99 = ~245,000 XP
- Formula: `XP needed for level N = N^2 * 25` (quadratic scaling — easy early, grindy late)
- Current level: largest N where `totalControllableXp >= N^2 * 25`

**New files**:
- `src/hooks/useControllableLevels.ts` — queries `completed_actions` grouped by controllable, computes level per controllable
- `src/components/dashboard/ControllableLevelsCard.tsx` — shows all 5 controllables with their level, XP bar to next level, emoji

**UI design**: A card showing 5 rows, one per controllable:
```text
🦉 Awareness    Lv.12  ████████░░  2,450 / 3,025 XP
🐢 Perspective  Lv.8   ██████░░░░  1,600 / 2,025 XP
🦈 Habit        Lv.15  █████░░░░░  5,100 / 6,400 XP
🛰️ Wellness     Lv.6   ███░░░░░░░    900 / 1,225 XP
🚀 Environment  Lv.3   ████████░░    200 /   225 XP
```
- Each bar uses the controllable's accent color
- Tapping a row could show XP history for that controllable
- Level-up celebrations via toast when a new level is detected

**Dashboard placement**: Replace or augment the existing `GrowthSummaryCard` which already shows XP + strongest controllable but lacks depth.

### Feature 2: Meal Plan vs Actual — Weekly Comparison

A week view inside the MealPlanCard showing what was planned vs what was actually eaten each day.

**Data sources**: `meal_plans` (planned) + `meal_logs` (actual), both already exist with `plan_date`/`log_date` and calorie data.

**New component**: `src/components/nutrition/MealWeekComparison.tsx`
- 7-day horizontal view (Mon-Sun)
- Each day shows two stacked bars: planned calories vs actual calories
- Color coding: green if actual is within 15% of plan, yellow if off, red if way off or missing
- Tapping a day opens detail of planned meals vs logged meals

**Integration**: Add as a section within the existing MealPlanCard or as a toggle view ("Today" | "Week").

## Files

- **New**: `src/hooks/useControllableLevels.ts`, `src/components/dashboard/ControllableLevelsCard.tsx`, `src/components/nutrition/MealWeekComparison.tsx`
- **Edit**: `src/pages/Dashboard.tsx` (add ControllableLevelsCard), `src/components/nutrition/MealPlanCard.tsx` (add week toggle), `src/lib/controllableTheme.ts` (add level utility functions)
- **No database changes** — reads existing `completed_actions` and `meal_plans`/`meal_logs`

## Implementation Order
1. Add leveling utility functions to `controllableTheme.ts`
2. Create `useControllableLevels` hook
3. Create `ControllableLevelsCard` component
4. Create `MealWeekComparison` component
5. Wire both into Dashboard and MealPlanCard

