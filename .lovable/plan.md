

# Plan: Add Tool-Calling to AI Chat for App Actions

## Problem
The AI chat guides (Owl, Shark, etc.) can only generate text responses. When users ask to perform app actions like "clear my planned meals," the AI philosophizes instead of executing. The screenshot shows the Owl responding to a meal-clearing request with a mindfulness exercise.

## Solution
Add tool-calling capability to the `ai-chat` edge function so the AI can detect action requests and execute them server-side (e.g., delete meal plans, add planner items). Return both a confirmation message and an `actions_taken` array so the frontend can invalidate relevant queries.

## Changes

### 1. Update `ai-chat` edge function with tools

**`supabase/functions/ai-chat/index.ts`**

- Add a `tools` array to the AI API call with functions like:
  - `clear_meal_plans` — params: `{ date_from: string, date_to?: string, meal_types?: string[] }` — deletes rows from `meal_plans` for the user
  - `add_meal_plan` — params: `{ date: string, meal_type: string, name: string, description: string }` — upserts a meal into `meal_plans`
  - `delete_planner_item` — params: `{ item_id?: string, title_match?: string }` — removes planner items
- After receiving the AI response, check for `tool_calls` in the response
- Execute each tool call using the service client (already available), scoped to the authenticated `userId`
- If tool calls were made, do a second AI call with the tool results so the AI can compose a natural confirmation message
- Return `{ message, actions_taken: string[] }` where `actions_taken` lists which tools fired (e.g., `["clear_meal_plans"]`)

- Add to the system prompt a section explaining the user is inside a self-leadership app and the AI can perform actions when asked, but should still weave in the controllable's voice

### 2. Update frontend to handle actions

**`src/components/AIChat.tsx`**

- After receiving a response with `actions_taken`, invalidate relevant react-query keys:
  - `"clear_meal_plans"` or `"add_meal_plan"` → invalidate `["meal-plan"]`, `["meal-logs"]`
  - `"delete_planner_item"` → invalidate `["planner-items"]`
- Show a subtle toast confirming the action (e.g., "Meals cleared")
- Import `useQueryClient` and call `queryClient.invalidateQueries()` for the affected keys

## Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/ai-chat/index.ts` — add tools array, tool execution logic, second-pass confirmation |
| Edit | `src/components/AIChat.tsx` — handle `actions_taken` response, invalidate queries |

