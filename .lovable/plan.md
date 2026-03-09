

# Remove "Ask The Controllables" Daily Action

The "Ask The Controllables" action is still being pushed as a daily action in `TodayActions.tsx` and as a fallback in the `daily-os-plan` edge function. Since the Controllable Hub is now the persistent focus area in Command Mode, this action is redundant and creates a confusing split experience.

## Changes

### 1. `src/components/dashboard/TodayActions.tsx`
- Remove the `ask-guide` action block (lines ~334-343) that pushes "Ask The Controllables" into the daily actions list
- Remove the associated `askGuideDoneToday` state, storage key, and completion tracking logic (lines ~149-153 and any related effects)
- Remove the `onOpenAIGuide` prop if it's only used for this action

### 2. `supabase/functions/daily-os-plan/index.ts`
- Remove the `ask_guide` fallback entry (lines ~125-133) that fills the top-three with "Ask The Controllables one question" when fewer than 3 actions exist

### 3. `src/components/dashboard/CommandModeView.tsx`
- Remove `askGuideCompleted` from props if it's no longer needed anywhere after the above cleanup

### 4. Any parent components passing `askGuideCompleted` or `onOpenAIGuide`
- Clean up unused prop drilling in `Dashboard.tsx` and `TodayActions` parent

This keeps the Operator Console as the single focused experience with the Controllable Hub always available inline — no duplicate entry point.

