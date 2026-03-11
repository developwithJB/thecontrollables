

# New User Onboarding Rewrite

## Overview
Replace the assessment-first onboarding with an integration-first flow: Welcome → Google Calendar → Wearable → (then existing assessment/snapshot flow). This matches the landing page promise of "Plan ↔ Learn ↔ Live."

## New Flow Sequence

```text
welcome_integrations → connect_calendar → connect_wearable → build_assessment → ...existing flow
```

## Changes

### 1. New Component: `OnboardingWelcome.tsx`
Full-screen card with:
- Headline: "Your calendar knows what you planned. Your wearable knows what happened. The Dashboard connects the two."
- Subtext: "Setup takes 2 minutes. Connect your calendar and wearable and The Dashboard starts working immediately."
- CTA: "Let's connect your tools →"
- Small muted skip text: "You can skip and add these later — but the app is most useful with them."
- Skip advances directly to `build_assessment`

### 2. New Component: `OnboardingCalendarConnect.tsx`
Full-screen card for Google Calendar:
- Calendar icon + "Google Calendar" + description: "We read your events to build your Plan. We write Snapshot actions and meal blocks back to your calendar."
- Large "Connect Google Calendar" button — reuses the OAuth logic from `useConnectProvider` (calls `integration-oauth-start` with provider `google_calendar`, opens popup, listens for `postMessage`)
- "Skip for now" link below
- On success: show "✓ Calendar connected. We can see your week." with auto-advance after 1.5s

### 3. New Component: `OnboardingWearableConnect.tsx`
Full-screen card with tabs (WHOOP default, Oura, Fitbit):
- Each tab: brand name + description: "We read your daily recovery, HRV, sleep, and strain to show you why your days feel the way they do."
- Connect button triggers `wearable-oauth-start` (reuses `HealthDataSync.handleConnect` logic but with popup approach for consistency)
- "I don't use a wearable — skip this" link at bottom
- On success: "✓ Wearable connected. We'll pull your data each morning." with auto-advance after 1.5s

### 4. Update `OnboardingFlow.tsx`
- Add new internal steps: `"welcome_integrations"`, `"connect_calendar"`, `"connect_wearable"` before `"build_assessment"`
- Change default `initialStep` to `"welcome_integrations"`
- Add step rendering for the three new components
- Wire navigation: welcome → calendar → wearable → build_assessment
- Skip from welcome jumps to build_assessment directly

### 5. Update `useOnboarding.ts`
- Add `"welcome_integrations"` to the `OnboardingStep` type so progress can be persisted
- Keep backward compatibility: existing users with `build_assessment` step still work

### 6. Update `index.ts`
- Export the three new components

## Files to Change

| File | Change |
|------|--------|
| `src/components/onboarding/OnboardingWelcome.tsx` | New — welcome & positioning screen |
| `src/components/onboarding/OnboardingCalendarConnect.tsx` | New — Google Calendar connection step |
| `src/components/onboarding/OnboardingWearableConnect.tsx` | New — Wearable connection step with tabs |
| `src/components/onboarding/OnboardingFlow.tsx` | Add 3 new steps at the start of the flow |
| `src/hooks/useOnboarding.ts` | Extend `OnboardingStep` type |
| `src/components/onboarding/index.ts` | Export new components |

No database migration needed — the `onboarding_step` column is already a text field that accepts any string value.

