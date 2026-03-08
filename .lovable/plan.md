

# Controllable Ownership — Each Character Leads Their Data Domain

## Concept
Each of the 5 Controllables becomes the visible "owner" of specific dashboard modules. Their emoji, accent color, and voice appear on the modules they govern. This makes the dashboard feel alive — like 5 specialists each reporting on their domain.

## Mapping

```text
🦉 Awareness  → Time Currency (screen time, time reflection)
🐢 Perspective → Integrity Meter (promises, long-term commitments)
🦈 Habit       → XP Momentum + Streak (consistency, daily reps)
🛰️ Wellness    → Brain & Body Tracker + Meal Tracking (already done)
🚀 Environment → Main Quest / Mission (shaping your world)
```

## Visual Changes Per Module

Each module gets three small additions:
1. **Character badge**: Emoji + label in the header (e.g., "🦉 Awareness" next to "Time Reflection")
2. **Accent border/tint**: Use existing CSS variables (`--awareness`, `--perspective`, `--habit`, `--wellness`, `--environment`) for a subtle left border or soft background tint
3. **One-liner voice**: A short contextual tip in the character's voice at the bottom of each module (similar to the Satellite tips already in BrainBodyTracker)

## File Edits

### `src/components/dashboard/TimeCurrencyModule.tsx`
- Add 🦉 badge + awareness accent color to header
- Add awareness-themed tip at bottom ("🦉 Notice where your minutes actually went.")
- Add subtle `border-l-2 border-awareness/30` styling

### `src/components/dashboard/IntegrityMeterModule.tsx`
- Add 🐢 badge + perspective accent color to header
- Add perspective-themed tip ("🐢 A kept promise compounds. A broken one teaches.")
- Add subtle `border-l-2 border-perspective/30` styling

### `src/components/dashboard/XpMomentumModule.tsx`
- Add 🦈 badge + habit accent color to header
- Add habit-themed tip ("🦈 Reps over results. Show up again.")
- Add subtle `border-l-2 border-habit/30` styling

### `src/components/dashboard/BrainBodyTracker.tsx`
- Already uses 🛰️ Wellness identity — just ensure consistent badge format matching the others

### `src/components/dashboard/MainQuestModule.tsx`
- Add 🚀 badge + environment accent color to header
- Add environment-themed tip ("🚀 Your mission shapes your environment.")
- Add subtle `border-l-2 border-environment/30` styling

### `src/components/nutrition/MealPlanCard.tsx`
- Already branded as 🛰️ — ensure consistent badge format

### `src/components/dashboard/ResetProgressModule.tsx`
- Add a dynamic badge that rotates based on `currentDay` (Day 1 = 🦉, Day 2 = 🐢, etc.) using the existing `getDayContent()` mapping

### Shared helper: `src/lib/controllableTheme.ts` (new)
- Export a small utility mapping controllable type → emoji, label, accent class, and voice tips
- Keeps the branding DRY across all modules

## Implementation Order
1. Create `controllableTheme.ts` shared utility
2. Update each of the 5 core modules (TimeCurrency, Integrity, XP, MainQuest, ResetProgress)
3. Ensure BrainBodyTracker + MealPlanCard use the same badge format
4. No database changes needed

