# Architecture and naming

The Dashboard is a Vite/React/TypeScript browser app with Supabase Auth, Postgres/RLS, Storage, and Edge Functions. Stripe handles subscriptions; optional AI/provider and integration services run behind server boundaries.

## Follow a request

1. `src/main.tsx` starts the browser app and telemetry hooks.
2. `src/App.tsx` composes providers and lazy route imports. `src/lib/appRoutes.ts` defines existing URL contracts.
3. `src/components/layout/AppLayout.tsx` holds the authenticated shell. `src/hooks/useAppAuth.ts` exposes `useAppAuth`, `AuthenticatedUserContext`, and `useAuthenticatedUser`.
4. Pages compose UI and hooks. Hooks coordinate queries and mutations; `src/data` contains typed persistence adapters.
5. Domain helpers calculate product rules. Supabase RPCs, RLS, and Edge Functions enforce server authority.

The shell remains mounted between its child routes. Formation pages can render while optional book data loads. Keep provider order, lazy loading, auth redirects, and route ownership intact during a refactor.

## Pages by product area

Every page filename and default component ends in `Page`. Grouping is for contributors; URL paths do not change.

| Folder | Responsibility | Examples |
| --- | --- | --- |
| `src/pages/public` | Public product and policy pages | `LandingPage`, `PricingPage`, `PrivacyPage`, `TermsPage`, `NotFoundPage` |
| `src/pages/onboarding` | Account entry and first setup | `AuthPage`, `QuickStartPage` |
| `src/pages/formation` | Today, individual circuits, completion | `FormationTodayPage`, `FormationCircuitPage`, `FormationCompletionPage` |
| `src/pages/practice` | Personal practice, book, and evidence | `DailyDashboardPage`, `TrainingPage`, `ReadAlongPage`, `MyControllablesPage`, `EvidencePage`, `ProofCollectionPage` |
| `src/pages/planning` | Planner, goals, and timeline | `PlannerPage`, `GoalPage`, `TimelinePage` |
| `src/pages/wellness` | Wellness and the separate 7-day reset | `WellnessPage`, `ResetPage` |
| `src/pages/reflection` | Growth and reflection | `GrowthPage`, `ReflectionPage` |
| `src/pages/coaching` | Coach and operator interface | `CoachPage`, `OperatorPage` |
| `src/pages/money` | Personal money tools | `MoneyPage` |
| `src/pages/account` | Subscription and integration setup | `BillingPage`, `IntegrationsPage` |
| `src/pages/admin` | Administrative tooling | `AdminPage` |
| `src/pages/legacy` | Preserved compatibility component | `DashboardRedirectPage` |

`ProofOverviewPage`, `OperatorPage`, and `DashboardRedirectPage` preserve existing components; moving them does not add routes. Existing `/dashboard`, `/proof`, and `/money` redirects remain defined in `App.tsx`. `/wealth` still hosts Money. Keep aliases so bookmarks keep working.

## Other source directories

| Directory | Put this here |
| --- | --- |
| `src/components/<feature>` | Reusable feature UI; `layout` holds the shell/navigation; `ui` holds shadcn primitives |
| `src/hooks` | React state, auth, queries, and feature orchestration |
| `src/domain/formation` | Circuit definitions, completion rules, 75-day arc, first week, and draft Gospel framing |
| `src/data/formation` | Content, entries, proof, strict journey, and completion repositories |
| `src/data/bookLoop` | Typed local/server book records, serialization, and import adapters |
| `src/data/coach` | Coach settings persistence |
| `src/lib` | Shared product rules, formatters, browser adapters, and integration contracts |
| `src/integrations/supabase` | Generated database types and browser client |
| `supabase/functions/<deployed-name>` | One deployed server function; `index.ts` is its entrypoint |
| `supabase/functions/_shared` | Server helpers shared by deployed functions |
| `supabase/migrations` | Canonical ordered SQL history; immutable once applied |
| `scripts` | Local security/database harnesses and maintenance tools; `ops` contains reviewed operator SQL |
| `tests/unit`, `tests/e2e`, `tests/edge`, `tests/database` | Unit rules, browser workflows, actual handler mocks, and database checks |
| `public` | Static public assets and discovery metadata |
| `docs` | Current guides, feature references, content governance, and dated release evidence |

Do not move deployed Edge Function folders to match frontend conventions: their directory names are deployed endpoint contracts. Similarly, `index.ts` is an intentional runtime convention, not an unclear filename.

## Naming examples

- Components and types: `FormationTodayPage`, `FirstWeekPanel`, `PersonalReward`.
- Hooks: `useFormationCircuits`, `useAuthenticatedUser`.
- Helpers: `getCertificateStoragePath`, `getPrivateCertificateUrl`, `getResetDayNumber`, `recordPersonalAction`, `awardLegacyPersonalEvent`.
- Use full words for application concepts. Short names remain useful for a local array index or an established protocol field; avoid unexplained abbreviations for domain state.
- Match nearby naming rather than renaming stable JSON or SQL fields for style. Generated types are not hand-written naming guidance.

## Product terms and compatibility

| Existing term | Meaning |
| --- | --- |
| Formation / circuit | Daily practice / one of the five Controllables |
| Read Along | Flexible book-connected practice path; no strict attempt credit |
| Fully Charged 75 | Reviewed-content-gated strict attempt with server closeout |
| Charge | Product language for readiness/energy; not a medical measurement |
| Snapshot / reset | Existing time-bounded personal plan; distinct from a strict formation attempt |
| Dex | The existing private proof collection; retained in URLs, storage models, and analytics |
| BYO | Bring your own AI provider/key |
| Covenant / promises | Personal commitments; legacy records are separate from formation practices |
| LifeOS, DailyOS, rings | Historical identifiers retained where they are persisted/deployed contracts; prefer clear product wording in new UI |

## Data and trust

Formation entries, book records, daily rings, legacy XP, and promises are separate data sources. A read-side summary must not fabricate rewards or merge their meanings. Strict completion uses reviewed effective content and server-derived closeout, not UI counts.

Book-loop defaults are enabled in frontend configuration; real server behavior still depends on authenticated backend support. Mock sessions use local fixtures. Imported browser records never overwrite existing server records. See [server storage](SERVER_BOOK_LOOP.md).

AI and billing authority stay on the server. See [hosted coaching](HOSTED_COACH.md), [provider keys](COACH_PROVIDERS.md), and [security](../SECURITY.md). Telemetry uses a bounded server gateway, not direct client inserts into event tables; see [the telemetry contract](TELEMETRY_CONTRACT.md).

## Hosting and schema

GitHub holds reviewable code. Lovable synchronizes the connected branch and publishes the hosted frontend. Supabase migrations, Edge Functions, secrets, rollout settings, and Stripe configuration require separate release verification. GitHub Pages also has an existing static-build workflow; that is a separate publication target, not a substitute for the Supabase backend.

Use npm and `package-lock.json` for the documented contributor workflow. Historical Bun lockfiles remain in the repository; do not refresh a competing lockfile independently or remove managed-tool inputs without checking the build integration.

The Drizzle scaffold is retained for managed tooling. It is not a second source of schema truth. Do not rename applied SQL, RPCs, deployed endpoints, storage buckets, event names, feature flag keys, or browser storage keys in a readability cleanup.
