# Christian Formation Test Strategy

Status: proposed release-quality strategy

Primary risk: a user is shown an inaccurate strict-day/attempt result or private formation data is exposed

## Quality goals

1. Rules produce the same result in pure TypeScript, transactional commands, projections, and UI.
2. Strict history cannot be fabricated, duplicated, overwritten, or lost during offline, retry, or concurrent use.
3. Another user, anonymous caller, scheduler, analytics tool, AI provider, or support role cannot read or mutate private content outside its explicit purpose.
4. Returning users retain every supported category of legacy data and are not re-onboarded as new users.
5. Required tasks remain understandable and operable across screen sizes and assistive technologies.
6. Content shown to a user is licensed, provenance-labeled, versioned, spoiler-safe, and reviewed.
7. Rollout and rollback do not require deleting new or legacy history.

## Test layers

| Layer | Purpose | Tooling |
|---|---|---|
| Static | Type/domain/schema parity, content validation, forbidden imports | TypeScript, ESLint/custom scripts, generated Supabase types |
| Pure unit | State/rules/temporal/spoiler calculations | Vitest; deterministic clocks and timezone fixtures |
| Property/model | Invariants across dates, command sequences, duplicates, and concurrency | Vitest plus a property-testing library if approved; state-machine fixtures |
| Database | Constraints, RLS, functions, triggers, migration replay | Local Supabase/Postgres, SQL tests, seeded role matrix |
| API/edge integration | Auth modes, commands, idempotency, storage, notification/AI minimization | Local Supabase functions or integration harness with fakes |
| Component | Accessible state presentation and form behavior | Testing Library/Vitest with browser environment where needed |
| End-to-end | Real user journeys, multiple devices, offline/reconnect, migration | Existing Playwright desktop/mobile/tablet projects |
| Content | Provenance, rights, lifecycle, spoiler, risky copy, version bundles | Manifest validator plus reviewer approval |
| Operational | deploy/rollback, schedulers, alerts, backups, kill switches | Staging drills and release checklist |

New pure formation code should be covered independently of the current Node-only `src/lib` coverage glob. The CI suite should add an explicit `src/domain/formation/**` threshold, with branch coverage emphasized for rules.

## Reference fixtures

Create committed, reviewable fixtures:

- three users: owner A, owner B, and admin/support with scoped roles;
- all book statuses and at least two editions with different chapter mappings;
- all tracks/rule versions and attempt states;
- day boundary cases 1, 25, 26, 50, 51, and 75;
- IANA zones `America/Los_Angeles`, `America/New_York`, `Europe/London`, `Asia/Kolkata`, `Pacific/Auckland`, and `UTC`;
- spring-forward, fall-back, date-line travel, half-hour offset, and invalid/retired timezone inputs;
- online event, genuine offline event, late-created event, duplicate retry, payload conflict, stale aggregate version, and two-device closeout;
- standard/walking/mobility/rehabilitation/recovery/indoor-safety movement;
- private photo, oversized/spoofed photo, EXIF/GPS photo, deleted proof, and shared derivative;
- complete, partial, corrupted, oversized, and version-unknown browser legacy data;
- published/retired content, missing citation/license/review, unsafe copy, and spoiler content.

Golden fixture results are versioned by `rules_version`. A new rule version adds expected results; it must not update old expectations to make regressions disappear.

## Pure rules test matrix

### All tracks

- correct initialization/progress for Read Along, 40-Day Charge, and Fully Charged;
- unsupported/missing rules version fails closed;
- next recommended action is deterministic and never recommends hidden content or an unsafe/ineligible action;
- completion record is generated only once after all rules are satisfied;
- customer copy mapping does not alter state semantics.

### Read Along

- no deadline, pause penalty, attempt ending, or restart;
- each BookStatus at section 0, middle, last, completed, and unknown mapping;
- current/completed content visible and future spoiler content filtered server-side;
- `finished`/`rereading_or_leading` access all approved sections;
- reflection/proof absence does not block progress;
- imported eight-section progress maps correctly or enters confirmation state;
- edition change never silently advances or loses progress.

### 40-Day Charge

- day/progress behavior for the approved calendar/cadence model;
- missed circuit/day creates drift but never deletes/restarts the attempt;
- all five Controllables meet the final journey requirement;
- weekly service objective cadence across boundary weeks;
- Recovery Win eligible after a qualifying absence and return, once per event;
- ineligible without prior practice, without a missed interval, or on duplicate request;
- pause/cancel/resume behavior after the blocking product decision is resolved;
- every movement adaptation has equal valid completion semantics when eligible.

