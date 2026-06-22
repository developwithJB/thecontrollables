# The Controllables Dashboard

## Product Story

The Controllables Dashboard turns *The Controllables* from something people read into something they practice every day.

The book gives people the language: Awareness, Perspective, Habit, Wellness, Environment, and Ego. The app gives them the reps: daily missions, small promises, private proof, reflection, and recovery.

It is not another noisy productivity app. It is a calm self-trust training system for people who want to stop trying to control everything and start practicing what they actually can control.

## Customer Promise

For people who feel scattered, overwhelmed, or stuck trying to control too much, The Dashboard gives them a simple daily training loop:

**Read yourself honestly. Choose what you can control. Keep one small promise. Collect proof. Build Self-Trust.**

Every day, the user gets one honest read, one mission, one promise, and one chance to prove they are becoming who they said they wanted to be.

## Core Product Loop

The app is organized around one repeatable loop:

**Read -> Choose -> Promise -> Prove -> Reflect -> Repeat**

- **Read**: Starting Charge, Today's Read, Ego Signal
- **Choose**: Control / Release / Move
- **Promise**: Daily Mission Drop, Promise Ledger
- **Prove**: Proof Loop, photo proof, Controllables Dex
- **Reflect**: Read Along Training, recovery wins, Self-Trust progress
- **Repeat**: XP, levels, badges, streaks, reset paths, share-safe milestones

The magic moment is when a user completes a mission, keeps a small promise, adds private proof, and sees evidence that their Self-Trust is growing.

## First-Session Happy Path

The biggest product risk is not missing features. It is letting a new user wander before they feel the loop.

The first session should make this path obvious:

1. Take Starting Charge.
2. Get your first Controllable focus.
3. Do one Daily Charge.
4. Keep one tiny promise.
5. Add proof.
6. See Self-Trust move.

New users should not be pushed into wellness, planner, wealth, admin, integrations, or advanced AI before they understand this core loop.

## How It Works In 5 Minutes A Day

1. **Get your read**
   See where your head, habits, and energy are today.
2. **Choose your Controllable**
   Pick what you can actually control.
3. **Keep one promise**
   Do one small mission that builds trust with yourself.
4. **Add private proof**
   Capture the rep without exposing your private life.
5. **Build your Dex**
   Watch your real-life reps stack up over time.

## Advertise-Ready Flows

### 1. Starting Charge

A 60-second onboarding read that helps users understand where they are starting and what kind of training they need.

### 2. Read Along Training

A spoiler-safe companion path for people reading, rereading, or leading others through *The Controllables*. Each section turns book concepts into simple reps.

### 3. Daily Charge

The daily Control / Release / Move ritual. Users identify what they can control, release what they cannot, and choose one grounded action.

### 4. Promise Ledger

A private Self-Trust tracker built around kept promises, recovery wins, and honest resets.

### 5. Proof Loop

The Controllables Dex, where users collect private proof of real-life reps across Awareness, Perspective, Habit, Wellness, and Environment.

## Best-Fit Users

The current product is strongest for:

- Readers of *The Controllables*
- People in a reset season
- Overthinkers who need action, not more noise
- Builders, athletes, and young professionals rebuilding consistency
- Faith-anchored users who want a practical control/release rhythm
- People who want private growth before public accountability

## Current User Surfaces

- `/` Landing page and product story
- `/quick-start` Starting Charge onboarding
- `/home` Daily Charge, Today's Read, Ego Signal, Control / Release / Move, Mission Drop
- `/read-along` book companion training
- `/train` Controllable card deck and XP training
- `/my-controllables` private profile, Self-Trust, Promise Ledger, current focus
- `/proof` proof loop entry
- `/proof/dex` The Controllables Dex
- `/reset` 7-Day Reset
- `/wellness`, `/planner`, `/growth`, `/reflect`, `/wealth` supporting Life OS areas
- `/billing`, `/admin`, `/integrations` operational surfaces

## Current Feature Set

The current app supports:

- Book-aligned onboarding
- Reading status and spoiler-safe Read Along sections
- Daily Control / Release / Move ritual
- Mission Drops with core, bonus, recovery, and optional local missions
- City/state-level local missions without exact location tracking
- Controllable cards with XP, levels, rarity, stats, charge stages, and safe share copy
- Promise Ledger for kept promises and recovery wins
- Self-Trust level and progress
- Manual photo proof after mission completion
- Controllables Dex grouped by Controllable
- Share-safe proof payloads
- Wellness, planner, money/wealth, reset, certificates, badges, and admin tooling
- PWA support, install nudges, offline indicator, pull-to-refresh, and dark-first UI

## Privacy Model

Private growth is the default.

Share cards and proof payloads exclude exact location, EXIF data, private reflections, wellness details, money details, calendar data, journal content, AI guidance, captions, and custom promises unless the user explicitly opts in.

City/state only appears when the user enables it. Local participation can remain private, anonymous, or public.

## Technical Snapshot

The frontend is a React 18, Vite, and TypeScript app using React Router, TanStack Query, Tailwind, shadcn/Radix primitives, Framer Motion, lucide icons, Recharts, and `html2canvas` for share card/image generation.

The backend is powered by Supabase:

- Supabase Auth
- Postgres tables
- Row Level Security
- Edge Functions
- Supabase Storage
- Stripe infrastructure
- AI, integrations, notifications, certificates, admin, and sync jobs

Production-backed data exists across profiles, onboarding, reset sessions, daily resets, completed actions, XP logs, badges, certificates, planner items, wellness logs, meal plans, transactions, recurring bills, AI memory/consent/usage, entitlements, Stripe webhooks, wearable connections, and WHOOP data.

## Local-First V1 Areas

The newest book-aligned product loop is intentionally local-first to validate behavior before adding heavier backend tables:

- Read Along progress
- My Controllables profile
- Promise Ledger
- Controllables Dex proof entries
- Local Mission preferences and completion state
- Control / Release / Move daily draft

## AI Capabilities

Current AI surfaces include daily briefing, AI chat/guide, reflection, insights, predictions, dashboard intelligence, weekly review, meal planning, grocery help, operator console, memory updates, and AI action proposals.

AI is governed by consent, entitlement, usage, and memory-related tables/functions.

## Payments

Stripe infrastructure exists for checkout, payment checks, customer portal, webhooks, entitlements, plan tiers, and AI limits.

The app is ready to gate features or sell digital products, but an in-app ebook purchase still needs a dedicated product/payment flow and a secure PDF delivery decision.

## What It Is Not Yet

The app is not yet a full social network, maps/event discovery product, photo-library scanner, or public leaderboard system.

The current Controllables/Dex/local mission layer is a lightweight v1 designed to validate the product loop before backend expansion.

## Positioning Summary

**Now:** A book-connected Self-Trust training app for readers of *The Controllables*.

**Next:** A daily operating system for practicing control, release, and aligned action.

**Later:** A full Life OS across wellness, planning, reflection, growth, money, faith, and community.
