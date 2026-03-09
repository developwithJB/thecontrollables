

# Fix Controllable Hub: Better AI Responses + Always-Ready Chat

## Problems Identified

1. **AI response quality for food logging**: The wellness prompt tells the AI to always do a "systems check" and end with "→ ACTION:" — so when a user says "log 6 oz of steak", instead of confirming the log, it asks about hydration and gives generic advice. The prompt needs a food-logging instruction that acknowledges the request and confirms what was logged.

2. **Chat requires clicking a controllable first**: User must tap an avatar before they can type. The input should be immediately visible and ready.

3. **No suggested questions**: Users don't know what to ask. Need 3 controllable-specific prompt chips plus a "type your own" state.

## Plan

### 1. Fix AI Response Quality (`supabase/functions/ai-chat/index.ts`)

Add a food/wellness logging instruction to the wellness prompt so when a user says "log my food", the AI:
- Acknowledges exactly what they said (repeats the items back)
- Provides a quick macro estimate (protein, calories)
- Gives ONE relevant tip — not a systems check interrogation
- The `→ ACTION:` should be contextual, not generic

Add to the wellness prompt section:
```
[WHEN USER LOGS FOOD]
- Confirm exactly what they logged: "Logged: 6oz steak, 2 eggs, half avocado"
- Provide a quick estimate: ~65g protein, ~650 cal
- Give ONE relevant micro-tip, not a full systems check
- Do NOT interrogate them about hydration/sleep when they're just logging food
```

Also add `extractJsonFromResponse` and `detectTruncation` safety utilities for robustness on the response parsing side.

### 2. Redesign Hub to Chat-First (`ControllableHub.tsx`)

Replace the current two-state design (hub view vs. chat view) with a single unified view:

- **Always show the chat input** at the bottom, placeholder: "Ask the Controllables..."
- **Above the input**: Show 3 suggested prompt chips, each tagged to a specific controllable:
  - 🛰️ "Log my lunch" (Wellness)
  - 🦈 "What's my next rep?" (Habit)  
  - 🦉 "Help me see what's really going on" (Awareness)
- **Below the chips**: A subtle "or type your own question" label integrated with the always-visible input
- When user taps a chip or types and sends, the corresponding controllable animates to center stage and the chat begins — same as current chat view but triggered without the extra click
- The 5 avatars still appear but smaller, as a decorative row above the suggestions (visual identity, not primary interaction)

### 3. Bigger Chat Input

Replace `Input` with `Textarea` or increase input height. Use `min-h-[44px]` for better mobile tap target and readability.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | Add food-logging instructions to wellness prompt; add response cleaning utilities |
| `src/components/dashboard/ControllableHub.tsx` | Redesign to chat-first: always-visible input, 3 suggested chips, auto-route to controllable on send |

