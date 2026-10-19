# Bring-your-own agent: MCP design only

No MCP server, tool endpoint or privileged agent token is implemented by PR-D. This design describes a possible user-controlled connection to the existing book-loop API. It requires its own security review and explicit implementation authorization.

## Authentication and scopes

Use user-scoped OAuth with PKCE and short-lived Supabase JWTs. Validate issuer, audience, expiry and account binding server-side. Never forward service-role credentials, provider keys or arbitrary bearer tokens to an agent. Default scope is `book_loop:read`; request separate, revocable `book_loop:write` consent only for explicit edits. Never grant formation administration, content review/publish, circuit completion, day closeout, proof access, billing changes or private health/prayer/reflection access through this surface. No arbitrary SQL or URL-fetch tool.

## Proposed tools and existing contract

| Proposed tool | Existing source | Scope and behavior |
| --- | --- | --- |
| read_book_loop | owner-filtered `controllables_book_records` | read; named safe fields, bounded page size, no unrelated account data |
| propose_book_loop_changes | local proposal only | read; show human-readable changes and expected revisions, no write |
| save_book_loop_changes | existing `save_book_loop_changes` RPC | write; preserve authenticated owner and CAS expected revisions; require user confirmation for the concrete change set |
| import_book_loop | existing `import_book_loop` RPC | separate explicit bulk-write consent; preserve validation/idempotency, size caps and revision checks |

For `book_loop_conflict`, return current revisions and conflicting record identifiers to the same owner. Do not retry blindly or overwrite newer work. Refetch, present a revised proposal, and require explicit user confirmation. Replayed tool requests carry stable idempotency keys. Mutations always run through the existing RPC, never direct table writes or a service-role proxy.

## Boundaries and operations

Use bounded reads, per-user rate limits and request sizes, structured redacted error codes, auditable metadata without record text, and revocable grants. Reject client-supplied user IDs that differ from the verified JWT. Treat imported/agent text as data, never instructions to the service. Keep write scopes isolated from AI provider selection and billing. Reauthentication/account switching must clear local agent state. Test cross-account isolation, expired/revoked scopes, stale CAS revisions, duplicate retries and oversized imports before any release.

The agent can suggest practices and point to reviewed content. It has no Scripture authority. It must retain Awareness 🦉, Perspective 🐢, Habit 🦈, Wellness 🛰️ and Environment 🚀, and cannot approve or publish content, mark circuits complete, close days or bypass strict closeout. Existing owner-scoped book-loop permissions are necessary but insufficient for any future formation mutation; those capabilities are explicitly excluded from this design.
