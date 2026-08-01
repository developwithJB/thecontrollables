# Current System Audit

Audit baseline: repository `developwithJB/thecontrollables`, `main` at `7916775`

Purpose: identify what can be reused, what must be preserved, and what must be made safe before the Christian formation system is introduced

## Executive assessment

The current application is a substantial React/Supabase product, not a prototype that needs replacement. Its routing, authentication, query layer, component system, responsive shell, and owner-scoped Postgres model are suitable foundations. The migration should be additive and feature-flagged.

The central problem is domain fragmentation. “Daily completion,” proof, book progress, onboarding, missions, reflection, and AI each have multiple representations. Some important records live only in browser storage. Date keys mix UTC and local time. Several user actions write to multiple tables from the client without a transaction. These patterns are tolerable for a flexible Life OS but unsafe for a strict, consecutive 75-day state machine.

Before strict mode is exposed, the product needs one versioned formation domain, one local-day policy, transactional/idempotent server commands, private proof storage, explicit consent boundaries, and a reversible legacy-import layer.

## Technology and operations inventory

| Concern | Current implementation | Formation implication |
|---|---|---|
| Framework | React 18, TypeScript, Vite 5 | Keep. Add a domain package and path-aware screens incrementally. |
| Routing | React Router 6; public landing/auth/quick-start and an authenticated persistent layout | Keep. Add formation routes behind flags and preserve legacy routes/redirects. |
| Server state | TanStack Query with Supabase hooks; queries commonly use `offlineFirst`, mutations do not retry | Keep for reads. Strict writes require server commands and a deliberate offline queue. |
| Local state | React state plus extensive `localStorage` persistence | Suitable for drafts only. Formation history and proof metadata need server persistence. |
| Database | Supabase Postgres with approximately 81 SQL migrations, RLS, functions, triggers | Keep. Add additive, owner-scoped formation tables and transactional RPCs. Audit duplicate migrations and generated-type drift. |
| Authentication | Supabase Auth through `useLifeOSAuth`; authenticated routes redirect to `/auth` | Keep. Remove any reliance on client identity fields in server writes; standardize function authentication. |
| Design system | Tailwind, shadcn/ui, Radix primitives, Lucide icons, Framer Motion | Reuse tokens, cards, dialogs, sheets, progress, toast, forms, and responsive navigation. |
| Storage | Supabase Storage; meal assets are private, but `certificates` and `ig-proof-images` are public | New formation proof must use a private bucket and signed URLs. Legacy public assets require remediation. |
| Email/push | Resend via edge functions, email preference fields/logs, Web Push subscriptions | Reuse delivery plumbing after consent, auth, quiet-hour, and sensitive-content changes. |
| AI | Lovable-backed edge functions; legacy guide sessions plus newer orchestrator/memory/consent tables | Reuse only behind granular consent and data minimization. AI cannot be the rules authority. |
| Analytics/error reporting | Optional PostHog and Sentry; PostHog autocapture and user identification | Replace sensitive-page autocapture with an event allowlist; never capture user text. |
| Unit tests | Vitest in Node; suite is focused on `tests/unit` and coverage on `src/lib` | Extend to pure formation rules, temporal behavior, and migration adapters. |
| E2E tests | Playwright projects for desktop, mobile, and tablet; current emphasis is auth/paywall/Stripe | Add path, migration, privacy, offline, and strict-attempt journeys. |
| Deployment | GitHub Actions builds with Node 20 and force-pushes static output to `gh-pages`; Supabase deployment is separate | Keep frontend pipeline but add lint/type/test/migration gates, environment documentation, and coordinated backend rollout. |
| Package management | `package-lock.json`, `bun.lock`, and `bun.lockb` coexist; workflow uses `npm install`. At the audited commit, `npm ci` fails because four declared `@dnd-kit` packages are absent from `package-lock.json`. | Standardize CI and contributor docs on one lockfile/tool, synchronize the chosen lock, and require a frozen install before reproducible rollout. |
| Type safety | TypeScript strictness is disabled; generated Supabase types exist but some code uses `as any` or direct REST | Do not block all work on strict-mode conversion. Make the new formation package strict and regenerate DB types per migration. |

### Deployment observations

