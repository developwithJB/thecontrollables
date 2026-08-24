# Christian Formation Security Review

Review date: 2026-08-04. Scope: formation circuits, Fully Charged attempts/days/closeout, private proof, completion, content OS, analytics, migrations, dynamic navigation touched by the release, and dependency/secret posture.

## Executive result

No open Critical or High dependency finding remains. The Fully Charged V1 authority is suitable for controlled local/staging evaluation. Production remains blocked on live Supabase migration/RLS/concurrency validation, approval of the no-offline-grace policy, and independent approval/publication of all 75 content versions. The separate 40-Day journey still has preview-only completion.

## Findings

| Severity | Finding | Disposition |
| --- | --- | --- |
| High | 40-Day has no server-authoritative attempt/day-closeout engine | **Open for that track only.** 40-Day completion remains explicitly preview-only; it does not block controlled Fully Charged V1 testing |
| High | Live RLS, RPC, storage, and migration execution not verified against the linked Supabase project | **External gate.** Current account lacks project privileges; contract tests are green |
| High | Fully Charged V1 intentionally rejects all late/offline strict writes | **Approval gate.** This fails closed and prevents fabricated completion, but product/pastoral owners must explicitly accept the user-impact policy before production |
| High | Upstream merge/deploy identity has read-only repository access | **External gate.** Publishing cannot be represented as complete until access changes |
| Medium | React Router 6 has two published advisories | **Mitigated/deferred.** This is a client-only SPA, so SSR hydration is unreachable. Dynamic database/AI destinations now pass `toSafeInternalPath`, rejecting external, protocol-relative, and backslash routes. A v7 major migration is deferred to a dedicated compatibility release |
| Medium | Legacy public proof may predate new private-bucket controls | **Open.** Preserve first, then inventory, copy, rotate URLs, and quarantine under an approved migration |
| Medium | Full account export/deletion is not orchestrated for every formation table | **Open.** Proof delete and completion export work; service-role deletion remains possible for account erasure |
| Low | Repository-wide legacy lint debt | **Open.** 410 errors outside changed formation scope; focused release lint is clean |

## Implemented controls

- Owner-scoped RLS on circuit records, proof objects, completion records, and private reflections.
- Owner-scoped RLS and revoked client writes on strict setup, attempt, and 75 canonical day rows.
- Direct writes revoked where state must pass constrained security-definer RPCs.
- Strict action claims are recomputed from the persisted payload; mismatched/unknown action claims, wrong day/rule/content, overdue writes, and overlapping attempt ranges fail closed.
- Completion record is immutable/count-only; private reflection is separate.
- Private proof is type/size validated, JPEG re-encoded, metadata-minimized, signed briefly, and deletable.
- Share SVG includes only explicit name/quote consent and escapes XML.
- Analytics accepts only named events/properties and rejects sensitive keys, URLs, email-like values, and long strings.
- Content publication requires independent admin review, human theological approval, citations where required, and published/effective status.
- Dynamic AI/database navigation is restricted to same-origin root-relative paths.
- Feature flags cannot experiment on theology, privacy defaults, or safety rules.

## Scan and test evidence

- `npm audit --audit-level=high`: pass; 0 Critical/High, 2 documented Moderate React Router advisories.
- Secret pattern scan: no service-role, private-key, GitHub token, or live payment-key match outside ignored environment files.
- Formation security/upload/migration/content/analytics tests: 46 files / 295 tests pass across the full Vitest suite.
- The rollback-only database simulation passes 75 days / 375 strict circuits, forged-claim rejection, missed Day 10, and 23/25-hour DST boundaries without retaining synthetic data.
- 12/12 desktop/mobile E2E scenarios verify scheduled cancellation, proof deletion, private reflection redaction, separate downloads, optional-proof non-authority, keyboard use, and automated accessibility.

## Required live authorization test after access is granted

1. Apply migrations in a staging Supabase branch/project.
2. Create owner A, owner B, admin author, and independent admin reviewer.
3. Confirm B cannot select/update/delete A’s setup, attempts, days, circuits, proof, completion, or reflection and cannot call close/cancel/content RPCs against A’s attempt.
4. Confirm ordinary users cannot read drafts; author cannot self-review; unpublished/effectively future content cannot leak.
5. Race two idempotent strict circuit writes, circuit/closeout, scheduler/closeout, Begin Again, and reflection saves; verify one stable terminal result and no overwritten history.
6. Verify signed proof URLs expire and deleted objects cannot be fetched.
