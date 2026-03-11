

# Reframe Dashboard as Intelligence Layer Between Calendar & Wearable

This is a large feature set with 5 distinct workstreams. Here's the implementation plan:

---

## 1. Plan vs Actual View — Add Wearable Data Track

**Current state:** `PlanVsActualView` exists but only shows planner items (planned tasks with done/missed/partial status). No wearable data is displayed.

**Changes:**

### `src/components/planner/PlanVsActualView.tsx` — Major rewrite
- Add a new `HealthMetrics` prop per day alongside the existing `items` array
- For each day card, show two side-by-side columns: **Planned** (existing task list) and **Actual** (wearable metrics: recovery %, sleep score, HRV, strain)
- Add a one-line AI observation per day when wearable data exists, generated client-side using simple heuristics (not an AI call — e.g. "Low recovery (32%) — 5 tasks scheduled. Consider lighter output.")
- Update the `PvADay` interface to include optional `health` field

### `src/pages/Planner.tsx` — Wire health data into PvA
- Import `useHealthData` and pass `trend` data (7-day array) into `pvaData`, matching by date
- Map each health row to the corresponding day in the week view

### `src/pages/Home.tsx` — Surface PvA on Dashboard
- Add a collapsible "Plan vs Actual" card to the dashboard layout
- Import `PlanVsActualView`, fetch planner items for the current week via `usePlanner`, and health data via `useHealthData`
- Show it below the greeting/rings section

---

## 2. Wearable-Aware Scheduling Banner

**Current state:** `PlannerWellnessBanner` already exists and shows recovery-based messages. It only uses today's data.

**Changes:**

### `src/components/planner/PlannerWellnessBanner.tsx` — Enhance for tomorrow forecast
- When viewing tomorrow's date in the Planner, fetch tomorrow's forecast (if available from `health_sync_data`) or use today's recovery as a proxy
- Show a dismissible banner with scheduling suggestions: "Your recovery is [score]%. Consider scheduling high-focus work in the morning and lighter tasks after 2pm."
- Add `useState` for dismissed state; only show when `selectedDate` is tomorrow

### `src/pages/Planner.tsx` — Pass `selectedDate` to banner
- Pass the currently selected date to `PlannerWellnessBanner` so it can tailor messaging for tomorrow vs today

---

## 3. Meal Plan → Calendar Write

### `src/components/nutrition/MealPlanCard.tsx` — Add "Add to Calendar" button
- After a meal plan is generated, show a prominent "Add to Calendar" button on each meal card
- On tap, call the existing `planner-gcal-push` edge function (or create a planner item with meal details that can then be pushed)
- Implementation: Create a planner item of type `time_block` with the meal name as title, prep time as duration, and grocery list in description. Then optionally push to Google Calendar if connected.
- Surface the button prominently in the meal plan results — not buried in a menu

### `src/hooks/useMealTracking.ts` — Add `addMealToPlanner` mutation
- New mutation that inserts a `planner_items` row with meal data and optionally triggers gcal push

---

## 4. Daily OS Briefing — Include Plan vs Actual Context

### `supabase/functions/ai-briefing/index.ts` — Enrich prompt with planner + wearable data
- Fetch yesterday's `health_sync_data` row (recovery score) for the user
- Fetch yesterday's `planner_items` count (total scheduled vs completed)
- Fetch today's `planner_items` count (scheduled load)
- Add these to `contextParts` before the AI call
- Update `systemPrompt` to instruct: "Open with a one-sentence readiness read before listing actions. Reference yesterday's recovery, yesterday's completion rate, and today's load."
- The briefing already fetches WHOOP data but doesn't include planner completion stats — add those

---

## 5. Landing Page Hero Update

### `src/pages/Landing.tsx` — Update hero section
- Replace the current h1 tagline with: "Your calendar knows what you planned. Your wearable knows what happened. The Dashboard connects the two."
- Add a three-icon visual below the hero text: Calendar icon → Dashboard logo → Wearable icon with label "Plan. Live. Learn."
- Keep the CTA and controllables grid intact

### `src/components/landing/HowItWorksSection.tsx` — Update first step
- Change the first item's title and description to lead with the calendar-wearable-dashboard framing instead of "Plan Your Day"

---

## Files Summary

| Action | File |
|--------|------|
| Edit | `src/components/planner/PlanVsActualView.tsx` — add health metrics track + AI observation |
| Edit | `src/pages/Planner.tsx` — wire health data into PvA |
| Edit | `src/pages/Home.tsx` — surface PvA card on dashboard |
| Edit | `src/components/planner/PlannerWellnessBanner.tsx` — tomorrow-aware dismissible banner |
| Edit | `src/components/nutrition/MealPlanCard.tsx` — add "Add to Calendar" button |
| Edit | `src/hooks/useMealTracking.ts` — add meal-to-planner mutation |
| Edit | `supabase/functions/ai-briefing/index.ts` — enrich with planner completion + today's load |
| Edit | `src/pages/Landing.tsx` — new hero tagline + three-icon visual |
| Edit | `src/components/landing/HowItWorksSection.tsx` — update first step framing |

