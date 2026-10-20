# Freemium and checkout release, 2026-10-20

## Product offer

- Free: ongoing Read Along and daily practice; no card to start. Five hosted text coach sample replies once per verified account, subject to a shared $0.10 lifetime conservative inference allowance. Background features cannot consume a free sample. Clearing browser data does not reset it.
- BYO: no platform AI fee for coach chat using an owner's OpenAI/OpenRouter or Anthropic key in Vault. The provider bills the owner. Existing 100-request/day server guard remains. No silent hosted fallback; hosted planning/summaries remain separate paid features.
- Pro: USD119.99/year or USD14.99/month, auto-renewing, cancel renewal in Stripe's portal. Annual equivalent rounds to $10.00/month; it is not a monthly offer. Maximum 200 standard text coach requests per UTC calendar month and 10 per UTC day, subject to the shared $2.50/month conservative hosted inference allowance. Planning, summaries, images and all other hosted endpoints use the same budget. Unused allowance does not roll over; failures retain reservations. There are no automatic overage charges.
- Existing Plus, Pro and manual/lifetime access records remain supported. Existing subscriptions are not repriced, archived or migrated. Plus keeps its paid tools and nominal 15/day limit; the audited legacy Pro price and higher/manual grants keep 25/day, all subject to the new shared 200/month and monetary ceilings. Billing shows remaining allowance from the server; its existing price remains USD79.99/year for any legacy upgrade surface. Existing plan rates are shown by Stripe's portal, not inferred from the current offer.
- Book purchases are separate. `/pricing` uses the canonical `BOOK_URL` through `BookLink`, with placement `pricing`, and the existing always-on growth sink. Clicks are not confirmed book sales.

## Source and authority

`billingContract.ts` is the shared amount/currency/interval contract. The browser sends tier and interval; the server selects a configured Stripe price, retrieves it, and rejects incorrect amount, currency, interval, usage type or active status before creating a session. New Pro checkout also fails closed while the server-owned AI policy or hosted rollout is unavailable; existing subscribers can still open their portal. The old $9.99/month ID is entitlement-only. Unknown subscription prices fail closed instead of becoming Pro through metadata.

Stripe's Basil API moved subscription periods to items. Webhook/check-payment understand both item and older event periods; multiple items or missing periods fail closed. Webhook updates retrieve current Stripe state to avoid late-event reactivation, check database errors and retain retry behavior. A payment-success URL never grants access or produces an immediate claim that payment is verified.

The new SQL migration adds an RLS-protected, service-only reservation ledger. Each inference reserves its conservative maximum before fetching. Owner and project locks serialize concurrent calls, retries and tool passes. Service functions read current server entitlements, not client tier flags, editable usage logs or browser counters. A model/token contract mismatch disables further hosted reservations. Reservations store no prompt, response or key.

Gemini 2.5 aliases retire on this release date. The wrapper pins `google/gemini-3.1-flash-lite` rather than using a retired alias. Provider standard rates checked 2026-10-20: $0.25/M input, $1.50/M output including thinking. Reservations use higher $0.30/M and $2.50/M rates plus 25%; text uses at most 16,384 UTF-8 bytes plus framing, output at most 1,000 tokens including reasoning. One PNG/JPEG up to 1024px per dimension has an additional conservative image-token reservation. Unsupported remote images, media, paid provider tools, priority overrides and model overrides are rejected/removed. No automatic upstream retries or model fallback is implemented. A higher provider rate, changed credit conversion, or new model requires a rate review; these are conservative inference estimates, not a claim to cap the total Lovable invoice.

A second project guard starts at $10/day, including at most $1/day of free samples. It is service-owned, separate from owner limits, and starts disabled until deployment validation. BYO does not spend hosted allowance. The unused legacy email AI generator is removed; reviewed/deterministic reminder templates and scheduler behavior are unchanged.

## Release sequence

