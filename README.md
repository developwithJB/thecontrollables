# The Dashboard

The Dashboard is a calm, reflective Life OS for people who want help understanding their days before those days run away from them.

For the canonical product narrative, customer promise, current capabilities, privacy model, and technical snapshot, see [docs/PRODUCT_STORY.md](docs/PRODUCT_STORY.md).

It is built for users who do not want another streak app, another guilt machine, or another productivity tool that mistakes pressure for progress.

Instead, The Dashboard helps people:

- understand what kind of day they are actually in
- notice drift before it becomes a spiral
- choose one meaningful move instead of ten scattered ones
- reconnect planning, recovery, honesty, faith, and follow-through
- return without shame when life gets heavy

This repository is open source and designed to be useful for both:

- people exploring The Dashboard as a product
- builders who want to fork it into their own coaching, wellness, planning, or reflective operating system

## What The Dashboard Is

The Dashboard is a React + TypeScript + Supabase app that turns real-life signals into calm daily guidance.

Those signals can include:

- calendar load and meeting density
- wearable recovery, sleep, and strain
- quick check-ins about mood, stress, and energy
- daily moves and kept promises
- planner activity and environment resets

The product interprets those signals into a daily state read such as:

- what matters most today
- what needs protection
- whether this is a stretch day, recovery day, or protection day
- what your main quest is
- what one support move would help most

## The Core Philosophy

The Dashboard is built around a simple idea:

You cannot control everything, but you can learn to respond well to what is actually yours.

The current product language centers on:

- `Today's Covenant`: the day begins with identity and remembered faithfulness before tasks
- `Lifetime Evidence`: kept promises and evidence of grace accumulate into a record the user can carry for years
- `Life perspective`: onboarding uses age and season-of-life framing to make the app feel personal from the start
- `Starter team`: the 5 Controllables are presented as a team you can lean on
- `Moves`: daily actions are framed as meaningful moves, not chores
- `Charge`: the product uses grounded energy language instead of pressure-heavy productivity language
- `Evolution`: progress supports repair, return, and recovery, not only perfect consistency
- `Regions / chapter quests`: progression is meaningful without becoming childish or fantasy-heavy
- `Drift and alignment`: the app tracks how close lived life is to what matters most right now

## The 5 Controllables

The Dashboard treats the 5 Controllables like a starter team:

- `Awareness = scout`
  Helps the user check in with God, tell the truth, surrender what they cannot control, and notice what is happening internally before reaction takes over.
- `Perspective = translator`
  Helps the user zoom out, reframe wisely, and remember that one hard moment is not the whole story.
- `Habit = builder`
  Helps the user turn intention into one concrete rep.
- `Wellness = charger`
  Helps the user pay attention to recovery, sleep, stress, movement, and energy.
- `Environment = protector`
  Helps the user reduce friction and shape the world around them so the next right move is easier.

## Who This Can Help

The Dashboard is especially useful for people who:

- feel scattered by the amount of life they are carrying
- want a daily operating system that feels emotionally intelligent
- need help re-entering after drift, burnout, or inconsistency
- want faith, reflection, planning, and recovery to live in one place
- are tired of all-or-nothing self-improvement tools

It can also be forked into products for:

- coaching
- founder life management
- wellness / readiness
- Christian reflection and spiritual grounding
- reflective planning
- behavior change without shame-heavy gamification

## What Using The Dashboard Feels Like

If the product is working well, the user should feel:

- calmer, because the app narrows the day down instead of exploding it
- more honest, because it makes room for reality instead of performance
- more supported, because return and repair count
- more grounded, because the app reacts to signals instead of pretending every day is the same

This is not a dopamine trap. It is meant to feel premium, useful, and steady.

## A Typical Daily Flow

For a user, the app usually works like this:

1. Open the home dashboard.
2. Remember the Covenant:
   see the promises already kept and the person daily faithfulness is forming.
3. See the daily read:
   what kind of day it is, what matters most, what needs protecting.
