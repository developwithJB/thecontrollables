

# Phase 2: Fuel Plan Intelligence Layer

## Current State
- **FuelTodayCard**: Shows tonight's meal, next unplanned slot, grocery gap warning. No body/calendar awareness.
- **MealPlanBuilder**: Uses mood chips (Light & fresh, High protein, Comfort food, Surprise me). No body or calendar context passed to AI.
- **ai-meal-plan edge function**: Generates meals based on preferences/mood. No awareness of recovery, calendar load, or budget.
- **GroceryRhythmCard**: Shows weekly meal count + takeout risk + calendar-aware spending warning. Solid as-is.
- **PlannerBodyContext + TodayReadinessBar**: Already combine body + calendar signals. No fuel context.
- **AI Briefing**: Already includes meal plan context in prompts. Already handles "low recovery + unplanned meals" in prompt rules.
- **CalendarIntelligence utility**: Already produces dayType, meetingCount, etc.

## What to Build

### 1. New Utility: `src/lib/fuelIntelligence.ts`
Pure function that takes body state (recovery, sleep, strain) + calendar intel + meal plan data and produces fuel guidance.

**Inputs**: `{ recovery?: number, sleepMinutes?: number, strain?: number, calendarDayType?: string, meetingCount?: number, hasMeals: boolean, mealCount: number }`

**Outputs**:
```typescript
interface FuelIntelligence {
  mealFit: "quick_easy" | "recovery_friendly" | "high_protein" | "prep_friendly" | "standard";
  suggestion: string;       // e.g. "Low recovery — choose easy, supportive meals"
  dinnerAdvice: string | null; // e.g. "Tonight's plan may be too ambitious for your schedule"
  tags: string[];           // suggested meal tags for the AI
}
```

Rules:
- Low recovery → "recovery_friendly", suggest easy supportive meals
- High strain → "high_protein", prioritize protein
- Heavy/fragmented day → "quick_easy", reduce prep effort
- Light/focus/recovery day → "prep_friendly", good for cooking
- Poor sleep → reduce decision fatigue, suggest familiar meals

### 2. Enhance FuelTodayCard — Body + Calendar Context
**File**: `src/components/dashboard/FuelTodayCard.tsx`

Accept optional `fuelIntel` prop (`FuelIntelligence | null`). When present, show a contextual line above the dinner row:
- "Recovery is low — keep meals simple tonight"
- "Busy evening ahead — tonight's plan may need a simpler swap"
- "Light evening + strong readiness — good time for a higher-prep meal"
- "Sleep was short — choose something familiar and easy"

### 3. Enhance MealPlanBuilder — Pass Context Tags to AI
**File**: `src/components/nutrition/MealPlanBuilder.tsx`

Accept optional `contextTags` prop (string[]). Pass these to `onGenerate` so the edge function receives body/calendar context. Show a small context chip at the top of the builder: e.g., "🔋 Recovery mode — suggesting easier meals".

### 4. Enhance ai-meal-plan Edge Function — Use Context Tags
**File**: `supabase/functions/ai-meal-plan/index.ts`

Accept optional `context_tags` and `body_context` in the request body. Add to system prompt:
- "Context: The user is having a [heavy/light] day with [low/strong] recovery. Prioritize [quick, easy, recovery-friendly] meals."

### 5. Compute + Pass FuelIntelligence in Home.tsx
**File**: `src/pages/Home.tsx`

Import `getFuelIntelligence` from the new utility. Compute it from existing `healthLatest` + `calendarIntel` + `todayPlan` data (already available). Pass to `FuelTodayCard`.

### 6. Compute + Pass FuelIntelligence in Planner.tsx
**File**: `src/pages/Planner.tsx`

Compute `fuelIntel` for the selected day. Pass `contextTags` to the `MealPlanBuilder` that's embedded in `PlannerDayView` (if applicable — check if builder is used there).

### 7. Enhance GroceryRhythmCard — Recovery Context
**File**: `src/components/money/GroceryRhythmCard.tsx`

Accept optional `recoveryLow` boolean. When true + few meals planned:
- "Low recovery + no meal plan = higher convenience spending risk"

### 8. Enhance ai-briefing — Cross-reference Body + Meals
Already done well. Add one additional rule to the prompt:
- "If recovery is low and meals are planned, acknowledge the preparation. If strain is high, suggest protein-focused meals."

## Files to Create
| File | Purpose |
|---|---|
| `src/lib/fuelIntelligence.ts` | Pure utility: derive meal guidance from body + calendar state |

## Files to Modify
| File | Change |
|---|---|
| `src/components/dashboard/FuelTodayCard.tsx` | Accept fuelIntel prop, show contextual guidance line |
| `src/components/nutrition/MealPlanBuilder.tsx` | Accept contextTags prop, show context chip, pass to generation |
| `supabase/functions/ai-meal-plan/index.ts` | Accept context_tags/body_context, add to system prompt |
| `src/pages/Home.tsx` | Compute fuelIntel, pass to FuelTodayCard |
| `src/pages/Planner.tsx` | Compute fuelIntel for selected day |
| `src/components/money/GroceryRhythmCard.tsx` | Accept recoveryLow prop, enhanced insight |
| `supabase/functions/ai-briefing/index.ts` | Add recovery+meal cross-reference prompt rule |

## What Does NOT Change
- No database migrations
- MealSwiper stays as-is
- WellnessFuelSummary stays as-is
- Existing GroceryRhythmCard logic preserved, just extended
- All body intelligence and calendar intelligence components unchanged

