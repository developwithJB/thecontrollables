

# Connection Summary Screen

## What to build
A new `OnboardingConnectionSummary` component shown between the wearable step and the build assessment. It displays a table of what was connected (or skipped) and what The Dashboard does with each integration, then a CTA to continue.

## Approach

### New component: `src/components/onboarding/OnboardingConnectionSummary.tsx`
- Props: `calendarConnected: boolean`, `wearableConnected: boolean`, `wearableProvider?: string`, `onContinue: () => void`
- Renders a two-column summary (What you connected / What The Dashboard does with it)
- Connected items show a green check; skipped items show muted text with "not connected yet (add in Settings)"
- CTA button: "Show me my dashboard →"

### Track connection state in `OnboardingFlow.tsx`
- Add `calendarConnected` and `wearableConnected` state booleans (default `false`)
- Set `calendarConnected = true` in the `onConnected` callback of `OnboardingCalendarConnect`
- Set `wearableConnected = true` in the `onConnected` callback of `OnboardingWearableConnect`
- Insert a new `"connection_summary"` step after `connect_wearable` and before `build_assessment`
- Add `"connection_summary"` to the `InternalOnboardingStep` union
- Both wearable connected/skip handlers advance to `connection_summary` instead of `build_assessment`
- The summary's `onContinue` advances to `build_assessment` and persists the step

### Update exports in `index.ts`
- Add `OnboardingConnectionSummary` export

## Files to change

| File | Change |
|------|--------|
| `src/components/onboarding/OnboardingConnectionSummary.tsx` | New component |
| `src/components/onboarding/OnboardingFlow.tsx` | Track connection state, add `connection_summary` step |
| `src/components/onboarding/index.ts` | Export new component |