### Fully Charged: 75 Days

- activation rejects missing strict consent, current rules acceptance, timezone, Main Promise, covenant, environment setup, or active duplicate;
- season transitions exactly at days 1, 25, 26, 50, 51, and 75;
- all five circuits required each day under the pinned version;
- Wellness requires two blocks and at least one outdoors or an explicitly approved safety alternative, plus covenant attestation;
- Environment includes the provisional service rep requirement until the product decision changes;
- closeout is unavailable before eligibility/time policy, ready when facts are present, and idempotent;
- missing any required fact at final close ends the attempt once;
- days 1–74 complete keep the attempt active; day 75 complete atomically completes attempt and record;
- ended/cancelled/completed attempts reject further circuit and closeout writes;
- begin-again creates a new sequence/link and preserves every previous row;
- old legacy ring/backfill cannot satisfy a strict day.

## Temporal and offline tests

Use a Temporal-compatible library and frozen instants. Do not use the host test runner timezone as an implicit input.

### Local date/current day

- just before, at, and just after midnight in each fixture timezone;
- attempt planned in the future and already terminal;
- local days during 23-hour spring-forward and 25-hour fall-back;
- leap day, month/year boundaries, and date-line zones;
- device timezone differs from pinned attempt timezone;
- invalid timezone and timezone database update behavior.

### Offline synchronization

- event created in the valid day, persisted in the durable local outbox, received within approved grace;
- valid event received after grace;
- event first created after boundary but claims the prior local date;
- device clock moves backward/forward;
- same event retry with same payload returns stored result;
- same idempotency key with different payload conflicts;
- two devices complete the same circuit;
- one device closes while another event is pending;
- network response is lost after server commit, then client retries;
- local storage/IndexedDB queue is corrupted or quota-exhausted;
- service worker/app update occurs with pending events;
- scheduler and reconnect race to close/end the same day.

Expected outcomes must distinguish `server_confirmed`, `pending`, `conflict`, and `rejected`. The UI cannot show a permanent completed state for `pending`.

### Timezone changes/travel

For the recommended fixed-timezone v1:

- changing the profile/browser/device timezone does not shift the active attempt;
- the UI clearly shows the pinned zone and offers a support/product-approved path rather than silent mutation;
- attempt completion across DST remains 75 local dates, not 75 × 24 hours;
- a future product-supported timezone change requires an audit event, unambiguous effective boundary, and no duplicate/skipped local date.

## State-machine and property tests

Generate valid and invalid command sequences against a simple reference model. Assert:

- terminal states are absorbing;
- at most one active/scheduled attempt per user/track;
- day numbers/local dates are unique and monotonic under the policy;
- completed strict day implies every versioned requirement;
- attempt completion implies exactly 75 completed canonical days for Fully Charged;
- ended attempt rows and linked evidence remain unchanged after begin-again;
- duplicate commands do not change row counts or aggregate version after the first application;
- completion record count is at most one per eligible aggregate;
- a correction is append/supersede/revoke, never an unlogged overwrite;
- private prose never appears in public/status projections.

Run randomized command sequences for retries, stale versions, concurrent circuits, closeout/scheduler races, and migrations. Persist the random seed on failure.

## Database and migration tests

Every migration is tested in two modes:

1. clean replay from an empty database;
2. upgrade from a representative production-like schema/data snapshot, including both timeline migration variants and legacy anomalies.

Assertions:

- constraints/check values match domain literals;
- partial uniqueness prevents active duplicates;
- foreign keys prevent cross-owner relationships;
- terminal-state/check constraints fail invalid direct writes;
- rules-sensitive direct client writes are denied;
- all personal tables have RLS enabled and no permissive fallback policy;
- owner A succeeds, owner B/anonymous fail, approved service command succeeds only in scope;
- migration/import ledger makes reruns no-ops;
- generated Supabase types match new schema;
- rollback leaves flags off and legacy reads intact, even if additive tables remain;
- no trigger uses computed timeline snapshots as strict authority.

Create a migration replay test specifically for the near-duplicate July 2026 timeline migrations so new work does not mask an already non-replayable history.

## API/server-command integration tests

For `start_formation_attempt`, `record_circuit_completion`, `close_formation_day`, overdue closeout, begin-again, migration inventory/import, and proof commands:

