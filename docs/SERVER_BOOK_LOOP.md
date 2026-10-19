# Server storage for the book loop

Implemented on `feat/server-book-loop`; not deployed. The feature flag
`server_book_loop_enabled` defaults **false**. With the flag off, signed-out users,
and dev mock-auth sessions, the existing browser storage keys remain in use.
With the flag on for a real signed-in account, the authenticated shell loads
Supabase records and the book hooks use TanStack Query and confirmed server writes.
Auth/recovery pages and the shell's sign-out controls remain available on load errors.

## Data contract

Migration: `supabase/migrations/20261007000100_server_book_loop.sql`.

Two owner-private tables are exposed through Supabase's normal authenticated API:

- `controllables_book_records`: primary key `(user_id, kind, record_key)`, JSONB
  `payload`, server-managed `revision`, `created_at`, and `updated_at`.
- `controllables_book_imports`: primary key `(user_id, import_id)`, creation timestamp.
  This is the atomic successful-import receipt, not a feature entitlement.

The existing typed domain payloads are retained instead of creating a second
incompatible product model. Promises and Dex entries have separate rows; other
small aggregates are versioned documents. All data remains private even when a
payload contains a `public` sharing preference; this change adds no public policies.

| Kind | Record key | Payload / source type |
| --- | --- | --- |
| `profile` | `current` | My Controllables profile except `proofEntries` |
| `promise` | local date `YYYY-MM-DD` | `LocalProofEntry`; one entry per day, matching existing behavior |
| `dex` | stable proof-entry ID | `DexProofEntry`, including sanitized image data URL |
| `missions` | `current` | Local mission preferences, started IDs, completions, dismissed-photo IDs |
| `crm` | local date `YYYY-MM-DD` | `{ control, release, move, keptPromise }` |
| `reading` | `current` | `ReadAlongProgress` |
| `track` | `current` | TrainingTrack string |
| `startingCharge` | `current` | `{ result: StartingChargeResult | null }` |

`src/data/bookLoop/model.ts` contains typed serialization; `local.ts` maps the old
keys; `repository.ts` owns requests; `useBookLoopState.ts` owns queries/mutations.
Existing feature hooks retain their domain helpers and now call this shared layer.
Starting Charge is included because My Controllables displays that separate local
profile result. The auth onboarding helper still stages a local track selection
before the import decision; interactive signed-in track changes use the server.

The main Daily Mission completion/XP path already uses `completed_actions`,
`xp_logs`, and `daily_rings`; it is unchanged. This migration covers the remaining
local Mission Drop preferences/progress, not duplicate XP issuance. Covenant
history and Fully Charged practice/attempt/content tables are separate and unchanged.

## Authorization and concurrent writes

Both tables enable RLS with `auth.uid() = user_id` policies for select, insert,
update and delete, scoped to `authenticated`. PUBLIC/anon/broad authenticated grants
are revoked. Column grants permit record insertion and payload updates; owner,
identity, revision and timestamps cannot be updated by clients. Import receipts
have insert/select/delete privileges but no update grant (there are no editable
receipt fields). A sequence/trigger supplies revisions that are not reused after deletion.

`save_book_loop_changes(p_user_id, p_changes)` uses caller permissions (SECURITY
INVOKER), checks that the expected account equals `auth.uid()`, and atomically
applies changes under an account lock with observed-revision checks. A stale edit
raises `book_loop_conflict` and the entire batch rolls back. SQL row locks also
protect against direct authenticated API updates. There is no last-writer-wins
retry. The UI reports failure and refreshes; the user must review/reload current
values before retrying a stale form. Local drafts remain untouched on cloud writes.

Queries are keyed by account, cleared on account change/unmount, refreshed on focus
and every 30 seconds while book hooks are active. Writes invalidate that account's
cache. This is polling-based cross-device sync, not Realtime. Server writes fail
when offline rather than entering an ambiguous delayed queue. User-facing success
messages wait for confirmation. Unsaved CRM edits retain their original revision
through background refreshes so they cannot overwrite a newer note silently.

For a future agent/MCP client, authenticate as the intended user, read their rows,
and call the same RPC with `p_user_id` and a changes array:

```json
[{ "kind": "crm", "record_key": "2026-10-07", "payload": { "control": "", "release": "", "move": "Read one chapter", "keptPromise": false }, "expected_revision": 0 }]
```

`expected_revision: 0` means insert only if absent; otherwise use the revision read
from the row. Include `delete: true` to delete a known revision. Use RPCs for
conflict-safe writes; direct REST payload updates remain owner-allowed but lack
compare-and-swap unless the caller explicitly filters by revision. No agent/MCP
server or credential provisioning is created by this change. No service key belongs
in frontend variables. Flags and localStorage never authorize database access.

## One-time browser import

On the first signed-in load with the flag on, existing data for that account and
explicitly disclosed guest data triggers a confirmation dialog. Editors mount after
the user imports or chooses server data without importing. Other accounts' browser
keys are never read into the import. Starting Charge's legacy guest key is `local`.

