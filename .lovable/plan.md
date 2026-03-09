

# Controllable Command Center + Data Import

## What We're Building

When all actions are complete in Command Mode, instead of showing "You're caught up", display the **5 Controllables as interactive characters** arranged in a hub. The user can tap any one to bring it to "center stage" with an animated transition, then chat with it inline. The selected Controllable can route the user to relevant app sections or handle tasks directly (e.g., Wellness/Satellite can log food inline).

Additionally, add **health data import** (Apple Health XML) and **screen time data import** (manual CSV/screenshot) as quick actions.

## Plan

### 1. Controllable Hub (replaces "You're caught up" state in `FocusedActionCard.tsx`)

New component `ControllableHub` rendered when `action === null`:
- Shows 5 controllable characters in a semi-circle/grid: Owl, Turtle, Shark, Satellite, Rocket
- Each is a tappable avatar (emoji + label) with idle animation (subtle bounce)
- Tapping one animates it to center stage (scale up, others fade/shrink)
- Below the focused character: an inline chat input that talks to the `ai-chat` edge function with that controllable's context
- The AI can respond with actionable suggestions like "I can log that for you" or "Let me take you there"
- Chat uses the existing `ai-chat` edge function — just embed a lightweight inline chat (not the full-screen `AIChat` modal)

### 2. Inline Chat in Hub (`ControllableHub` subcomponent)

- Minimal chat: last 3-4 messages visible, input at bottom
- Uses `supabase.functions.invoke('ai-chat', { body: { controllable, messages } })`
- When the AI suggests navigation (e.g., "go to meal planning"), show a button that triggers the corresponding quick action callback

### 3. Health & Screen Time Import (quick actions)

Add two new quick actions to the "I want to..." bar in `CommandModeView`:
- **Import Health**: Opens a file picker for Apple Health XML export → calls existing `parse-health-export` edge function → stores in `health_sync_data`
- **Import Screen Time**: Opens a simple manual entry form (daily hours by category) since iOS doesn't export screen time programmatically — stores in a new lightweight local state or existing wellness notes

### Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/FocusedActionCard.tsx` | Replace "caught up" empty state with `ControllableHub` |
| `src/components/dashboard/ControllableHub.tsx` | **New** — 5 characters + inline chat + center-stage animation |
| `src/components/dashboard/CommandModeView.tsx` | Add Health Import and Screen Time quick actions, pass callbacks to hub |
| `src/pages/Dashboard.tsx` | Wire health import handler (file picker + edge function call) |

No database migration needed — health data goes into existing `health_sync_data` table, screen time can go as a `source: 'screentime'` entry in the same table or wellness notes.

