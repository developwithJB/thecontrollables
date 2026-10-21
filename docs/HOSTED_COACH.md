# Hosted AI coaching

This is the current code guide. Earlier PR-E notes describing “price TBD,” a 25-message quota, and rollout-off defaults are historical. For dated deployment observations, read the [release evidence](security/customer-launch-2026-10-21.md).

## Customer offer

Read Along and personal practice do not require AI. Free verified accounts have five lifetime sample coach replies, subject to the shared sample allowance. Pro is $14.99/month or $119.99/year, with up to 200 standard text coach replies per calendar month and at most 10 per day. All hosted AI shares one monthly cost allowance; longer conversations, images, plans, summaries, and failed attempts can reduce the remaining reply count. There are no overage charges or unlimited-AI promises. Existing subscription rates are preserved.

Prices come from `supabase/functions/_shared/billingContract.ts` and `src/lib/pricing.ts`. The settings card, `/coach`, `/billing`, and `/pricing` present the server-derived allowance. A ChatGPT, Codex, Cursor, or other development subscription does not pay this app’s inference bill.

## Authority and cost control

- `supabase/functions/_shared/hostedAiBudget.ts` bounds model, input, output, and supported media before requesting a service-only atomic cost reservation. It retains reservations on failures and does not automatically retry upstream or fall back to another paid model.
- `get_hosted_ai_allowance` exposes the authenticated account’s allowance; `useHostedAiAllowance` reads it for display. Browser counters, editable metadata, and flags cannot create access.
- `paidHostedFeatureDenial` checks current paid authority before insight/review data or cached paid results. The later budget gate remains independent.
- Current guarded hosted requests use `google/gemini-3.1-flash-lite` through the existing Lovable gateway. Keep model/cost policy changes separate from refactors.
- Server rollout/policy settings and entitlement remain authoritative. Frontend visibility defaults do not prove that a provider is configured or enabled in a deployment.

The older hosted-selection/settings and usage migrations remain in history for compatibility. Do not restore an old quota or bypass the current shared budget because a previous design described it differently.

## Selection and privacy

A saved bring-your-own key can remain while hosted mode is selected. Saving a new personal provider key switches back explicitly. Selection does not grant Pro and never creates an automatic fallback. Current account permissions, consent, and routing are rechecked server-side.

No private prompt, credential, provider body, or health payload belongs in a usage ledger or telemetry. The AI coach has no Scripture publication or strict-day closeout authority. Optional assistance is not reviewed lesson content, therapy, or diagnosis.

## Changes and verification

Do not change billing records, prices, budget policy, credentials, rollout settings, or content review as part of ordinary UI work. Deployments require a reviewed revision and distinct verification of schema, functions, configuration, and frontend publication. Never replay an applied migration.

Use mocked provider/handler tests and disposable local budget checks described in [Testing](TESTING.md). Sandbox payment evidence does not prove real inference or delivery. If a service is disabled, fail clearly rather than silently routing private text to a different provider.

See [personal provider keys](COACH_PROVIDERS.md) and [product guide](PRODUCT_STORY.md).