4. Keep today's Covenant or choose one main quest.
5. Complete one or more daily moves with the starter team.
6. Use planner, wellness, money, or reflection surfaces as needed.
7. Return later for re-alignment rather than perfection.

## Main Product Surfaces

The app already contains a broad set of “life portal” surfaces. Depending on your fork and environment, these can include:

- `Home dashboard`
  Identity-first Covenant evidence, daily game-state read, main quest, support move, drift/alignment, and return-from-drift support.
- `75-Day Covenant`
  A focused Christian challenge built around Jesus first, Scripture, sobriety, physical training, nutrition, hydration, and service.
- `Evidence`
  Lifetime totals for faithful actions plus a grace-centered archive of answered prayer, shaping Scripture, milestones, testimonies, and people impacted.
- `Onboarding`
  Life perspective, season-of-life framing, starter team reveal, and chapter recommendation.
- `Planner`
  Time blocks, tasks, routines, and calendar-aware planning.
- `Reflect`
  Notes, reflections, captured context, and longer-term memory.
- `Wellness`
  Recovery, sleep, health sync, and body-aware guidance.
- `Money`
  Bills, subscriptions, budgets, goals, and weekly financial resets.
- `Operator / AI guidance`
  Structured guidance and assistant behavior built around the Controllables.
- `Regions / chapter quests`
  Lightweight progression and weekly focus loops.

## If You Are New Here

Use this checklist to get oriented quickly.

### As a user or product reviewer

Start with:

- the onboarding flow
- the home dashboard
- daily moves
- planner
- one recovery or return-to-drift path

That gives the clearest feel for the product.

### As a developer or builder

Start with:

- `src/pages/Home.tsx`
- `src/components/dashboard`
- `src/components/onboarding`
- `src/hooks`
- `src/lib`
- `supabase/functions`
- `supabase/migrations`

Those folders explain most of the product quickly.

## Quick Start For Local Development

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/thecontrollables.git
cd thecontrollables
```

### 2. Install dependencies

`npm` is the safest default for this repo:

```bash
npm install
```

### 3. Add frontend environment variables

Create `.env.local` or `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id