- The Pages workflow does not run unit, E2E, lint, type, or migration verification before publish.
- The workflow's `npm install` hides lock drift that a clean `npm ci` correctly rejects. At `7916775`, the missing lock entries are `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, and `@dnd-kit/accessibility`; lint, tests, and build could not be run from a clean npm install without changing the repository.
- Frontend and Supabase functions/migrations have no repository-encoded atomic release process. Feature flags must tolerate either side arriving first.
- BrowserRouter, absolute PWA assets, and the Vite base path need an explicit custom-domain versus project-pages test. A project subpath can break routes, icons, or offline navigation.
- `.env` is tracked and `.gitignore` does not exclude it. The checked-in values are public client configuration, not a service secret, but the convention invites future secret leakage. Commit `.env.example`, ignore `.env*` with an exception for examples, and rotate any credential if history contains more than intended.

## Current product map

### Routing and navigation

Public entry points include `/`, `/auth`, and `/quick-start`. The authenticated shell exposes `/home`, `/timeline`, `/read-along`, `/goal`, `/my-controllables`, `/train`, `/proof`, `/proof/dex`, `/dex`, `/wellness`, `/planner`, `/growth`, `/reflect`, and `/wealth`, with legacy redirects such as `/dashboard` and `/money`. Billing, admin, reset, and integrations also have standalone routes.

The persistent shell and responsive navigation are reusable, but the number of parallel destinations reinforces the Life OS mental model. Formation should initially add a path-aware home and history without deleting legacy destinations. Navigation can be simplified only after migration telemetry and support readiness show that users can still find preserved data.

### Onboarding

There are at least three overlapping first-run systems:

1. Public Quick Start collects book status, birthday/perspective, season, starter team, current need, a seven-day snapshot, and then account creation. Its versioned draft lives in `localStorage`.
2. Authenticated onboarding follows mission, snapshot, orientation, covenant/reset start, and completion. An older full flow also includes integrations, assessment/archetype, journey, guides, orientation, and reset.
3. Daily operator onboarding collects day type, control level, what matters, and protection needs, then invokes AI briefing.

The home route gates on onboarding/reset/operator/weekly-pulse states, and a timestamp-based reset can re-onboard previously completed users. A formation migration must not reuse that reset mechanism. Add a separate versioned formation invitation and path-choice state. Existing `user_onboarding` completion remains intact.

### Life OS home

`src/pages/Home.tsx` is an orchestrator for onboarding gates, reset state, calendar/wearable/check-in signals, drift/alignment, a dated goal, timeline, Today's Read, Control/Release/Move, My Controllables practice, charge, local mission, self-trust, drift recovery, and AI briefing.

Reusable pieces include the responsive cards, skeleton/error patterns, daily header, timeline preview, and signal-loading behavior. The page itself should not absorb formation rules. A new path-aware composition should consume a single `FormationToday` read model and `nextRecommendedAction` result.

## Feature implementation audit

### The Five Controllables

The canonical concepts are Awareness, Perspective, Habit, Wellness, and Environment. Legacy daily-ring keys map approximately to `notice`, `choose`, `prove`, `charge`, and `align`.

Definitions and presentation data are repeated across `src/lib/controllables.ts`, `controllableTheme.ts`, `controllableRoster.ts`, `bookWorld.ts`, `snapshots.ts`, daily-ring hooks, and the mission edge-function shared module. This creates copy, icon, color, and rule drift. Establish one versioned `CircuitDefinition` contract. UI theme data may remain separate, but IDs and semantic meanings must not be duplicated.

`daily_rings` stores one row per user/date with five booleans and responses. The hook creates a row on load and applies optimistic updates. It is useful legacy evidence, but it cannot be strict-day authority because the date source is not consistently server-defined, row creation is a read side effect, and booleans do not contain movement blocks, covenant, service, rule version, or closeout evidence.

### Main Mission, Mission of the Day, and promises

The mission edge function builds a daily mission from an AI plan or fallback, targets one Controllable, and uses XP/self-trust language. Completion is detected by exact action text, then written to `completed_actions`, `xp_logs`, and a daily ring in separate client/server steps. `main_quests` represents a longer mission, while `integrity_logs` represents kept promises. Home also has a signal-suggested mission and a browser-only Control/Release/Move note.

These are semantically related but technically separate. Formation needs a typed Main Promise and daily recommended action. It can link to legacy action/quest/integrity IDs for preservation, but exact display text must not be an identity key and XP must not determine formation completion.

### Proof and the Dex

Two disconnected systems exist:

- The newer Controllables Dex sanitizes and re-encodes a photo, stores a base64 data URL and metadata in `localStorage`, defaults to private, omits exact location, and excludes captions from sharing by default. Its privacy posture is directionally correct, but browser quota, device loss, and cross-device access make it unsuitable as durable history.
- Legacy Instagram-style proof uses `ig_proof_entries` and the public `ig-proof-images` bucket, obtains public URLs, and supports AI classification/history. This contradicts “private first” for personal proof.

