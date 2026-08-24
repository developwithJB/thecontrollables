# Christian Formation Requirements Traceability

Final review date: 2026-08-04. Statuses: **Covered**, **Partial**, **Deferred**, and **External gate**. “Covered” means implemented and exercised by a test or manual QA. It does not imply pastoral or editorial approval.

## Product promise, rules, and paths

| Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- |
| Practice formation without claiming salvation, divine approval, maturity, superiority, or guaranteed transformation | Covered | Grace copy and prohibited-claim policy in `completion.ts`; no formation leaderboard or spiritual rank | `formation-completion.test.ts`, manual completion review |
| Formation before gamification; honest strictness and grace-centered recovery | Covered for circuits and Fully Charged; Partial for 40-Day | Five distinct circuit policies, authoritative strict closeout, partial 40-Day saves, Recovery Win, no XP on formation routes | Circuit/journey rule tests, database simulation, and desktop/mobile E2E |
| Read Along has no deadline or restart and uses low-pressure progress | Covered for daily circuits | Track policy makes one meaningful practice sufficient; no restart action exists | `formation-circuit-rules.test.ts`, E2E path policy test |
| 40-Day Charge preserves partial work after a miss | Covered for daily circuits; Deferred for journey cadence | Idempotent daily circuit records retain each practice independently | Rule, integration, migration, and E2E tests |
| Fully Charged requires all assigned actions and accepts allowed adaptations | Covered for circuit evaluation | Strict requirements are explicit; adapted movement is valid when the track permits it | Circuit rule/integration tests and mobile E2E |
| Fully Charged ends an attempt after an incomplete/unclosed day; Begin Again preserves old attempts | Covered at database lifecycle; Partial in history UI | Immutable attempt/day rows, explicit closeout, overdue reconciliation, prior-attempt link, and same-practice-date restart guard | 75-day rollback simulation, all-75-miss unit sweep, migration tests; UI summarizes the latest ended attempt but does not yet browse all attempts |
| Seasons change on days 26 and 51; day 75 completes deterministically | Covered | 75 canonical local days use exact 25/25/25 seasons; Day 75 atomically creates one completion record | Pure simulation, SQL rollback simulation, migration tests |
| Timezone/DST/offline completion cannot falsify authoritative state | Partial | Attempt timezone is fixed; canonical UTC boundaries derive from local calendar dates; strict writes/closeouts are synchronous and late events fail closed. V1 intentionally has no offline grace. | Travel-date unit test and 23/25-hour DST SQL assertions; live two-device/concurrency and approved offline product policy remain external gates |
| One account can use multiple paths without erasing history | Covered for circuit records | Records key by owner, local date, track, circuit, and immutable rule version | Integration and migration tests |

## Privacy, preservation, safety, and AI

| Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- |
| Prayer, reflection, covenant, wellness, service-recipient, proof, and Witness-note data are private by default | Covered for new formation data | Owner RLS, separate reflection table, analytics allowlist, masked formation roots | Security/migration/analytics tests and E2E |
| Completion exposes counts, never personal content | Covered | Count-only immutable record separated from private closing reflection | Completion domain/migration/E2E tests |
| Optional proof is private, metadata-minimized, signed, deletable, and never completion authority | Covered for new formation proof | JPEG re-encode, private bucket, short signed access, delete path, no completion coupling | Proof/security/E2E tests |
| Existing legacy book progress, proof, reflections, Main Missions, and records are preserved | Partial | All migrations are additive and no legacy tables are rewritten or deleted | Diff/migration review; semantic import and legacy-proof quarantine remain deferred |
| Existing legacy proof is private | Deferred | Existing public-proof migration/URL rotation is not included | Production launch blocker for claiming full proof privacy |
| Service avoids recipient identity/image/hardship | Covered | No recipient field; UI explicitly limits attestation/note content | Circuit rule/UI/E2E review |
| Movement adaptations are legitimate and do not replace clinical guidance | Covered | Adaptation types plus clinical/local-condition guidance | Rule tests and mobile E2E |
| Historical covenant/rule/content versions remain unchanged | Covered for Fully Charged V1 | Attempt rules/content bundle, setup, day rule version, and exact independently reviewed content version are pinned; old attempt rows remain linked | Journey migration and rollback simulation; later covenant revisions require a new version |
| AI cannot publish content or mutate authoritative formation state without human review | Covered for content OS | AI-assisted drafts reset to pending review; author/reviewer separation and human approval in RPCs | Content domain/migration tests |
| Export and deletion of eligible personal data | Partial | Private completion JSON export and proof deletion exist | E2E download/delete tests; complete account-level export/deletion orchestration is deferred |

## Completion experience (Prompt 10)

