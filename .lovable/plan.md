

# Add Typing Indicator to Archetype AI Interpretation

## Problem
When the AI interpretation is loading (lines 182-201), the component shows the static fallback immediately. There's no visual indicator that an AI-generated response is on its way.

## Solution
Track a `loading` state alongside `aiInterpretation`. While loading, show a subtle typing indicator with the weakest Controllable's emoji and a pulsing dot animation. Once the AI response arrives, crossfade to the interpretation. If it fails, crossfade to the static fallback.

## Changes — single file: `OnboardingArchetypeResult.tsx`

1. Add `isLoadingAI` state (default `true`), set to `false` when the fetch completes or errors
2. Replace the fallback block (lines 194-200) with a loading state check:
   - **Loading**: Show `weakestLabel.emoji` + `"{name} is reading your results..."` with 3 animated dots (opacity pulse, staggered)
   - **Failed/no result**: Show existing static fallback
3. Wrap the interpretation/loading/fallback content in `AnimatePresence` for a smooth crossfade transition

The typing dots will use Framer Motion's `animate` with a repeating opacity cycle (`[0.3, 1, 0.3]`) staggered across 3 `<span>` dots — no new dependencies needed.

