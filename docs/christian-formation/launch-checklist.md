# Christian Formation Launch Checklist

Updated: 2026-08-16.

## Executive summary

The five daily circuit experiences, private proof, completion preview, versioned content OS, and privacy-safe analytics are implemented and ready for controlled user testing. Critical completion authority is intentionally not fabricated: this repository still lacks the 40/75-day attempt/day-closeout engine. The current environment also lacks GitHub write and Supabase project privileges, so upstream merge and backend deployment require an authorized maintainer.

## Automated release evidence

| Gate | Result |
| --- | --- |
| TypeScript | Pass |
| Production Vite build | Pass |
| Unit/contract/integration tests | Pass: 43 files, 273 tests after final release additions |
| Formation E2E | Pass: 10/10 desktop/mobile |
| Legacy all-app E2E command | Not a release gate: stale selectors/auth assumptions plus formation tests run without their mock-auth server; interrupted after 13 pass, 18 fail, 5 interrupted, 2 skipped |
| Changed-scope ESLint | Pass |
| Repository ESLint | Known baseline: 410 errors, 19 warnings outside formation scope |
| Formatting | `git diff --check` pass |
| Dependency scan | 0 Critical/High; 2 mitigated Moderate router advisories |
| Secret pattern scan | Pass |
| Accessibility | Formation Axe pass; keyboard/mobile manual pass |
| Performance | Initial shell 296 KB / 92 KB gzip; down from 571 KB / 180 KB gzip; production unauthenticated shell Lighthouse 83, Accessibility 100, Best Practices 100, TBT 0 ms, CLS 0 |

## Ready before test cohort

- [x] Feature flags exist for circuits, completion, content admin, and analytics.
- [x] Completion preview is unmistakably non-authoritative.
- [x] Private and share-safe downloads are separate.
- [x] Representative curriculum is draft/pending human review, never silently published.
- [x] Error, empty, loading, recovery, privacy, and strictness copy reviewed for formation routes.
- [x] Desktop/mobile screenshots captured.
- [ ] Authorized maintainer pushes/merges the release branch.
- [ ] Authorized Supabase owner applies migrations to staging.
- [ ] Live cross-user RLS/storage/RPC test passes.
- [ ] Named theological, historical, pastoral, safety, privacy, and editorial reviewers approve sample content/copy.
- [ ] Test users receive a disclosure that journey completion is a preview until the attempt engine ships.

## Required before production journey launch

- [ ] Implement versioned journey attempts, local-day authority, informed strict consent, deterministic timezone/DST policy, closeout, attempt ending, and Begin Again.
- [ ] Add live concurrency/offline/retry tests so an offline client cannot silently claim completion.
- [ ] Inventory/import legacy book progress, proof, reflections, Main Missions, promises, resets, and browser records with preview, consent, idempotency, and rollback.
- [ ] Quarantine/rotate legacy public proof according to approved retention policy.
- [ ] Complete account-level export/deletion and retention jobs.
- [ ] Produce/review/publish curriculum through the content OS; never bulk-publish AI drafts.
- [x] Add formation-specific opt-in email templates, timezone scheduling, one-click Settings access, and deep-link tests.
- [ ] Add provider-level delivery monitoring and user-configurable send time beyond the current 7:00 AM local default.
- [ ] Resolve the ten open product decisions in `product-spec.md`.

## Rollout recommendation

1. Merge behind flags with completion authority disabled/non-authoritative.
2. Deploy database migrations to staging and run the live authorization matrix.
3. Invite a small internal cohort to Today/circuits/completion preview.
4. Review privacy, pastoral tone, accessibility, and support feedback.
5. Expand only after the authoritative journey engine and editorial approvals pass.

**Final recommendation:** GO for controlled testing; NO-GO for production 40/75-day completion claims.