# Optional telemetry
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=
VITE_ENABLE_SUPABASE_ANALYTICS=false
```

Minimum required for the frontend to boot:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### 4. Run the app

```bash
npm run dev
```

### 5. Build for sanity check

```bash
npm run build
```

## My Controllables Local QA

`/my-controllables` lives inside the authenticated Life OS shell. Production auth behavior is unchanged: unauthenticated users are redirected to `/auth`.

For local PR review without a Supabase test login, start Vite with the dev-only mock auth flag:

```bash
VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 5174
```

Then open:

```text
http://127.0.0.1:5174/my-controllables
```

Expected review signals:

- A visible amber banner says `Dev QA mock auth active`; this banner only appears when `import.meta.env.DEV` and `VITE_ENABLE_DEV_MOCK_AUTH=true` are both true.
- The My Controllables page renders without a real Supabase session.
- The 60-Second Starting Read saves a private local profile.
- Daily Training lets the reviewer log one kept promise; the same date cannot be logged twice.
- Proof Cards unlock from safe milestone fields only.
- Local Opt-In defaults to `Private`; city/state contribution does not count on boards until visibility is changed to `Anonymous` or `Public handle`.
- Anonymous participation counts local contribution without exposing city, state, or handle in share text.
- Share cards never include private reflections, wellness, money, calendar, journal, or AI guidance.

Useful entry routes for review:

- `/my-controllables`: full profile, Starting Read, daily training, proof cards, local boards, and local challenges.
- `/home`: daily dashboard entry card for My Controllables.
- `/train`: Chapter 2 entry point and Starting Read CTA.
- `/proof`: proof surface entry point and local proof summary.

## Running Supabase

You can point the frontend at a hosted Supabase project, or run Supabase locally.

### Local workflow

If you have the Supabase CLI installed:

```bash
supabase start
supabase db reset
supabase functions serve
```

This is the best option if you want to work on schema or edge functions.

### Fully Charged 75-day QA

The Fully Charged V1 journey uses a fixed IANA timezone, 75 canonical local days, five server-derived circuits per day, and explicit server closeout. An incomplete or unclosed day ends the attempt; Begin Again creates a linked attempt without deleting history. V1 has no offline grace, so every strict write must be server-confirmed before the local-day boundary.

The complete draft copy ledger is in [`docs/christian-formation/fully-charged-75-day-recap.md`](docs/christian-formation/fully-charged-75-day-recap.md). Authenticated starts intentionally fail until every day has a published, effective version approved by a reviewer other than its author.

```bash
npm run test:unit -- tests/unit/fully-charged-journey.test.ts tests/unit/fully-charged-migration.test.ts
npm run test:e2e:formation
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/database/fully-charged-75-simulation.sql
```

The database simulation is transaction-wrapped and ends in `ROLLBACK`; it does not retain synthetic users, days, circuits, or completion records.

### Security-sensitive server boundaries

- Circle previews and joins use the authenticated `lookup_challenge_by_invite_code` and `join_challenge_by_invite_code` RPCs. Do not restore a table-wide `invite_code IS NOT NULL` SELECT policy; it exposes every invite-coded challenge to every signed-in user.
- `send-daily-nudge` keeps gateway JWT verification disabled so the trusted scheduler can use the service-role token, but its handler authorizes every non-OPTIONS invocation. Only a service-role bearer token or an authenticated user with the `admin` role may start a run.

### Fully Charged landing, SEO, and sharing assets

The public landing roadmap reads directly from `src/domain/formation/fullyChargedJourney.ts`, so its 75 day titles, references, invitations, reflections, and service prompts stay synchronized with the governed product source. `src/components/landing/FullyCharged75Roadmap.tsx` owns the expandable public presentation.

SEO and share discovery are defined in `index.html`, `public/manifest.webmanifest`, `public/robots.txt`, and `public/sitemap.xml`. The project-owned social card can be regenerated after visual/copy changes:

```bash
npm run render:social
npm run test:unit -- tests/unit/landing-page.test.ts tests/unit/landing-seo.test.ts
npm run test:e2e:entry
```

The rendered Open Graph/Twitter asset is `public/og-image-fully-charged-75-v1.png` at exactly 1200×630. Both networks use the same canonical HTTPS URL so the preview cannot drift between platforms.

## Onboarding Relaunch Reset

The June 18, 2026 Controllables relaunch intentionally sends users through the new first-run experience again.

- Frontend reset gate: `src/lib/onboardingReset.ts`
- Local draft version: `src/lib/onboardingQuickStartDraft.ts`
- Database reset migration: `supabase/migrations/20260618124500_reset_onboarding_for_controllables_relaunch.sql`

The reset only touches `user_onboarding` state and stale local quick-start drafts. It does not delete accounts, mission history, XP, Dex proof, journals, wellness, money, calendar data, AI memories, badges, certificates, or private reflections.

## Server-Side Secrets

Several app capabilities depend on Supabase Edge Functions and server-side secrets.

These are configured in Supabase, not in the Vite `.env` file.

Common secrets used in this repo:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `WHOOP_CLIENT_ID`
- `WHOOP_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PLUS`
- `STRIPE_PRICE_ID_PRO`

You do not need every integration configured to run the app locally.

### Useful defaults

- no wearable secrets: the app still works, but without wearable sync
- no Google secrets: planner and integration OAuth flows are limited
- no `LOVABLE_API_KEY`: AI-powered functions degrade or stop working
- no `RESEND_API_KEY`: email flows will not send
- no Stripe secrets: billing flows will not work

## How The Dashboard Can Help A Real User

The easiest way to explain the product is:

The Dashboard helps a person stop asking, “How do I get everything together?” and start asking, “What kind of day is this, what matters most, and what is one honest move I can make from here?”

Practically, that means the app can help a user:

- notice overload before the day collapses
- protect recovery on hard days
- choose a smaller, keepable promise
- see drift early and re-align without shame
- use planning and reflection together instead of separately
- bring spiritual grounding into daily self-leadership

## How To Explore The Product In The Right Order

If you want to understand the experience the way a user would, follow this order:

1. `Onboarding`
   Learn the life perspective, current season, and starter team framing.
2. `Home`
   See how the product reads the day and narrows it down.
3. `Daily moves`
   Understand the Controllables as lived behavior.
4. `Return from drift`
   This is one of the most important trust-building loops in the product.
5. `Planner`
   See how the app moves from reflection into execution.
6. `Wellness / Money / Vault`
   These expand the app into a fuller life portal.

## How To Fork And Make It Your Own

You do not need a backend rewrite to customize The Dashboard.

Most forks should begin with:

- product language
- interpretation rules
- onboarding framing
- AI voice
- which modules are emphasized

### Best low-risk customization points

#### 1. Product language and framing

Good files to start with:

- `src/pages/Home.tsx`
- `src/pages/QuickStart.tsx`
- `src/components/dashboard`
- `src/components/onboarding`
- `src/lib/awarenessLanguage.ts`
- `src/lib/controllableRoster.ts`

#### 2. Daily signal interpretation

If you want the app to react differently to stress, recovery, energy, or calendar load:

- `src/lib/signalInterpreter.ts`
- `src/hooks/useGameSignals.ts`
- `src/lib/driftAlignment.ts`
- `src/hooks/useDriftAlignment.ts`

This is one of the best places to customize the product without destabilizing the data model.

#### 3. Onboarding and life-season framing

If you want different identity, age, season, or worldview framing:

- `src/lib/lifePerspective.ts`
- `src/components/onboarding`
- `src/pages/QuickStart.tsx`

#### 4. Team / move system

If you want different team roles, move semantics, or progression tone:

- `src/hooks/useDailyRings.ts`
- `src/components/dashboard/DailyRings.tsx`
- `src/components/dashboard/RingActionCard.tsx`
- `src/components/dashboard/ControllableHub.tsx`
- `src/components/dashboard/ControllableLevelsCard.tsx`

#### 5. AI behavior

If you want to adjust the assistant’s voice or product theology/philosophy:

- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/ai-chat/controllables-knowledge.ts`
- `supabase/functions/ai-reflect/index.ts`
- `supabase/functions/daily-os-plan/index.ts`
- `supabase/functions/operator-console/index.ts`