| Requirement | Status | Implementation and verification |
| --- | --- | --- |
| Read Along, 40-Day, and 75-Day completion experiences | Covered as preview for Read Along/40-Day; Covered at V1 authority for 75-Day | Track-aware route retains preview modes; Fully Charged Day 75 creates an immutable count-only completion record from canonical days/circuits |
| Approved celebratory language | Covered | Grace-centered track copy and exact “You did not earn God’s love…” language; policy tests |
| Seven-question private closing reflection | Covered | Separate private persistence/RPC, optional UI, private download; completion tests/E2E |
| Seven non-pressuring next steps | Covered | All requested choices, including planned recovery; completion tests/manual QA |
| Privacy-safe share asset with explicit name/quote consent | Covered | Exact preview, independent toggles, XML escaping, share-safe SVG; XSS/redaction/E2E tests |
| Downloadable private record | Covered | Explicitly labeled JSON download separate from public SVG; E2E download verification |

## Content operating system (Prompt 11)

| Requirement | Status | Implementation and verification |
| --- | --- | --- |
| All requested content types and metadata | Covered | Typed domain model and SQL schema; content tests |
| Draft leakage prevention and effective publication | Covered in migration contract | Ordinary users can read only published/effective versions; admin draft access is separate |
| Scripture validation; historical citations; reconstruction label | Covered | Domain and SQL validation plus classified preview; negative tests |
| Immutable versions and historical record retention | Covered | New version per draft, version history, circuit/completion content-version references; migration tests |
| Author/reviewer separation and human theological approval | Covered in workflow | Server RPC rejects self-review and publication without human approval | Content/migration tests; named human approval is an external gate |
| Admin form, preview, review, publish, import/export, seed tools | Covered | Feature-gated admin studio and editor guide | Type/lint/unit review; live DB workflow awaits migration deployment |
| Complete 75-day content set plus representative supporting content | Covered as draft | Every Fully Charged day has a title, Scripture reference, invitation, private reflection, service action, season, and governed day assignment | 75-day content/uniqueness tests and `fully-charged-75-day-recap.md`. All drafts remain pending independent human/theological review and intentionally unpublished |

## Privacy-safe analytics (Prompt 12)

| Requirement | Status | Implementation and verification |
| --- | --- | --- |
| Typed lifecycle event contract | Covered | 25 named formation events and constrained properties | Analytics unit tests |
| Sensitive field/value rejection | Covered | Allowlist plus forbidden-key and URL/email/data-like value checks | Analytics unit tests |
| Funnel, retention, dashboard, and retention expectations | Covered as specification | `analytics-measurement.md` |
| Ethical feature flags and experiment boundaries | Covered | Formation flags and experiment-surface allowlist exclude theology/privacy/safety | Feature-flag and analytics tests |
| Product instrumentation | Partial | Today, circuit, recovery, real completion, and share-preview surfaces are instrumented; onboarding/email/Witness events await those product flows |

## Quality and final optimization (Prompts 13–14)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Static analysis, type check, formatting, focused lint | Covered | TypeScript and `git diff --check` pass; focused changed-scope ESLint passes |
| Repository-wide lint | Partial | 410 pre-existing errors remain outside the formation scope; no new formation lint errors |
| Unit/integration/security/upload/migration/email-render tests | Covered at contract level | 46 files / 295 tests; includes exhaustive 75-day, local lifecycle, copy-ledger, and database-migration contracts |
| End-to-end, authorization, accessibility, mobile | Covered for test environment | 12/12 formation E2E across desktop/mobile, Axe, keyboard, scheduled cancellation, privacy and downloads |
| Live cross-user authorization and SQL execution | External gate | Supabase project link/deploy denied to current account; contract tests pass but live RLS is unverified |
| Performance | Covered with known opportunities | Initial shell reduced from 571 KB/180 KB gzip to 296 KB/92 KB gzip; zero Lighthouse TBT on production auth shell |
| Complete desktop/mobile visual review | Covered for formation Today/circuits/completion | Browser QA and screenshots in `screenshots/` |
| Primary daily action obvious within five seconds | Covered for formation Today | Hero explains today’s path and five circuit cards appear immediately; manual desktop/mobile review |

## Release decision

- **Go:** local and branch-based user testing of the five daily circuits, the complete Fully Charged V1 lifecycle, completion experience, privacy-safe downloads/share preview, and editor tooling.
- **No-go:** production Fully Charged rollout until the migration passes staging RLS/auth/concurrency tests, all 75 drafts receive independent human/theological approval and publication, and the no-offline-grace policy is explicitly approved. Legacy import/privacy gates still block claims that all historical formation data is covered.
- **External deployment gates:** current GitHub identity has read-only upstream access; current Supabase identity cannot link to the project. See `launch-checklist.md`.
