# Christian Formation Launch Checklist

Updated: 2026-08-23.

## Executive summary

The five daily circuits, private proof, versioned content OS, privacy-safe analytics, and an authoritative Fully Charged 75-day V1 lifecycle are implemented for controlled testing. The lifecycle precreates fixed-timezone canonical days, requires five server-derived circuits plus explicit closeout, ends missed/unclosed attempts, preserves Begin Again history, and completes Day 75 atomically. The 40-Day journey engine remains out of scope. Production still requires an authorized staging deployment, live RLS/auth/concurrency verification, explicit approval of V1's no-offline-grace policy, and independent review/publication of all 75 curriculum drafts.

## Automated release evidence

| Gate | Result |
| --- | --- |
| TypeScript | Pass |
| Production Vite build | Pass |
| Unit/contract/integration tests | Pass: 49 files, 306 tests after reconciling current Covenant work, including all 75 possible missed-day positions and SEO/share contracts |
| Formation E2E | Pass: 12/12 desktop/mobile |
| Public entry E2E | Pass: 12/12 desktop/mobile, including the 75-day roadmap and Day 75 disclosure |
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
- [x] Complete 75-day curriculum is draft/pending independent human review, never silently published.
- [x] Error, empty, loading, recovery, privacy, and strictness copy reviewed for formation routes.
- [x] Desktop/mobile screenshots captured.
- [ ] Authorized maintainer pushes/merges the release branch.
- [ ] Authorized Supabase owner applies migrations to staging.
- [ ] Live cross-user RLS/storage/RPC test passes.
- [ ] Named theological, historical, pastoral, safety, privacy, and editorial reviewers approve sample content/copy.
- [ ] Test users receive a disclosure that local QA content is draft and remote strict starts remain unavailable until all 75 reviewed versions are published.

## Required before production journey launch

- [x] Implement versioned Fully Charged attempts, local-day authority, informed strict consent, deterministic timezone/DST boundaries, closeout, attempt ending, and Begin Again.
- [ ] Approve the V1 no-offline-grace policy; add live concurrency/retry tests proving late/offline clients cannot silently claim completion.
- [ ] Inventory/import legacy book progress, proof, reflections, Main Missions, promises, resets, and browser records with preview, consent, idempotency, and rollback.
- [ ] Quarantine/rotate legacy public proof according to approved retention policy.
- [ ] Complete account-level export/deletion and retention jobs.
- [ ] Produce/review/publish curriculum through the content OS; never bulk-publish AI drafts.
- [ ] Add formation-specific opt-in email templates, quiet hours, timezone scheduling, delivery monitoring, and deep-link tests.
- [ ] Resolve the ten open product decisions in `product-spec.md`.

## Rollout recommendation

1. Merge behind flags with remote Fully Charged authority disabled until its backend/content gates pass.
2. Deploy database migrations to staging and run the live authorization matrix.
3. Publish the independently reviewed 75-day bundle, then invite a small internal cohort to the authoritative Fully Charged lifecycle; retain preview-only behavior for other journeys.
4. Review privacy, pastoral tone, accessibility, and support feedback.
5. Expand only after staging authority, offline-policy, concurrency, privacy, and editorial approvals pass.

**Final recommendation:** GO for controlled local/staging testing; NO-GO for production Fully Charged until the listed external gates pass, and NO-GO for production 40-Day completion claims until that separate journey engine exists.