Share-copy filtering tests reduce accidental disclosure but are not a storage or authorization boundary. New `proof_assets` must use a private bucket, owner-only policies, signed URLs, stripped metadata, explicit visibility, and purpose/evidence classification. Legacy public objects need inventory, owner notification where appropriate, private-copy migration, URL rotation, and deletion from the public bucket after verification.

### Seven-day snapshots/reset

Static snapshot definitions provide focus buckets and daily actions. `reset_sessions` tracks a fixed seven-day start, current day/status, timezone, covenant, invite/season/journey, completion, and maintenance fields. `daily_resets` stores reflection, commitment, and release. Snapshot/history screens aggregate resets, actions, promises, wellness, and XP.

The existing system assumes one shared sequence and fixed seven-day progression. Multiple active sessions are not prevented by a partial unique constraint. Some application types include `expired` while the initial database constraint did not. Day arithmetic relies on date strings/milliseconds and the current browser zone. Normal history UI can also retroactively upsert daily rings for the previous 30 days.

Preserve these sessions as legacy history, but do not adapt them into 40- or 75-day authority. The retrospective ring editor must never write into a strict attempt.

### AI guides and operator

Legacy `guide_sessions` stores full message arrays and derives themes across sessions/actions. `AIGuidePanel` routes among five personas, uses client-side quotas, and may grant action XP. Clearing the panel starts a new session rather than deleting history.

The newer operator has `ai_daily_plans`, action proposals, memories, consents, feedback, usage events, limits, and explicit confirmation for executable actions. Consent fields already distinguish memory, calendar, wellness, money, email context, suggestions, personalization, and nudges.

Use the newer consent/action-confirmation model as the basis, but add formation-specific scopes. Reflections, prayers, covenant text, service details, and wellness context are not implied by general personalization consent. Avoid inferring or persisting “ego signals” from private spiritual writing unless the user sees, edits, and explicitly saves the inference.

### Book progress and daily reading

`ReadAlong` has eight hard-coded sections: dashboard, five Controllables, ego, and integration. Book status supports `reading_now`, `finished`, `not_started`, and `rereading_or_leading`. Completed and current sections are visible; future content is collapsed. Progress and practice completion live only in `read_along_progress_<user>` in browser storage. Reflection prompts are displayed but not saved.

`DailyReadingCard` is a separate system: a date-keyed browser completion record and hard-coded reading library chosen partly from assessment/day patterns. A public-read `daily_readings` database table also exists.

The formation Read Along must define book edition/chapter mappings and a spoiler policy, import the browser record with confirmation, and distinguish reading completion from daily reading cards. Content should move into governed, versioned records rather than remain scattered in bundles.

### Reflections

`/reflect` wraps the broader Growth surface rather than a focused journal. Personal text exists in `daily_resets`, `daily_rings`, `notice_entries`, `reframe_entries`, `proof_actions`, `wellness_logs`, `time_logs`, `guide_sessions`, `ai_memories`, and browser-only Control/Release/Move/My Controllables state. `ResetDay` may send a submitted reflection to `ai-reflect` in the background; the formation consent boundary is not explicit.

Migration must preserve these records in place and expose a unified read-only history index before attempting semantic conversion. New reflections need a purpose, sensitivity class, AI-sharing flag, content version, and owner-only policy. Text is excluded from analytics and notifications.

### Notifications and email

Profiles carry email nudge settings, frequency, and timezone. Web Push has its own subscriptions. `send-daily-nudge` runs with service-role access, sends through Resend, localizes around 7 a.m., and composes from broad private context such as rings, planner, wellness, health, promises, drift, goals, and timeline. Mission email copy still contains XP/Dex language.

Several edge functions are configured with `verify_jwt = false` and self-check authentication. Scheduled functions need signed scheduler secrets and an explicit user scope. `send-push-nudge` mixes a public-key use case with privileged subscription delivery; split the public VAPID endpoint from the authenticated/signed scheduler command and test fail-closed behavior.

Formation notifications should query a minimal server read model and contain no private text. A user must be able to opt out by channel and message purpose.

## Data that must be preserved