- valid request/response schemas and stable error codes;
- missing/expired/other-user JWT rejection;
- signed scheduler authentication, replay and timestamp rejection;
- idempotency replay and payload mismatch;
- stale expected version/concurrent update behavior;
- database operation atomicity using injected failure between logical steps;
- outbox event generation exactly once;
- no private fields in response/projection/log/error;
- rule-version unsupported/retired behavior;
- rate limits and input size/type validation.

Simulate two concurrent closeout requests, circuit/closeout races, scheduler/manual closeout races, and begin-again duplicates. Verify final rows, aggregate version, audit events, and completion record—not merely HTTP status.

## RLS and privacy tests

Build a table-driven authorization matrix for every formation table, view, function, storage path, and signed-URL endpoint:

- anonymous;
- owner;
- different authenticated user;
- authenticated user possessing another row's UUID;
- regular admin claim without approved role;
- approved support role with/without a case grant;
- scheduler/service function.

Canary strings placed in reflections, covenants, captions, wellness, and service details must be absent from:

- PostHog events and autocapture;
- Sentry events/breadcrumbs/request bodies;
- edge-function logs;
- notification payloads and delivery logs;
- AI requests without the exact consent scope;
- progress/today/history summary APIs;
- URLs, page titles, clipboard defaults, and share previews;
- support/admin listings.

Storage tests verify private bucket listing/read denial, path ownership, signed URL expiry, EXIF removal, derivative separation, deletion, and no object availability at a public URL. Include a regression test for the legacy public proof bucket migration.

## AI tests

- every formation consent scope defaults off and revocation takes effect on the next request;
- generic recommendations work without private context;
- private canary text is sent only when the user selected that exact record/scope;
- prompt-injected user text cannot request hidden book content, other-user data, tool execution, completion, restart, sharing, or consent changes;
- AI output cannot mark state; all suggested actions require deterministic user command/confirmation;
- Scripture/quotation retrieval uses approved source IDs and never fabricates exact text;
- high-risk spiritual/medical/exercise/eating/self-harm cases route to reviewed safe responses;
- ego-signal suggestions are ephemeral until user confirmation and delete on dismissal;
- provider errors/timeouts leave domain state unchanged and offer a non-AI path.

## Content tests

CI validates:

- stable/version IDs and immutable bundle checksums;
- valid provenance classification and visible label;
- citation/translation/license/channel fields by content type;
- required named reviewers and legal lifecycle transitions;
- days/seasons/circuits/chapter mappings reference valid domain IDs;
- spoiler fixtures return no future content in both API and rendered HTML/network payload;
- risky phrase/claim scanning flags, but does not replace, human review;
- notification/export variants obey privacy and Scripture license rules;
- retired content is not newly assigned and historical content receives the correct correction behavior;
- localized versions preserve source/safety/accessibility metadata.

## Component and accessibility tests

Automated component checks:

- semantic headings, field labels, descriptions/errors, focus order/restoration, dialog/sheet traps;
- buttons have accessible names beyond `title` or icons;
- progress/current/ended/pending states have text and live-region behavior;
- missing circuits are described neutrally and individually;
- adapted movement has equal visual/semantic status;
- reduced motion removes non-essential transitions;
- proof has upload, camera, and no-photo attestation options;
- private-field defaults and share previews are explicit;
- 200% zoom/large text do not hide closeout or consent controls.

Use automated axe-style checks plus manual VoiceOver (Safari/iOS/macOS), keyboard-only, switch/touch target, high contrast, reduced motion, and landscape checks. Automated audits are necessary but not sufficient.

## End-to-end journeys

### New user

- orientation → choose each path → privacy/safety acknowledgement → first practice;
- “decide later” leaves data/routes usable;
- strict setup cannot be skipped or preselected;
- Read Along spoiler behavior before/while/after reading;
- 40-Day drift and Recovery Win;
- Fully Charged standard/adapted movement, service attestation, closeout, missed day, ended history, and begin-again.

### Existing user migration

- previously completed onboarding lands on migration invitation, never new-user reset;
- inventory displays each preservation category;
- consented browser import for book, My Controllables, Dex, local mission/notes;
- server legacy records remain linked/viewable;
- corrupt/unknown local data creates a recoverable warning/export and does not erase source;
- reload/retry/two-device import is idempotent;
- choose path or decide later;
- no legacy activity becomes a new strict completed day.

### Multi-device/offline

- complete circuits online/offline across two devices;
- reconnect before/after boundary/grace;
- pending state survives reload and application update;
- conflict resolution does not silently award/erase credit;
- lost response/retry is idempotent;
- push/email does not declare incomplete while reconciliation is pending.

