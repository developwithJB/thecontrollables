# PR95 review and release - October 22, 2026

Review baseline: `ff591a4`, PR95 against main. Scope: review/fix/merge, deploy only `ingest-telemetry`, set hosted Auth minimum to eight, publish through Lovable, and smoke signup/Pro entry with PostHog off. No migration, pricing change, live charge, real AI invocation, content approval, notification, credential creation, or broad account access is part of the automated release.

## Review fix

The day-seven offer already checked server-confirmed billing status, but the sample-exhaustion placement only inspected hosted allowance. Legacy app access can legitimately have a free hosted sample; exhausting that sample should not prompt another subscription. Both placements now use AccountProOffer, which requires server-verified unpaid non-legacy access and an enabled free hosted allowance. The sample placement also rechecks exhaustion against the latest allowance. No allowance/billing authorization rule changes.

Four new unit regressions cover paid, legacy, unverified and verified-free accounts at the sample placement. A local desktop/mobile regression covers legacy app access with an exhausted sample. Existing free/BYO alternatives remain available.

## Validation

- Full unit suite: 589 passed in 91 files.
- Named local launch-funnel suite: 14 passed across desktop and 390x844 mobile, including the new legacy-account regression.
- Root/app TypeScript and production build: passed.
- Lint: 399 errors / 18 warnings in the existing repository backlog; changed files 0 errors / 0 warnings.
- Hosted deployment/smoke results are recorded below after completion.

## Hosted Auth setting

Using the existing Dashboard Lovable project, Email settings showed minimum password length 6. Only that numeric setting was changed to 8. Save returned “Auth config updated”; reopening Email settings displayed 8. HIBP protection, email sign-in, auto-confirm, secure email change and other settings were preserved. This is a password-policy change, not a user password change. The existing auto-confirm-email setting is enabled; production signup does not currently require a confirmation email. No test claim of email delivery is made.

## Deployment and live smoke

Pending reviewed merge, scoped deployment, normal Lovable publication, and live verification. Never infer publication from merge alone. Signed Stripe processing remains payment authority; checkout smoke stops before a charge. Live new-account credential entry/any acceptance is performed by the user when required by browser policy.
