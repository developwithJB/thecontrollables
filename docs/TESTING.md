# Testing The Dashboard

Use Node.js 22.13+, `npm ci`, and synthetic data. Read [CONTRIBUTING.md](../CONTRIBUTING.md) before running database or integration tools.

## Required local checks

From the repository root:

```sh
npm run test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm run lint
```

The root TypeScript config uses project references; checking `tsconfig.app.json` explicitly covers application code. Lint currently has an existing backlog. Record both error and warning counts and distinguish old failures from changes introduced by your PR.

After any Controllable presentation or copy change:

```sh
npm run test:unit -- tests/unit/controllable-emoji-contract.test.ts
```

## Safe browser checks

Run a **named spec with its matching local config**. The examples below launch Vite on localhost and require no production login, payment, or provider key.

```sh
npx playwright test --config=playwright.entry.config.ts new-customer-entry.spec.ts
npx playwright test --config=playwright.formation.config.ts formation-circuits.spec.ts first-week.spec.ts
npx playwright test --config=playwright.qa-polish.config.ts qa-polish.spec.ts
npx playwright test --config=playwright.billing.config.ts freemium-checkout-local.spec.ts
```

Entry checks use public routes. Formation/polish checks enable development mock auth; handlers and database tests independently verify authorization. Mock auth is not evidence of real session or billing behavior. Browser specs intercept external traffic; keep those safeguards intact.

Review the named config first: some reuse an already running server. Confirm the expected localhost port and environment. Review screenshots at desktop and mobile widths; the polish spec uses 390×844. It writes synthetic screenshots under `docs/qa/pr2`; copy useful evidence into your PR deliberately, and restore generated PNGs if the test is not intended to update them.

**Do not run plain `npm run test:e2e` or `stripe-production.spec.ts` as routine QA.** The general E2E directory contains production-targeting and payment-related specs. Never complete a live purchase to test a cleanup.

## Actual Edge Function checks with mocked services

The harnesses import the real handler and intercept its database/provider calls. They do not prove a real provider or scheduled delivery works. For example:

```sh
npm run test:billing:edge
npx --yes deno test --no-lock --allow-env --import-map=tests/edge/import-map.json tests/edge/oauth.local.test.ts
npx --yes deno test --no-lock --allow-env --import-map=tests/edge/import-map.json tests/edge/paid-insights.local.test.ts tests/edge/whoop-webhook.local.test.ts
```

Keep Deno resource sanitizers enabled. Do not add broad network/read/secret permissions to make an isolated test pass. Individual harnesses document any additional capability they genuinely need.

## Database checks

Security harnesses in `scripts/test-*-security.mjs` and the billing/budget harnesses create disposable local databases. Read the exact harness first and use its documented local connection. Do not point a harness or `DATABASE_URL` at production, another project’s local database, or a database with customer data.

`tests/database` also contains transaction-wrapped SQL checks. A `ROLLBACK` fixture is still capable of locks, reads, function calls, and side effects while it runs; it is not blanket permission to use production. Do not run `supabase db reset`, `db push`, `link`, or `drizzle-kit push` on an existing environment for verification.

## Report results honestly

Include the revision, command, environment, passing/failing counts, and what was mocked. Distinguish:

- Unit assertions from actual handler/browser/database checks.
- A published frontend from deployed functions and applied migrations.
- Sandbox Apple Pay from a live payment.
- A mocked provider success from a real consent, sync, inference, or notification.
- Current scan output from old findings and a dependency audit from application authorization tests.

Keep prompts, private notes, credentials, full signed URLs, card data, and real customer identifiers out of logs and screenshots. Do not weaken a test or production guard to get a green report.
