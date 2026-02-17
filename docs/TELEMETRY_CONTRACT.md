# Telemetry Contract

This document defines canonical product KPI events shared across frontend and backend systems.

## Canonical events

| Event name | Required properties | Emitted from |
| --- | --- | --- |
| `user_signed_up` | `source`, `timestamp` | `useOnboardingAnalytics.trackAccountCreated` |
| `assessment_completed` | `archetype`, `timestamp` | `useOnboardingAnalytics.trackAssessmentCompleted` |
| `snapshot_started` | `journey_id`, `skipped_assessment`, `timestamp` | `useOnboardingAnalytics.trackOnboardingComplete` |
| `checkin_completed` | `timestamp` | `useActionTracking.trackResetAction` when action = `day_complete` |
| `promise_created` | `timestamp`, `promise_action` | `useActionTracking.trackPromiseAction` when action = `create` |
| `promise_reviewed` | `timestamp`, `promise_action` | `useActionTracking.trackPromiseAction` when action = `kept`/`broken` |
| `paywall_viewed` | `timestamp` (optionally `modal_name`) | `useActionTracking.trackUpgradeAction`, `useActionTracking.trackModalAction` |
| `snapshot_completed` | `timestamp` | `useActionTracking.trackResetAction` when action = `complete` |

## Routing rules

- **Primary sink:** PostHog via `posthog.capture(...)` in `useAnalytics.trackEvent`.
- **Secondary sink (optional):** Supabase event tables enabled only when `VITE_ENABLE_SUPABASE_ANALYTICS=true`.
- **Error monitoring:** Sentry for global runtime errors and handled exceptions.

## Stability policy

- Canonical event names in this file are treated as a contract and should not be renamed without a coordinated frontend/backend migration.
- Any new KPI event must be added here with required properties and source location before release.