1. Open/review the GitHub PR, complete local checks and merge the reviewed source. Do not merge unrelated QA/content PRs as part of this release.
2. In the existing Stripe account, reuse or create immutable Pro prices: USD11999/year and USD1499/month. Preserve every legacy price/subscription. Set only server mappings `STRIPE_PRICE_ID_PRO_ANNUAL` and `STRIPE_PRICE_ID_PRO_MONTHLY`; keep legacy mappings for entitlement sync. No secret belongs in a `VITE_` variable.
3. Apply only `supabase/migrations/20261021000100_hosted_ai_budget.sql` through Lovable's supported Supabase tooling. Do not touch Drizzle, reset/link a remote DB, or regenerate a second migration path. The ledger starts disabled.
4. Deploy every changed edge function together, including the shared wrapper. Verify JWT settings remain true for send-daily-nudge, generate-insights and generate-snapshot-insight. No content review, closeout, RLS or private proof gate is changed.
5. Verify the active model, reported usage and output bounds with one synthetic non-sensitive smoke call using existing secure tooling. Verify provider billing/credit conversion before enabling. Do not create or expose keys.
6. Enable the hosted policy and existing BYO/hosted rollout rows after edge validation; publish the synced frontend through Lovable. Confirm `/pricing`, `/billing` and `/coach` on the custom domain. Roll back by disabling `hosted_ai_policy.enabled`; keep records and legacy subscriptions intact.

## Validation and Apple Pay

- Unit tests: `npm run test` (includes pricing, provider boundary, token/cost reservations and subscription period/status regressions).
- Local database: `npm run test:ai-budget:local`, against the isolated port55322 stack only. `DASHBOARD_BUDGET_RECREATE=1` recreates only this migration's local test objects. Covers concurrent free/paid caps, monthly/daily limits, downgrade, owner isolation, client write/execute denial, project cap and kill switch.
- Full handler fixtures: `npm run test:billing:edge`. Synthetic credentials only; deny-by-default fetch, no runtime network permission. Tests actual checkout and signed webhook handlers, not a separate mock implementation.
- Browser: `npm run test:billing:local`. Only the named local spec, at desktop and 390x844; all external network blocked/mocked. Checks exact offers, interval propagation, same-tab redirect, error handling, free coach access, JSON replies, and no false return-URL confirmation. Pricing has no serious/critical axe violations.
- Run TypeScript, build, lint and the canonical emoji contract. Repository lint has a pre-existing baseline; report exact errors/warnings in the PR. No production Stripe test spec or broad `test:e2e` command is used.

Apple Pay is enabled in Stripe's live default payment-method configuration as of the prior audit. New hosted subscription sessions preserve automatic payment-method selection. Local tests cannot prove the actual Apple Pay button, Wallet authentication or bank authorization. The real Wallet step requires an eligible Apple device/card and the owner's interaction. Prefer a Stripe sandbox Checkout session with existing test credentials; test cards cannot be added to Wallet. If no supported test-mode connection exists, label that verification pending rather than charging a live subscription or claiming success. Cancelled/failed Wallet approval must leave the account free; a real successful test must verify Stripe's signed webhook and entitlement readback.

## First 100 paying customers

Use the saved Lovable first100 organic plan and tagged links. Route prospects to free Read Along or `/pricing`; optional coach support is separate from Scripture and reviewed lessons. Do not market the strict 75-day path as available before independent review, or promise working morning emails while the scheduler is blocked. No outreach or ad spending is performed by this release.

Count distinct customers with a verified, nonzero successful subscription payment and current paid entitlement. Deduplicate Stripe customer/account identities; exclude test accounts, free trials, unpaid/incomplete subscriptions, fully refunded payments and chargebacks. Book sales/royalties stay separate and require seller evidence. Existing admin MRR based on an assumed $9.99 rate is not a reliable first100/revenue ledger; use Stripe payment/invoice evidence until that reporting is reconciled. Lovable, Supabase and development-tool subscriptions are additional costs outside inference allowances.
