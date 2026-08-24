# Fully Charged 75-day V1 release notes

Date: 2026-08-24
Status: public landing approved for production; authenticated strict-journey enrollment remains gated by independent content review

## What changed

- Added an authoritative, owner-private attempt/day lifecycle with one live attempt, fixed-timezone calendar boundaries, 75 canonical days, exact 25/25/25 seasons, explicit daily closeout, overdue ending, cancellation, and linked Begin Again history.
- Strict circuit writes now attach to the current attempt/day, use the pinned rule and independently reviewed day-content version, validate allowed action IDs, and derive completion/missing requirements on the server.
- Day 75 atomically completes the attempt and writes one immutable count-only completion record whose keys match the completion UI.
- Added complete governed draft copy for Days 1–75 and a user-facing recap ledger. Drafts remain unpublished and pending independent human/theological review.
- Raised circuit history retention above the 375-record strict-journey minimum and wired Today/circuit pages to the pinned journey timezone and authoritative current day.
- Added exhaustive pure simulations, a rollback-only persisted PostgreSQL simulation, DST/travel boundary coverage, migration contracts, and desktop/mobile formation E2E.
- Added a public landing roadmap with the refreshed five-Controllables/75-day visual, exact three-season overview, transparent strict rules, and expandable detail for every day from the governed source.
- Replaced the stale externally hosted share graphic with a project-owned 1200×630 Open Graph/Twitter card and synchronized title, description, canonical, robots, sitemap, PWA description, image alt text, and JSON-LD metadata.
- Removed table-wide visibility for invite-coded challenges. Authenticated circle preview/join now use exact-code, least-privilege RPCs with atomic duplicate and capacity checks; direct participant inserts are limited to a circle creator adding themselves.
- Closed the anonymous email-blast path in `send-daily-nudge`; every run now requires either the service-role bearer token or an authenticated admin before audience lookup or Resend initialization.

Final local evidence: 50 Vitest files / 310 tests, production build and TypeScript pass, 12/12 formation Playwright scenarios, 12/12 desktop/mobile public-entry scenarios, focused changed-scope ESLint pass, and a persisted rollback simulation of 75 days / 375 circuits. The repository-wide ESLint command still reports pre-existing debt outside this release's changed scope.

## Intentionally strict V1 behavior

There is no offline grace. A circuit and closeout count only when the server confirms them inside the canonical local day. An unclosed day ends the attempt, even if five client screens appeared complete. A same-local-date Begin Again is rejected when the prior attempt already wrote practice rows, preventing history collisions.

## Production gates

- Apply the migration to staging and pass the live owner/other-user/anonymous/service-role RLS and RPC matrix.
- Exercise two-device circuit/closeout, retry, scheduler, and boundary races against deployed PostgreSQL.
- Obtain explicit product/pastoral approval for the no-offline-grace behavior.
- Independently review, approve, and publish all 75 content versions; never bulk-publish these drafts.
- Finish legacy import/public-proof privacy work before claiming complete historical-data coverage.

The production public landing, full 75-day recap, SEO metadata, and sharing card do not bypass these gates. Until independent review publishes all 75 effective content versions, an authenticated attempt start fails closed by design.