The importer normalizes and splits existing records, retains stable Dex IDs and
promise dates, and hashes the snapshot. The account's own local record wins over
a guest record with the same key. `import_book_loop(p_user_id, p_import_id,
p_records)` inserts **only missing** records with `ON CONFLICT DO NOTHING`, then
writes its receipt in the same transaction. Existing server records always win;
a repeated receipt does nothing. A failed import rolls back all its changes and
can be retried with the same ID. No local record is removed, even after success.
The UI records the decision only after a confirmed import and fresh server read,
or explicit decline. Declining does not upload any local data.

The decision marker is per browser/account: `book_loop_import_decision_v1_<userId>`.
A new device with local data gets its own confirmation. For deliberate re-import,
remove only that marker, then reload; the server receipt and missing-only insertion
still prevent duplicate/overwrite. Disabling the flag returns to the preserved
browser state, **not** a downloaded mirror of later server changes.

Limits: up to 2,000 changes/import records per transaction and 8 MB per record.
Dex uses already-sanitized data URLs stored in private JSONB for this first migration;
there is no new public bucket and the IG-proof bucket is untouched. This favors
compatibility over large-archive performance. A future private object-storage
migration can reduce query size. Large/malformed imports fail visibly, retaining
the browser backup. Local-only photo blob URLs from outside the existing sanitized
capture flow are not portable; the supported capture flow produces data URLs.

## Local verification and rollout

Apply the migration only to an intentionally local Supabase database for review.
No remote migration/deployment is part of this change. Before enabling on a real
project, review and separately authorize deployment and verify its auth/API policies.
To opt a local browser in after its backend has the migration, merge
`server_book_loop_enabled: true` into its existing `feature_flag_overrides` JSON
and reload. Do not replace other overrides. The flag does not bypass dev mock auth:
use real local Supabase test users for backend integration checks.

Checks:

```bash
npm run test:unit
npm run test:unit -- tests/unit/controllable-emoji-contract.test.ts
npm run build
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run test:e2e:formation
```

Do not run the plain all-app E2E command or `stripe-production.spec.ts`.
`tests/database/book-loop-security.sql` is a transaction-wrapped local-only test
that ends in ROLLBACK. It covers owner/other-user/anonymous boundaries, column
privileges, account mismatch, import replay and atomic rollback, compare-and-swap,
and delete/reinsert revisions. During implementation it was executed against a
disposable PGlite PostgreSQL engine with a minimal auth fixture and passed. Docker
was unavailable, so a full local Supabase/PostgREST and simultaneous two-browser
integration run remains unverified. PGlite is not an application dependency.

## Review evidence (October 7, 2026)

- Social graphics preserved unchanged first: `2cc2b57`, branch `chore/preserve-social-graphics`.
- Baseline after `npm ci`: 52 unit files / 317 tests passed; Vite build passed;
  explicit emoji contract 2/2 passed. No typecheck script exists in package.json.
- After implementation: 57 unit files / 355 tests passed; Vite build passed;
  app and Node TypeScript checks passed; explicit emoji contract 2/2 passed.
- Dedicated formation Playwright: 12/12 desktop/mobile scenarios passed.
- Changed implementation/test ESLint and `git diff --check`: passed.
- New SQL migration and rollback-only security script: passed in local PGlite with
  a minimal auth fixture; no production or remote migration executed.
- `npm ci` reported 26 existing dependency advisories (9 moderate, 17 high).
  The production build retains its Browserslist-age and circular-vendor-chunk warnings.
- Unverified: full local Supabase/PostgREST, real two-device concurrent UI operation,
  remote schema/deployment, and live integrations. Docker's daemon was unavailable.
  No Stripe production E2E or plain all-app E2E was run.


## Completed local integration verification (October 19, 2026)

Docker is available. The book-loop migration was applied to an isolated local Supabase stack on ports 55321/55322, with real Auth and PostgREST. The rollback-only `tests/database/book-loop-security.sql` passed against that PostgreSQL instance. The actual BookLoopProvider/useBookLoopState UI then passed two Playwright integration scenarios using real local-only auth users, two browser sessions for one account and a third session for a second account. These verify confirmation-before-import, retained browser backup, cross-device refresh, account isolation, anonymous denial, stale revision rejection and mismatched-account rejection. Test-created local users are deleted afterward. No production users are created by these tests.

Reproduce against an intentionally local stack with the migration applied:

```bash
supabase status --workdir /path/to/local-stack --output json > /tmp/dashboard-local-status.json
node scripts/run-book-loop-local.mjs /tmp/dashboard-local-status.json
```

The runner refuses a non-local API hostname. Its status file includes local credentials and must remain outside the repository. The service role is passed only to the Node test runner, never to Vite or the browser. The fixture is a dev-only HTML entry and is not part of the production build. This is a targeted integration stack, not a claim that the repository's full historical migration chain was replayed.

Updated verification: 62 unit files / 377 tests passed; both TypeScript checks and production build passed; dedicated formation Playwright 12/12 passed; local book-loop Playwright 2/2 passed; SQL suite ends in ROLLBACK. Backend production deployment and flag enablement are separate steps authorized by JB's October 19 request.
