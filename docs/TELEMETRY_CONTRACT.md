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

## Growth events

The always-on growth sink inserts into `app_events` using the existing anon/authenticated INSERT policy (20260120202139_d3d198ac-cc41-4f44-9c9f-0c18308f63db.sql:61–65); no migration is required. Production RLS has not been verified. Rejected inserts enter a local buffer (50 events, seven days), retried once after the next SIGNED_IN event and then discarded. PostHog receives the same safe properties only when configured.

| Event | Props | Emit location |
| --- | --- | --- |
| landing_view | none | Landing, signed out |
| quick_start_step_viewed | step | QuickStart step change |
| signup_form_viewed | none | Auth signup mode |
| signup_submitted | none | Auth successful signUp |
| signup_failed | reason_category | Auth signup failure |
| first_circuit_completed | track | FormationCircuit first successful completion per signed-in user/device |
| book_link_click | placement | Reserved for follow-up integration |
| book_nudge_viewed | placement | Reserved |
| book_nudge_dismissed | placement | Reserved |
| share_clicked | method, surface | Reserved |
| share_completed | method, surface | Reserved |

The property allowlist is placement, step, reason_category, method, surface, track, reading_status. First-touch utm_source, utm_medium, utm_campaign, utm_content, ref and hostname-only referrer_host are added automatically, plus app_version. No names, emails, full URLs, other query strings, prayer, reflection, proof, notes, health, nutrition, scripture annotations or Control/Release/Move text are permitted. Paths contain only pathname; attribution values are lowercase [a-z0-9._-], at most 64 characters. Event strings are at most 80 characters and reject URL/email/data markers. Landing fires once per session; growth events are capped at 30 per session. Storage is best effort and is never authorization.

`user_id` comes from the current session but remains client-supplied and untrusted for security purposes. The pre-existing INSERT policy can be spammed and does not enforce auth.uid(); any hardening migration requires separate JB authorization. First-circuit dedupe is device-local and can reset when storage is cleared. Signup source is informational raw user metadata, never an entitlement.
