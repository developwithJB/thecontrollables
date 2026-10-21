# Contributing to The Dashboard

Start with the [README](README.md), [architecture](docs/ARCHITECTURE.md), [testing guide](docs/TESTING.md), [design conventions](DESIGN.md), and [repository instructions](AGENTS.md).

## Pick a focused change

Describe the user problem, expected behavior, and affected area in an issue or PR. Keep structural cleanup separate from behavior, schema, permissions, or pricing changes. Use a branch such as `codex/clear-description`; open a draft PR against `main` while work is in progress.

For UI work, use the existing components, semantic tokens, focus states, and mobile layouts. Make labels understandable without knowledge of the implementation. Explain branded terms when they first appear. Keep privacy, review status, billing, and AI-limit wording precise.

## Naming and placement

- Route components go in `src/pages/<area>/<Name>Page.tsx` and have a matching default component name.
- Reusable components use PascalCase; hooks use `useDescriptiveName`; pure helpers use descriptive camelCase verbs.
- Put formation rules in `src/domain/formation` and persistence adapters in `src/data`. Do not put database writes in domain rules.
- Keep Supabase’s generated client/types together in `src/integrations/supabase`; regenerate types from an approved schema rather than hand-maintaining a second model.
- Do not create an `index.ts` barrel for unrelated features. Direct imports make dependency direction visible.
- `src/components/ui` follows the existing shadcn primitive filenames. Consistency with that tool is more useful than cosmetic renames.
- Preserve URL paths, query parameters, stored JSON fields, localStorage keys, analytics names, database names, and deployed function names. These outlive a code refactor.

See the [architecture map](docs/ARCHITECTURE.md) for examples and legacy terminology.

## Safety boundaries

Awareness 🦉, Perspective 🐢, Habit 🦈, Wellness 🛰️, and Environment 🚀 are product canon. Run the emoji contract after changing their presentation or copy.

Server authentication, RLS, private storage, billing ownership, fixed rewards, and AI budget reservations are authorization boundaries. Client flags and localStorage are display/preferences, never authorization. Do not weaken a guard to get a test to pass.

Formation content needs the independent review defined in [content governance](docs/christian-formation/content-governance.md). Do not set publication/review statuses as part of ordinary app work, invent Scripture/book text, or substitute draft content for reviewed server content. A plan purchase cannot bypass this gate.

Use your own development Supabase project for real sessions. Never use production customers as fixtures. Mock provider calls; never send private prayers, health data, or credentials to telemetry or public PR evidence.

## Database and deployment changes

`supabase/migrations` is canonical. Do not edit applied migrations; propose a reviewed forward migration. The remaining Drizzle scaffold supports managed tooling and is not a parallel migration stream. Generated transport SQL must be checked against its canonical migration, never replayed as a second change.

Do not run remote migrations, destructive resets, `supabase db push`, `supabase link`, or `drizzle-kit push` as routine verification. The isolated database harnesses create synthetic data only in a deliberately disposable local database. Read each harness and set its documented environment before running it.

Keep gateway JWT verification enabled for `send-daily-nudge`, `generate-insights`, and `generate-snapshot-insight`. WHOOP currently also has explicit JWT protection and automatic ingress is paused. Some other handlers use provider signatures or explicit handler authentication; do not change a gateway setting without reviewing the entire ingress protocol.

GitHub merges, backend deployment, and Lovable frontend publication are distinct steps. A cleanup PR must not silently apply schema, rotate credentials, enable a rollout, or change billing. Preserve existing subscriber rates and data.

## Verification and PR evidence

Run the checks in [Testing](docs/TESTING.md). Report passing/failing test counts and lint error/warning counts. Identify existing failures explicitly; do not suppress rules or skip an assertion just to make the report green.

For a rename, update every import, lazy import, source-reading test, and current documentation link. Check type resolution and the production build. For copy, check the existing UI and mobile wrapping without changing interactions. Use synthetic screenshots and keep generated test output out of the PR.

A useful PR description explains:

1. The concrete problem and final change.
2. What routes or contracts remain stable.
3. Tests run and their actual results.
4. Known limitations and any separate deployment work.

Keep screenshots free of personal records, payment details, secrets, and signed preview links. Small mechanical commits followed by documentation/copy commits make review easier.

## Feedback and security

Use the [feedback template](https://github.com/developwithJB/thecontrollables/issues/new?template=feedback.yml) for ordinary corrections. Issues are public. For a suspected vulnerability, follow [SECURITY.md](SECURITY.md) instead.

There is currently no general reuse license in the repository. Please resolve licensing with the owner before redistributing a fork or incorporating third-party material. Contributing does not imply rights to book or Bible text.
