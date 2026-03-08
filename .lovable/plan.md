

# Brain & Body Health Tracker — Dashboard Wellness Hub

## Concept
A visual "Brain & Body" status card on the dashboard that synthesizes existing data (wellness logs for sleep/movement/nutrition, time logs for screen time, meal logs for food) into two intuitive health gauges — **Brain Health** and **Body Health** — each scored 0-100. Led by Satellite (🛰️ Wellness). No new database tables needed; this reads from existing `wellness_logs`, `time_logs`, and `meal_logs`.

## Data Sources (all existing)
- **`wellness_logs`**: `sleep_rating`, `movement_rating`, `nutrition_rating` (1-5 scale)
- **`time_logs`**: `time_wasted_minutes` (proxy for screen time / mental drain)
- **`meal_logs`**: `ai_analysis` JSON with calories/macros (nutrition quality signal)

## Scoring Logic

**Brain Health** (0-100):
- Sleep rating contribution (40%) — sleep drives cognitive function
- Screen time penalty (30%) — high `time_wasted_minutes` reduces score
- Nutrition rating (30%) — fuels brain function

**Body Health** (0-100):
- Movement rating (40%) — primary body input
- Sleep rating (30%) — recovery
- Nutrition quality (30%) — from wellness log + meal log calorie data

Uses a 7-day rolling average for smooth trends, falls back to today-only if less data.

## New Component: `src/components/dashboard/BrainBodyTracker.tsx`
- Card with two circular gauge visualizations (brain emoji 🧠, body emoji 💪)
- Each gauge: animated ring (0-100), color-coded (red < 40, yellow < 70, green >= 70)
- Below gauges: 4 small indicator chips showing contributing factors (Sleep, Movement, Screen Time, Nutrition) with their individual status
- Satellite tip at bottom: contextual one-liner based on weakest factor
- Tap card → opens WellnessLogger if no today log, or shows detail breakdown
- **No AI call needed** — pure client-side calculation from existing data

## New Hook: `src/hooks/useBrainBodyHealth.ts`
- Consumes `useWellness` recent logs + queries `time_logs` (last 7 days) + `meal_logs` (last 7 days)
- Computes brain/body scores with the formula above
- Returns: `{ brainScore, bodyScore, factors: { sleep, movement, screenTime, nutrition }, trend: 'up'|'down'|'stable', isLoading }`

## Dashboard Integration
- Place `BrainBodyTracker` above the MealPlanCard (after DailyBriefingCard)
- Available to all users (free gets today-only, paid gets 7-day trend)
- Tapping "Log" opens existing WellnessLogger modal

## Files
- **New**: `src/components/dashboard/BrainBodyTracker.tsx`, `src/hooks/useBrainBodyHealth.ts`
- **Edit**: `src/pages/Dashboard.tsx` (import + render BrainBodyTracker)
- **No database changes** — reads existing tables only

