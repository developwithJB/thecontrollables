

# Fix Build Error + Dashboard UX Overhaul Plan

## 1. Fix Build Error (Blocking)

The `@dnd-kit/sortable@^10.0.0` is incompatible with `@dnd-kit/core@^6.3.1`. Version 10 of sortable requires core v10+. Additionally, `@dnd-kit/utilities` (used in `PlannerItemRow.tsx`) is not listed in `package.json` at all.

**Fix:** Downgrade `@dnd-kit/sortable` to `^8.0.0` (compatible with core v6) and add `@dnd-kit/utilities` to dependencies. This is the minimal change to unblock the build.

## 2. Dashboard UX Redesign — "Command Mode" vs "Control Mode"

The core problem: the dashboard is an endless scroll of modules all competing for attention. The fix is a two-mode dashboard architecture.

### Mode A: **Command Mode** (Default)
A focused, prompt-driven interface. The system presents ONE thing at a time:
- A single primary action card (e.g., "Log your check-in", "Review yesterday's plan")
- When completed, the next action surfaces automatically
- Background modules are hidden — no scrolling
- The Operator Console drives the flow
- Quick-access FAB for "I want to..." (eat, plan, review, track money, etc.)

### Mode B: **Control Mode** (Manual Override)
The current scrollable dashboard with all modules visible. Users enter this via a "Take Control" toggle in the header. This is for reviewing data, analyzing trends, and manually interacting with any module.

### Key Changes:

**a) Dashboard Header**
- Add a toggle: "Command" ↔ "Control" (pill switch)
- Command mode shows the Operator prompt flow
- Control mode reveals the full module grid

**b) Command Mode Flow**
- Single `FocusedActionCard` component that shows one task
- Queue-based: system determines priority order
- "Done" / "Skip" / "Tell me more" actions
- After all priority actions: "You're caught up. Explore or come back later."

**c) Wellness Conversation**
- Replace the static fuel-check display with an interactive wellness prompt
- "How's your fuel today?" → user can respond with context: "I'm moving Thursday, no groceries until then"
- System adjusts meal suggestions and wellness expectations accordingly
- Store these contextual notes in a `wellness_context` field

**d) Planned vs Actual View**
- New `PlannerPvA` (Plan vs Actual) component
- Rolling day/week view showing planned items alongside confirmed completions
- Color-coded: green = done, amber = partial, red = missed, gray = planned
- "Push to calendar" button for integrated calendar export

**e) Meal Selection — Swipe Interface**
- Replace meal plan generation with a card-swipe selector
- Show one meal card at a time with recipe details
- Swipe right = add to plan, left = skip, up = save to library
- Personal recipe library stored in a `user_recipes` table
- Weekly meal builder from saved library items

### Files Summary:

| Action | Path |
|--------|------|
| Edit | `package.json` — fix dnd-kit versions |
| Edit | `src/pages/Dashboard.tsx` — add Command/Control mode toggle |
| Create | `src/components/dashboard/CommandModeView.tsx` — focused single-action flow |
| Create | `src/components/dashboard/ControlModeView.tsx` — existing modules wrapped |
| Create | `src/components/dashboard/FocusedActionCard.tsx` — single prompt card |
| Create | `src/components/dashboard/WellnessConversation.tsx` — interactive fuel check |
| Create | `src/components/planner/PlanVsActualView.tsx` — planned vs confirmed |
| Create | `src/components/nutrition/MealSwiper.tsx` — tinder-style selector |
| Create | `src/components/nutrition/RecipeLibrary.tsx` — saved recipes |
| Migration | `user_recipes` table, `wellness_context` on profiles |
| Edit | `src/components/planner/PlannerDayView.tsx` — remove broken import if needed |
| Edit | `src/components/planner/PlannerItemRow.tsx` — fix utilities import |

### Scope for This Pass:
1. Fix the build error (dnd-kit versions)
2. Implement Command/Control mode toggle on dashboard
3. Build the focused Command Mode flow
4. Build the Planned vs Actual view for planner
5. Build the meal swipe selector prototype

The wellness conversation and recipe library are natural follow-ups once the core mode system is working.

