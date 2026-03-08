

## Plan: Meal Sharing, Calendar Integration & Brain Body UX Fix

### Problem
1. **Calendar**: Only today's plan can be added to calendar; no way to add the full week plan
2. **Sharing**: No way to share meal plans or create social "share cards" for what you're eating
3. **Brain & Body**: Red/colored factor chips (Sleep, Movement, Screen, Nutrition) have no explanation — users don't know what the colors mean or what clicking them does

### Changes

#### 1. Add Week Plan to Calendar
**File: `src/components/nutrition/MealWeekComparison.tsx`**
- Add a "Add Week to Calendar" button that generates a Google Calendar event (or .ics file) spanning the week with all meals listed in the description
- Reuse the calendar URL pattern from `MealPlanCard.tsx` but for all 7 days

#### 2. Shareable Meal Cards
**File: `src/components/nutrition/MealShareCard.tsx`** (new)
- Create a visually styled share card component that renders a meal summary for a day or week
- Three share modes: "I'm eating today 🍽️", "Here's my week plan 📋", "I ate today ✅"
- Card shows meal names, calorie totals, and macro breakdown in a branded layout
- Uses `html2canvas` (already installed) to convert the card to an image for sharing

**File: `src/components/nutrition/MealPlanCard.tsx`**
- Add a Share button next to the existing "Add to Calendar" button
- Opens a bottom sheet with the share card preview and share/copy options
- Uses Web Share API with `html2canvas` image fallback

**File: `src/components/nutrition/MealWeekComparison.tsx`**
- Add share button for the week view that generates a week summary share card

**File: `src/components/nutrition/GroceryListSheet.tsx`**
- Already has share — no changes needed

#### 3. Brain & Body Factor Explanation
**File: `src/components/dashboard/BrainBodyTracker.tsx`**
- Make each `FactorChip` clickable — tapping shows a tooltip/popover explaining:
  - What the factor measures
  - What the color means (green = 70+, amber = 40-69, red = below 40)
  - How to improve it
- Add a small info icon or "What's this?" link near the score rings explaining the 0-100 scale
- Add a legend row below the chips: "🟢 Good · 🟡 Fair · 🔴 Needs work"

### Files Changed

| File | Change |
|---|---|
| `src/components/nutrition/MealShareCard.tsx` | New shareable card component with html2canvas export |
| `src/components/nutrition/MealPlanCard.tsx` | Add Share button, share card dialog for today's plan |
| `src/components/nutrition/MealWeekComparison.tsx` | Add "Add Week to Calendar" and "Share Week" buttons |
| `src/components/dashboard/BrainBodyTracker.tsx` | Make factor chips clickable with explanations, add color legend |