| User value | Current locations/examples | Preservation strategy |
|---|---|---|
| Book progress | `read_along_progress_<user>` browser key; daily reading completion key | Consent-based browser import with source/version; retain unmapped section IDs and ask user to confirm chapter mapping. |
| Reflections | `daily_resets`, `daily_rings`, notice/reframe/proof/wellness/time logs, guide sessions, AI memories, browser notes | Leave canonical rows intact; create an owner-only history index/link. Copy only with explicit purpose and provenance. |
| Missions/promises | `completed_actions`, `main_quests`, `integrity_logs`, local mission/Control-Release-Move | Preserve original records; import a link or historical promise without granting new strict credit. |
| Existing proof | Browser Dex and `ig_proof_entries`/storage | Import browser data after confirmation; migrate public storage to private; retain timestamps/source/visibility. |
| Historical snapshots | `reset_sessions`, `daily_resets`, snapshot definitions/aggregates | Keep immutable legacy archive; do not synthesize 40/75 completion. |
| Completed Controllable activity | `daily_rings`, completed actions, timeline events/impacts/snapshots, proof actions | Index as legacy formation activity with original source and date semantics. |
| Certificates/completions | certificate tables and public certificate storage | Preserve records; move sensitive assets private or deliberately public only after owner choice. |
| Profile/onboarding | profiles, user onboarding, assessments, selected journey | Do not reset. Add a separate formation profile and migration invitation version. |

Browser keys requiring explicit import coverage include `read_along_progress_<user>`, `my_controllables_profile_<user>`, `controllables_dex_<user>`, `local_mission_drop_<user>`, `control_release_move_<user>_<date>`, and `reading_done_<user>_<date>`. Importers must tolerate schema versions and malformed/quota-truncated data.

## Reusable patterns and components

- Authenticated route shell, error boundaries, loading/skeleton patterns, and TanStack Query conventions.
- shadcn/Radix primitives for dialogs, alerts, sheets, tabs, cards, progress, forms, switches, tooltips, and toasts.
- Tailwind tokens, safe-area handling, responsive max-width containers, desktop sidebar, and mobile bottom navigation.
- Existing timezone/profile settings UI after it is connected to one temporal policy.
- Private meal-photo storage as a reference implementation for formation proof.
- Timeline event/impact projection as an inspiration for read models, not a completion authority.
- AI consent and action-proposal/confirmation tables as a base for granular formation consent.
- Existing Playwright device projects, reduced-motion CSS, Sentry boundary, email logs, and push subscriptions.
- The sanitized-photo pipeline and share-preview principles from the newer Dex.

## Required refactors and safety gates

### Must precede strict-mode writes

1. Create a pure, strict TypeScript formation domain with versioned rules and no React/Supabase dependencies.
2. Establish a Temporal/local-date policy. Stop using mixed `toISOString().split("T")[0]`, locale formatting, and raw 86,400,000 ms arithmetic for formation rules.
3. Move closeout, attempt ending, restart, and multi-circuit completion into transactional, idempotent server commands with row locking or optimistic version checks.
4. Add one active-attempt constraint per user/track and append-only history constraints.
5. Add private proof storage and signed URL access before accepting formation photos.
6. Define offline event IDs, receipt timestamps, conflict state, and a bounded closeout grace policy.
7. Regenerate Supabase types and prohibit `any` in the new domain/data-access folders.
8. Disable sensitive analytics autocapture and introduce allowlisted formation events.
9. Standardize edge-function authentication, separating public configuration reads from privileged scheduler work.

### Can be incremental

- Consolidate duplicate Five Controllables display metadata.
- Move hard-coded content into versioned governed content records.
- Replace exact-text mission identity with stable IDs.
- Move browser-only formation data to server storage through the migration flow.
- Deprecate legacy XP/charge presentation inside the new formation surfaces.
- Improve CI/package-manager consistency and gradually raise TypeScript strictness outside new code.

## Rules enforcement hazards

- `daily_rings` booleans lack required evidence detail and are optimistically edited from the client.
- Mission completion/XP/ring writes are separate and can partially succeed or duplicate during races.
- `useReset` writes daily completion and grants XP in separate non-transactional operations.
- Date keys come from browser locale, UTC ISO slicing, profile timezone, or edge-function UTC defaults.
- Raw millisecond day differences fail around DST and timezone changes.
- Users can retroactively edit up to 30 days of legacy ring history.
- Timeline snapshots are computed projections and must not become canonical evidence.
- Multiple active reset sessions are possible, and schema/application status values have drifted.
- Delayed/offline writes currently have no durable queue or server reconciliation contract.
- Text equality is used to identify some actions.
- Generated database types lag newer tables and invite unsafe casts/direct REST.

## Universal-journey assumptions