### Fork strategies that fit this repo well

This codebase is a good fit if you want to build:

- a founder dashboard
- a Christian daily alignment app
- a reflective coaching portal
- a wellness-aware planner
- a calmer habit and recovery app
- a family or household dashboard
- a life admin operating system

## Repository Map

If you are scanning the codebase for the first time:

- `src/pages`
  Top-level routes such as home, planner, wellness, money, onboarding, and auth.
- `src/components/dashboard`
  Most of the product personality lives here.
- `src/components/onboarding`
  Entry experience and framing logic.
- `src/hooks`
  Data access, interpretation hooks, and UI orchestration hooks.
- `src/lib`
  Shared product rules, adapters, language helpers, and derived logic.
- `supabase/migrations`
  Database schema history.
- `supabase/functions`
  AI, integrations, sync, email, push, and server-side orchestration.

## Design Guardrails For Contributors

This repo works best when contributors keep a few product rules intact:

- do not make the app feel childish
- do not turn it into a dopamine trap
- do not add more cards if an existing one can be repurposed
- prefer adapter layers over backend rewrites
- keep the tone calm, emotionally useful, and premium
- let repair and re-entry count just as much as forward momentum

## Contributing

Issues and pull requests are welcome.

If you open a PR, it helps to say whether you are changing:

- product language
- onboarding
- dashboard behavior
- AI behavior
- signal interpretation
- Supabase schema
- integrations

That makes review easier because this app blends UX, product semantics, and backend behavior tightly.

## Licensing

If you want others to reuse this repo clearly, add a root `LICENSE` file.

A public repository without a license is visible, but reuse rights are not automatically clear.
