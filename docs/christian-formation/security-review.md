# Christian Formation Security Review

Review date: 2026-08-01. Scope: new formation circuits, private proof, completion, content OS, analytics, migrations, dynamic navigation touched by the release, and dependency/secret posture.

## Executive result

No open Critical or High dependency finding remains. The formation implementation is suitable for local/test-cohort evaluation. Production remains blocked on live Supabase migration/RLS validation and the missing authoritative attempt engine.

## Findings

| Severity | Finding | Disposition |
| --- | --- | --- |
| Critical | No server-authoritative 40/75-day attempt/day-closeout engine | **Open production blocker.** Completion is explicitly preview-only and cannot create authoritative claims |
| High | Live RLS, RPC, storage, and migration execution not verified against the linked Supabase project | **External gate.** Current account lacks project privileges; contract tests are green |
| High | Upstream merge/deploy identity has read-only repository access | **External gate.** Publishing cannot be represented as complete until access changes |
| Medium | React Router 6 has two published advisories | **Mitigated/deferred.** This is a client-only SPA, so SSR hydration is unreachable. Dynamic database/AI destinations now pass `toSafeInternalPath`, rejecting external, protocol-relative, and backslash routes. A v7 major migration is deferred to a dedicated compatibility release |
| Medium | Legacy public proof may predate new private-bucket controls | **Open.** Preserve first, then inventory, copy, rotate URLs, and quarantine under an approved migration |
| Medium | Full account export/deletion is not orchestrated for every formation table | **Open.** Proof delete and completion export work; service-role deletion remains possible for account erasure |
| Low | Repository-wide legacy lint debt | **Open.** 410 errors outside changed formation scope; focused release lint is clean |

## Implemented controls

- Owner-scoped RLS on circuit records, proof objects, completion records, and private reflections.
- Direct writes revoked where state must pass constrained security-definer RPCs.
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
- Formation security/upload/migration/content/analytics tests: pass.
- Desktop/mobile E2E verifies proof deletion, private reflection redaction, separate downloads, and optional-proof non-authority.

## Required live authorization test after access is granted

1. Apply migrations in a staging Supabase branch/project.
2. Create owner A, owner B, admin author, and independent admin reviewer.
3. Confirm B cannot select/update/delete A’s circuits, proof, completion, or reflection.
4. Confirm ordinary users cannot read drafts; author cannot self-review; unpublished/effectively future content cannot leak.
5. Race two idempotent circuit writes and reflection saves; verify one stable record.
6. Verify signed proof URLs expire and deleted objects cannot be fetched.

