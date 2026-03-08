

# AI-Forward Upgrade: Controllables Deeply Integrated

## Current State
- AI Guide Panel lives as a collapsible card on the Dashboard, only surfaced as a Day 5 action
- Non-streaming responses (full response arrives at once)
- No AI presence during the daily check-in ritual (ResetDay)
- No AI-generated daily content personalization
- Insights are a separate premium-only feature disconnected from the daily flow
- The 5 Controllables appear as guide selectors but don't proactively engage users

## What Gets Built

### 1. Streaming AI Responses
Upgrade `ai-chat` edge function to stream SSE tokens and render them live in the AIGuidePanel. Transforms the interaction from "send and wait" to a fluid, modern chat feel.
- Edge function returns `text/event-stream` instead of buffered JSON
- Frontend parses SSE line-by-line, updating assistant message token-by-token
- Loading state shows typing indicator with guide emoji

### 2. AI Reflection Coach on Daily Check-In (ResetDay)
After the user submits their daily reflection on the ResetDay screen, show a brief AI-generated response from the day's Controllable — a 1-2 sentence observation rooted in the knowledge base.
- New edge function `ai-reflect` — lightweight, takes the user's reflection text + day context, returns a short coached response (50 words max)
- Appears as a subtle card below the completion button: `🦉 "You noticed the gap. That's the rep."`
- Uses the day's Controllable character automatically (Day 1 = Awareness Owl, Day 2 = Perspective Turtle, etc.)
- Available to all users (free gets 1/day, paid unlimited) — this is the hook

### 3. AI Morning Briefing Card
A new `DailyBriefingCard` on the Dashboard that appears each morning with a personalized AI-generated micro-briefing based on the user's current snapshot day, build scores, and recent patterns.
- New edge function `ai-briefing` — generates a 3-line briefing: (1) pattern observation, (2) today's controllable focus, (3) one actionable suggestion
- Cached per user per day in a new `daily_briefings` table
- Shows the relevant Controllable emoji and name
- Replaces the static "Use a guide when you're stuck" tagline with dynamic, personalized content
- Premium feature, free users see a teaser line

### 4. Controllable of the Day — Proactive Guide Nudges
Instead of waiting for users to open the AI panel, the relevant Controllable proactively surfaces a one-liner on the Dashboard based on the day's theme.
- Integrated into the existing `TodayActions` component as a contextual tip below each action item
- E.g., on Day 4 (Habit day): 🦈 *"You don't need motivation. You need one rep."*
- These are pulled from the existing `controllables-knowledge.ts` quotes, no API call needed
- Clicking the tip opens the AI Guide Panel with that Controllable pre-selected

### 5. "Ask The Controllables" on Every Day (Not Just Day 5)
Promote AI interaction from a Day 5-only action to an always-available daily action.
- Add "Ask The Controllables" to `TodayActions` for every day of the snapshot (not just Day 5)
- Keep it as a secondary action (not blocking completion) but always visible
- For free trial users, this drives engagement with the AI system daily

### 6. Post-Reflection AI Follow-Up
After the user completes their daily check-in and returns to the Dashboard, show a contextual follow-up from the day's Controllable in the AI Guide Panel.
- Auto-populate the first message in the guide panel with context: "You just reflected on [topic]. Here's what I noticed..."
- Uses the user's reflection text from the daily reset as conversation context
- Pre-selects the day's Controllable as the active guide

## Database Migration
- New `daily_briefings` table: `id`, `user_id`, `briefing_date` (date), `content` (text), `controllable` (text), `created_at`
- RLS: user can SELECT/INSERT own rows only

## Implementation Order
1. Database migration (daily_briefings table)
2. Streaming upgrade to `ai-chat` edge function + frontend SSE parser
3. `ai-reflect` edge function for post-check-in coaching
4. ResetDay integration (show AI reflection after submission)
5. `ai-briefing` edge function for morning briefing
6. `DailyBriefingCard` dashboard component
7. Controllable-of-the-day quotes in TodayActions
8. "Ask The Controllables" promoted to every-day action
9. Post-reflection auto-context in AI Guide Panel

## File Changes
- **New**: `supabase/functions/ai-reflect/index.ts`, `supabase/functions/ai-briefing/index.ts`, `src/components/dashboard/DailyBriefingCard.tsx`
- **Edit**: `supabase/functions/ai-chat/index.ts` (streaming), `src/components/dashboard/AIGuidePanel.tsx` (SSE parsing, auto-context), `src/components/ResetDay.tsx` (post-reflection AI card), `src/components/dashboard/TodayActions.tsx` (every-day AI action + controllable tips), `supabase/config.toml` (new functions)
- **Migration**: Create `daily_briefings` table

