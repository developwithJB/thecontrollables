# The Dashboard

The Dashboard is an open-source React + TypeScript app for people who want a calmer, more reflective way to run their days.

Instead of treating life like a productivity contest, it turns real signals, like your calendar load, recovery, sleep, and simple check-ins, into a grounded daily read:

- what kind of day this is
- what matters most
- what to protect
- one main quest
- one support move

The product is built around the 5 Controllables as your starter team:

- Awareness: scout
- Perspective: translator
- Habit: builder
- Wellness: charger
- Environment: protector

## What This App Can Help With

The Dashboard is designed to help users:

- understand their current state without spiraling or over-planning
- pick the next right move instead of juggling ten priorities
- notice when the day calls for recovery, protection, or stretch
- build personal momentum through reflection, repair, and re-entry
- connect planning, wellness, money, and life context in one place

This repo is useful if you want to build:

- a personal life dashboard
- a coaching product
- a wellness or readiness app
- a reflective planner
- a calmer alternative to streak-heavy habit apps

## Core Product Ideas

The current app centers around a few ideas:

- Life perspective: onboarding uses age and season-of-life context to frame the experience
- Starter team: the 5 Controllables act like a roster the user can lean on
- Daily moves: daily actions are framed as moves rather than chores
- Charge: progress is built around being undercharged, stable, strong, charged, or fully charged
- Evolution: progress supports repair and recovery, not just perfect consistency
- Regions and chapter quests: users move through meaningful periods without changing the underlying snapshot data model

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI + shadcn/ui patterns
- TanStack Query
- Supabase Auth, Postgres, and Edge Functions
- Optional PostHog + Sentry telemetry

## Repository Structure

High-signal areas if you are exploring the codebase for the first time:

- `src/pages` - top-level routes like home, planner, wellness, money, auth, and onboarding entry points
- `src/components/dashboard` - the home dashboard surfaces, guidance cards, progression UI, and daily-state modules
- `src/components/onboarding` - onboarding flow steps and account handoff behavior
- `src/hooks` - data access and domain hooks for signals, progress, planner, health, and onboarding state
- `src/lib` - app logic, adapters, interpretation rules, and shared product-language helpers
- `supabase/migrations` - schema history
- `supabase/functions` - edge functions for AI, integrations, sync, and server-side workflows

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/thecontrollables.git
cd thecontrollables
```

### 2. Install dependencies

This repo includes both `package-lock.json` and Bun locks. `npm` is the safest default:

```bash
npm install
```

### 3. Add environment variables

Create a local env file such as `.env.local` or update your local `.env` with the public client variables the app expects:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_or_publishable_key
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id

# Optional telemetry
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=
VITE_ENABLE_SUPABASE_ANALYTICS=false
```

Notes:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are required for the app to boot
- some integrations and edge functions will also require provider secrets configured in Supabase, not in the Vite env file
- avoid committing your real local env values

### 4. Run the app

```bash
npm run dev
```

### 5. Optional: run Supabase locally

If you want a fully local backend workflow, install the Supabase CLI and run:

```bash
supabase start
supabase db reset
supabase functions serve
```

You can also point the frontend at a hosted Supabase project if that is simpler for your fork.

## How To Fork And Customize

You do not need to rewrite the backend to make this your own. Most product changes can happen cleanly in the frontend through copy, adapters, and interpretation rules.

### Customize the product language

Start here if you want to re-theme the experience without changing the data model:

- `src/components/dashboard/*`
- `src/components/onboarding/*`
- `src/pages/Home.tsx`
- `src/pages/QuickStart.tsx`

### Customize life perspective and season logic

If you want a different framing for age, life week, or season-of-life logic:

- `src/lib/lifePerspective.ts`

### Customize the starter team

If you want different roles, descriptions, or presentation for the 5 Controllables:

- `src/lib/controllableRoster.ts`
- `src/components/dashboard/ControllableHub.tsx`
- `src/components/dashboard/ControllableLevelsCard.tsx`
- `src/components/dashboard/ControllableLevelBadge.tsx`

### Customize daily interpretation rules

If you want the app to react differently to recovery, workload, stress, or energy:

- `src/lib/signalInterpreter.ts`
- `src/hooks/useGameSignals.ts`

This is one of the best extension points in the whole app because it changes the feel of the product without forcing schema rewrites.

### Customize progression and chapter framing

If you want different region, chapter quest, or progression language while keeping existing snapshot records:

- `src/components/dashboard/SnapshotSelector.tsx`
- `src/components/dashboard/StartSnapshotDialog.tsx`
- `src/components/dashboard/SnapshotHistory.tsx`
- `src/components/dashboard/SnapshotReviewCard.tsx`
- `src/components/dashboard/WeeklyPulseScreen.tsx`

### Customize backend workflows

If you want to extend the product beyond copy and UI:

- add or adjust tables through `supabase/migrations/*`
- edit edge functions in `supabase/functions/*`
- keep adapter layers where possible so the product can evolve without constantly renaming stored data

## Suggested Fork Directions

Some strong directions this codebase already supports well:

- a founder or executive dashboard
- a wellness-first daily check-in app
- a coaching product with guided reflection
- a planner that reacts to energy and recovery instead of fixed schedules
- a life admin app that combines planning, money, and reflective review

## Contributing

Issues and pull requests are welcome. If you open a PR, it helps to be explicit about whether you are changing:

- product language
- dashboard behavior
- onboarding logic
- interpretation rules
- Supabase schema
- provider integrations

That keeps review easier because this app blends UX, product semantics, and backend workflows closely.

## Practical Note

If you are making this repo public for outside reuse, add a `LICENSE` file at the repository root. A public GitHub repo without a license is visible, but it is not clearly reusable.