### Privacy/deletion

- owner can view/export/delete private proof/reflection and AI memory;
- second user and guessed URL cannot access them;
- share derivative includes only previewed fields and can expire/delete;
- notification opt-out works from message/settings;
- account deletion propagates according to policy.

Run these in the existing Chromium desktop, mobile Chrome/Pixel, mobile Safari/iPhone, and tablet/iPad projects. Add a 320px viewport, landscape, reduced-motion, and large-text/zoom manual pass.

## Performance and resilience

Targets must be established from current baselines, then test:

- formation home read model without loading reflection/proof bodies;
- 75 days × circuits/proof metadata without N+1 requests;
- batch migration of representative heavy legacy accounts;
- closeout transaction under concurrent scheduler/manual traffic;
- signed URL generation and image sanitation limits;
- notification fan-out without broad per-user service-role scans;
- AI outage, Supabase realtime outage, slow/offline network, storage failure, and partial deployment order.

No performance optimization may weaken RLS, content filtering, private-storage access, or authoritative rule evaluation.

## CI and release gates

Recommended required checks by rollout stage:

1. **Every PR:** format/lint, typecheck, unit/property tests, content schema, dependency/security scan, production build.
2. **Schema/API PR:** clean/upgrade migration replay, generated-type diff, RLS matrix, API integration, rollback/flag-off test.
3. **UI PR:** component accessibility, targeted E2E across desktop/mobile/tablet, screenshot review for required states.
4. **Release candidate:** complete E2E suite, manual assistive-tech/device matrix, privacy canary test, content approvals, scheduler/offline chaos test, backup/restore and kill-switch drill.

Do not rely on the current GitHub Pages workflow alone; it builds and publishes without quality gates. Backend and frontend must be backward-compatible during staggered rollout.

## Feature-flag validation

Test client and server flags independently:

- global kill switch;
- internal/staff cohort;
- migration invitation;
- browser import;
- each track;
- strict writes/closeout scheduler;
- proof upload/share;
- AI formation context;
- formation email/push;
- legacy navigation retirement.

A malicious client cannot enable a server-disabled feature. Turning a flag off stops new actions safely, preserves read-only history, drains/holds pending events explicitly, and never deletes data.

## Test data and production privacy

- Never copy raw production reflections, proof, covenants, wellness, or service records into test environments.
- Generate synthetic fixtures with canary data.
- If a production-shaped schema/sample is required, transform and verify irreversibly; do not assume UUID replacement is anonymization.
- Restrict screenshots/videos/traces from failing tests because they may contain private fixture data; set retention and access.
- Seed content with license-safe test text, not unlicensed book/translation excerpts.

## Exact commands to establish in implementation PRs

The repository currently exposes npm/Vitest/Playwright scripts; the first implementation PR should standardize and document commands equivalent to:

```bash
npm ci
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Baseline result at audited commit `7916775`: `npm ci` fails before dependency installation because `package-lock.json` lacks the declared `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, and `@dnd-kit/accessibility` packages. Consequently lint, unit, build, and E2E were not run in this documentation audit. Reconcile and review the chosen lockfile in the first implementation PR; do not replace the frozen install with `npm install` in CI.

Add dedicated commands rather than relying on tribal knowledge:

```bash
npm run test:formation
npm run test:formation:property
npm run test:db
npm run test:rls
npm run test:content
npm run test:e2e:formation
```

The implementation PR must record the exact available script names and observed results. Documentation planning does not claim that the proposed commands exist yet.

## Exit criteria by rollout stage

### Internal

- pure-rule matrix and schema/API integration pass;
- no known cross-user/private storage issue;
- content bundle approved;
- kill switches and audit views work;
- migration dry run on synthetic heavy accounts.

### Small opt-in cohort

- no unresolved severity-1/2 privacy, rules, data-loss, accessibility, or safety defect;
- closeout/sync conflict rate is observable and support runbook exists;
- existing-user counts reconcile and imports are recoverable;
- notification and AI scopes remain optional/off by default;
- manual device/assistive-tech matrix passes.

### General availability

- at least one full-duration synthetic/time-accelerated 75-day state-machine test plus calendar-boundary soak;
- production cohort shows stable idempotency/sync and no unexplained attempt endings;
- backup/restore/export/deletion/incident drills pass;
- content, legal/privacy, theological, safety, accessibility, and support owners sign off;
- legacy archive and rollback access remain available.