- One `journey_controllable` is stored in onboarding.
- One universal `daily_rings` row represents the day.
- Reset logic is fixed to seven days and home assumes that sequence.
- Snapshot definitions, guide stages, XP, and charge language assume a shared progression.
- Home gates and recommendations are not selected by an independent active training track.
- Read Along status/progress, daily reading completion, and the main journey are disconnected rather than coexisting tracks.
- The newest active reset is treated as the user's current state; concurrent or parallel paths are not first-class.

The new model must separate account/profile, reading progress, track enrollment/attempt, and immutable completion history. A person can retain Read Along while doing a 40- or 75-day path, but only one active attempt per structured track is recommended.

## Security and privacy risks

| Severity | Risk | Required response |
|---|---|---|
| Critical | `ig-proof-images` is public while proof is presented as private-first | Stop using it for new formation data; migrate to a private bucket and rotate/remove public objects. |
| High | Broad service-role notification functions and inconsistent `verify_jwt=false` configuration | Define auth mode per function, signed scheduler requests, least-privilege queries, and negative tests. |
| High | PostHog autocapture on screens containing spiritual, wellness, and reflection inputs | Disable autocapture/session text collection on sensitive surfaces; use allowlisted metadata-only events. |
| High | Browser-only proof/reflection/progress can be lost or exposed on a shared device | Encrypt/avoid sensitive drafts, provide server import, local clear controls, and no browser storage after confirmed import unless necessary. |
| High | Client multi-write commands can create inconsistent or duplicate completion | Transactional idempotent server command with unique event IDs and locks/version checks. |
| Medium | Public or broadly readable invite/challenge policies expose discoverable metadata/progress | Do not reuse challenge tables for formation groups; narrow/drop broad invite policies. |
| Medium | Anonymous telemetry inserts can be abused | Rate limit, validate schema, avoid PII, and restrict origin/service path. |
| Medium | Tracked environment file creates bad secret-handling precedent | Ignore local env files, document public vars, scan history, rotate actual secrets if found. |

See [privacy-and-safety.md](./privacy-and-safety.md) for the complete policy.

## Accessibility, responsive, and offline risks

- Radix primitives and existing focus/reduced-motion styles are a useful base, but many Framer Motion call sites do not honor `prefers-reduced-motion` directly.
- Some icon-only buttons rely on `title` rather than an accessible name.
- Compact five-column controls and fixed mobile navigation need 320px/zoom/large-text testing.
- The PWA manifest prefers portrait orientation, which may disadvantage tablet, mobility, or mounted-device use.
- Offline reads are partially supported, but mutations are online-only with no durable queue. A “complete” appearance can be lost or arrive after a strict boundary.
- Color, ring fill, and motion cannot be the only status cues. Ended/incomplete states need neutral text and screen-reader announcements.
- Photo capture needs non-camera alternatives and must never be required for a person using assistive technology.

## Timezone and temporal risks

Formation dates currently arise from at least four semantics: browser-local date, UTC date, profile timezone, and server/scheduler timezone. DST creates 23- and 25-hour local days; travel can move the local date forward or backward; an offline device can report a stale zone; a malicious or accidental clock change can fabricate history.

The strict system needs:

- an IANA timezone stored at attempt start;
- a documented choice between fixed-attempt timezone and audited effective-date changes;
- server-derived local date for all authoritative commands;
- both client occurrence and server receipt timestamps;
- a unique device event ID and idempotency key;
- no raw millisecond calendar arithmetic;
- explicit ambiguous/nonexistent local-time tests;
- a bounded offline closeout policy and review state instead of silent backdating;
- an immutable audit event for timezone changes.

## Migration-level database observations

- Two July 2026 timeline migrations contain near-duplicate table/function/trigger definitions. Some objects use `IF NOT EXISTS`, while policies/triggers may not be safely repeatable. Verify a clean replay and a production-schema diff before adding formation triggers.
- Timeline triggers fan in many source tables and produce `daily_charge_snapshots`. Those snapshots are materialized summaries and should be rebuilt from canonical source, never used to decide strict completion.
- Certificate storage is public and two certificate-table concepts coexist.
- Some challenge policies allow authenticated discovery of invite-code challenges and participant progress. Formation service/wellness data must not inherit these policies.
- Formation should use additive migrations with explicit constraint names, rollback-compatible feature flags, generated type updates, and a migration test against both an empty database and a representative upgraded database.

## Audit conclusion

Keep the stack and most platform primitives. Build the new formation model beside legacy tables, hide it behind server-and-client feature flags, and migrate by linking/importing rather than rewriting history. The first implementation change should be a dependency-free formation contract and rules package with a single temporal policy and golden tests. It creates a stable target for schema, APIs, and UI while introducing no production writes.
