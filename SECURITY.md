# Reporting a security concern

Do not post an exploit, credentials, customer records, private reflections, health data, or signed URLs in a public issue.

If GitHub shows **Report a vulnerability** on the repository’s Security tab, use that private channel. If it is unavailable, ask the maintainer through an existing private contact for a secure reporting channel. Do not include exploit details while establishing contact. This repository does not publish a separate security inbox or promise a response SLA.

A useful private report identifies the affected page/function, a minimal reproduction using your own synthetic account, the expected boundary, and the observed result. Never test against another person’s account or run live purchases, email campaigns, or provider syncs to demonstrate impact.

## Boundaries contributors must preserve

- Authenticated owner identity comes from the server-validated session, not a client user ID or editable profile metadata.
- RLS and private Storage policies protect customer data. Certificate downloads use short-lived owner-scoped signed URLs.
- Stripe customer ownership, subscription projection, and rewards are server-owned. Webhooks require signature verification and duplicate handling.
- Hosted AI reserves a bounded allowance before provider calls. Personal keys stay server-side in Vault; no service-role/provider key belongs in `VITE_` variables.
- Private prompts, proof, prayers, and health records must not enter telemetry or public evidence.
- Strict formation content must pass independent review; strict closeout stays server-derived. Personal practice reports are not strict completion authority.
- Do not disable gateway JWT protection to make a scheduler or integration work. Review the handler and intended authorization together.

## Verification status

See the dated [customer-launch security evidence](docs/security/customer-launch-2026-10-21.md) and [testing guide](docs/TESTING.md). Evidence is specific to the reviewed revision and environment; it does not certify every fork, dependency, or future deployment.

Known build dependency advisory: [issue #80](https://github.com/developwithJB/thecontrollables/issues/80). The repository also has an existing lint backlog. Keep these visible; do not equate a successful build with a clean security audit.
