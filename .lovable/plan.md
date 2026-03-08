

# Meal Planning & Tracking — Powered by Wellness (🛰️)

## Concept
A Cal AI-inspired, ultra-lightweight meal tracker led by the Satellite (Wellness Controllable). Users snap a photo or type what they ate, AI estimates macros, and meals accumulate into a simple daily view. Meal plans can be generated and added to calendar. Paid feature gated behind `plus` tier.

## Database

### New table: `meal_logs`
```
id              uuid PK default gen_random_uuid()
user_id         uuid NOT NULL
log_date        date NOT NULL default CURRENT_DATE
meal_type       text NOT NULL (breakfast/lunch/dinner/snack)
description     text          -- typed entry
image_path      text          -- storage path if photo uploaded
ai_analysis     jsonb         -- { calories, protein, carbs, fat, items[] }
created_at      timestamptz default now()
```
RLS: user can SELECT/INSERT/UPDATE own rows.

### New table: `meal_plans`
```
id              uuid PK default gen_random_uuid()
user_id         uuid NOT NULL
plan_date       date NOT NULL
meals           jsonb NOT NULL -- [{ meal_type, name, description, est_calories }]
generated_by    text default 'ai'
created_at      timestamptz default now()
UNIQUE(user_id, plan_date)
```
RLS: user can SELECT/INSERT own rows.

### Storage bucket: `meal-photos` (public: false)
RLS: user can INSERT and SELECT own objects.

## New Edge Function: `ai-meal-analyze`
- Accepts: `{ description?: string, image_base64?: string }`
- Uses Lovable AI (gemini-2.5-flash) to analyze the meal
- Returns: `{ calories, protein, carbs, fat, items: [{ name, portion, calories }] }`
- Satellite voice wrapper: includes a 1-liner wellness observation
- No API key needed — uses Lovable AI supported models

## New Edge Function: `ai-meal-plan`
- Accepts: `{ date, preferences?, calorie_target? }`
- Uses Lovable AI to generate a simple 3-meal + 1-snack plan
- Returns: `{ meals: [{ meal_type, name, description, est_calories }], satellite_tip }`
- Also generates an .ics calendar entry for meal prep reminder

## New Components

### `src/components/nutrition/MealTracker.tsx`
Main entry point — a bottom-sheet style modal (like WellnessLogger pattern).
- **Header**: 🛰️ "Fuel Check" with daily calorie summary ring
- **Meal slots**: 4 cards (Breakfast, Lunch, Dinner, Snack) — tap to log
- **Each slot**: Photo button (camera icon) OR text input — pick one
- **After logging**: AI analysis appears inline with macro breakdown
- **Daily total**: Simple cal/protein/carb/fat summary bar at bottom

### `src/components/nutrition/MealLogEntry.tsx`
Single meal logging card:
- Tap camera icon → file input for photo upload
- Or tap keyboard icon → text input ("2 eggs, toast, coffee")
- Submit → calls `ai-meal-analyze` → shows result with Satellite quote
- Displays: meal name, estimated calories, macro chips

### `src/components/nutrition/MealPlanCard.tsx`
Dashboard card (similar to DailyBriefingCard):
- Shows today's AI-generated meal plan if one exists
- "Generate Plan" button if none exists
- Each meal shows name + est. calories
- "Add to Calendar" button → generates .ics via existing calendar pattern
- Satellite quote at bottom

### `src/hooks/useMealTracking.ts`
- CRUD for meal_logs (today's meals, recent history)
- Fetch/create meal plans
- Photo upload to `meal-photos` bucket
- AI analysis invocation

## Integration Points

### Dashboard (`Dashboard.tsx`)
- Add `MealPlanCard` below the DailyBriefingCard (paid users only)
- Free users see a teaser card with lock overlay

### Entitlements (`entitlements.ts`)
- Add `mealPlanning: "plus"` to `PAID_FEATURES`

### TodayActions (`TodayActions.tsx`)
- Add "Log your meals" as a daily action (paid only) with 🛰️ tip

## Calendar Integration
Reuse the existing `generate-calendar-reminder` pattern:
- `MealPlanCard` has "Add to Calendar" that generates a Google Calendar URL or .ics with meal prep times
- Morning meal prep reminder at 7am, evening prep at 5pm

## Implementation Order
1. Database migration (meal_logs, meal_plans tables + meal-photos bucket)
2. `ai-meal-analyze` edge function
3. `ai-meal-plan` edge function
4. `useMealTracking` hook
5. `MealLogEntry` component (photo + text input)
6. `MealTracker` modal (daily view with 4 slots)
7. `MealPlanCard` dashboard component
8. Wire into Dashboard, entitlements, and TodayActions
9. Calendar export for meal plans

## File Changes
- **New**: `supabase/functions/ai-meal-analyze/index.ts`, `supabase/functions/ai-meal-plan/index.ts`, `src/components/nutrition/MealTracker.tsx`, `src/components/nutrition/MealLogEntry.tsx`, `src/components/nutrition/MealPlanCard.tsx`, `src/hooks/useMealTracking.ts`
- **Edit**: `src/lib/entitlements.ts` (add mealPlanning feature), `src/pages/Dashboard.tsx` (add MealPlanCard), `src/components/dashboard/TodayActions.tsx` (add meal logging action), `supabase/config.toml` (new functions)
- **Migration**: Create meal_logs, meal_plans tables + meal-photos storage bucket with RLS

