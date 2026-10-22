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

- **Growth sink:** `trackGrowthEvent` sends sanitized events through `sendTelemetry` to the bounded `ingest-telemetry` Edge Function, independently of optional PostHog configuration.
- **Optional analytics:** `useAnalytics.trackEvent` also routes through the gateway when Supabase analytics is enabled. PostHog is off by default: initialization, identity/reset calls, and capture require both `VITE_ENABLE_POSTHOG=true` and a project key. Enable only after JB verifies ownership of the destination. The connected PostHog account was disclaimed by JB on October 22, 2026; do not use it. This operator opt-in is not automatic ownership verification or database authorization.
- **Error monitoring:** Sentry for global runtime errors and handled exceptions.

## Stability policy

- Canonical event names in this file are treated as a contract and should not be renamed without a coordinated frontend/backend migration.
- Any new KPI event must be added here with required properties and source location before release.

## Growth events

The always-on growth sink calls `ingest-telemetry`; direct anon/authenticated writes to event tables are denied. The server validates allowed origins, bounded payloads, event/property allowlists, and rate limits, then derives authenticated identity from a validated session. Optional PostHog receives sanitized properties only when explicitly enabled for a verified owner-controlled project. Failed growth requests enter a best-effort local buffer (50 events, seven days), retried once after the next SIGNED_IN event and then discarded.

| Event | Props | Emit location |
| --- | --- | --- |
| landing_view | optional placement | Landing, signed out; /start campaign entry |
| quick_start_step_viewed | step | QuickStart step change |
| signup_form_viewed | none | Auth signup mode |
| signup_submitted | none | Auth successful signUp |
| signup_failed | reason_category | Auth signup failure |
| first_circuit_completed | track | FormationCircuit first successful completion per signed-in user/device |
| book_link_click | placement | Shared BookLink on landing, onboarding, formation, pricing, and other existing placements |
| book_nudge_viewed | placement | Reserved |
| book_nudge_dismissed | placement | Reserved |
| share_clicked | method, surface | Reserved |
| share_completed | method, surface | Reserved |
| authenticated_visit | none | Auth, once per account/browser session after a confirmed session |
| day7_return | track | Today, sixth local calendar date after signup (signup day is day 1) |
| checkout_requested | placement, method (interval) | useEntitlements, checkout request starts |
| checkout_opened | placement, method (interval) | useEntitlements, checkout URL returned, before navigation; not proof of payment |
| checkout_failed | reason_category | useEntitlements, checkout request failed |
| pro_offer_viewed | placement | ProOfferCard, rendered; not a viewport/attention guarantee |
| pro_offer_clicked | placement | ProOfferCard, See Pro plans |
| pro_offer_dismissed | placement | ProOfferCard, Keep practicing free |

The property allowlist is placement, step, reason_category, method, surface, track, reading_status. First-touch utm_source, utm_medium, utm_campaign, utm_content, ref and hostname-only referrer_host are added automatically, plus app_version. Last-campaign utm_source, utm_medium, utm_campaign and utm_content are added with a `last_` prefix; internal reloads do not erase that campaign. No names, emails, full URLs, other query strings, prayer, reflection, proof, notes, health, nutrition, scripture annotations or Control/Release/Move text are permitted. Paths contain only pathname; attribution values are lowercase [a-z0-9._-], at most 64 characters. Event strings are at most 80 characters and reject URL/email/data markers. Landing fires once per session; growth events are capped at 30 per session. Storage is best effort and is never authorization.

Before checkout navigation, a bounded 300ms flush gives pending growth events a chance to reach the sink without blocking checkout indefinitely. These browser milestones never grant billing access; signed Stripe processing and the resulting server subscription record remain authoritative. See the [launch acceptance brief](launch/first100-funnel-2026-10-21.md) for cohort definitions and production verification limits.

Client user IDs are not trusted authority; the gateway derives identity. Client throttles and first-circuit deduplication are best-effort analytics controls, not security boundaries. The server has its own actor/global write limits. Clearing browser storage can reset local deduplication. Signup attribution is informational metadata, never an entitlement.

Server validation and limits live in `supabase/functions/ingest-telemetry` and `_shared/telemetry.ts`; frontend sanitizers live in `src/lib/growthEvents.ts` and `growthAttribution.ts`. Do not send prompts, private notes, proof, health payloads, credentials, raw exception bodies, or signed URLs. Telemetry failure must not block the user’s action.
