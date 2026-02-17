# The Controllables — v1.4.1

**A shame-free personal accountability system built around what you can control.**

🌐 [thecontrollables.lovable.app](https://thecontrollables.lovable.app)

---

## What Is The Controllables?

The Controllables is a mobile-first Progressive Web App (PWA) for personal growth and habit accountability. Instead of tracking goals with deadlines or streaks that punish missed days, it focuses entirely on **what you can control** — your daily choices.

Everything in the app is organized around five **Controllables**:

| Emoji | Controllable | Focus |
|-------|-------------|-------|
| 🦉 | **Awareness** | Noticing patterns, triggers, and emotional states |
| 🐢 | **Perspective** | How you frame situations and talk to yourself |
| 🦈 | **Habit** | The routines and micro-behaviors you repeat |
| 🛰️ | **Wellness** | Sleep, movement, and nutrition |
| 🚀 | **Environment** | The spaces, people, and inputs around you |

### The Hierarchy

The app follows a three-level philosophy:

```
Mission (Direction)      — Your north star. Not a deadline, just a heading.
  └─ Snapshot (Weekly)   — A 7-day themed focus period.
       └─ Daily Check-In — Today's single set of actions. That's it.
```

**Mission** is a persistent direction like "Build discipline" or "Reclaim energy." It never expires.
**Snapshots** give you a concrete weekly theme. **Daily Check-Ins** keep it to ~5 minutes a day.

---

## Getting Started

### 1. Sign Up

Create an account with your email. You'll verify your address before signing in.

### 2. Build Assessment

Answer **20 questions** across the 5 Controllables. Each question is scored 1–5, giving you a baseline picture of where you stand today.

### 3. Your Archetype

Based on your assessment, you receive one of **13 archetypes** that describe your current Build:

- Stable Build, Awareness Gap, Perspective Drift, Habit Stall, Wellness Debt, Environment Drag
- The Overthinker, Burnout Risk, Coasting, Survival Mode, Low Battery Mode, Lone Wolf, Fresh Start

Your archetype isn't a label — it's a starting point. It changes as you retake assessments.

### 4. Day 0 Orientation

Before your first Snapshot begins, you'll see an orientation that sets expectations:

- **"One Snapshot per week."** — A focused 7-day theme.
- **"About 5 minutes per day."** — Not a lifestyle overhaul.
- **"No catching up. Just today."** — Missed days are invisible. Only today matters.

### 5. Choose Your First Snapshot

Browse the Snapshot library and pick a theme that resonates. Then set your **Mission** — a direction, not a task.

---

## The Snapshot System

A **Snapshot** is a 7-day themed focus period. It starts on whatever day you begin (not a fixed Monday) and ends seven days later.

### 36 Snapshots Across 6 Buckets

| Bucket | Focus |
|--------|-------|
| **Reset & Re-Entry** | Coming back after a gap, rebuilding gently |
| **Momentum & Consistency** | Sustaining progress without pressure |
| **Clarity & Perspective** | Reframing, slowing down, noticing |
| **Energy & Care** | Sleep, movement, nutrition, recovery |
| **Integrity & Self-Trust** | Keeping promises to yourself |
| **Growth & Expansion** | Stretching into new territory |

### Browsing Modes

- **By Goal** — 16+ life intentions organized into three buckets:
  - *Break a Habit* (Stop vaping, Drink less, Reduce screen time, etc.)
  - *Shift Mindset* (👑 Always Get Better, Rebuild confidence, etc.)
  - *Build a Habit* (Move more, Sleep better, Eat cleaner, etc.)

- **By State** — Browse by the 6 framework-based Buckets above.

### Specialized Habit-Breaking Snapshots

Four Snapshots designed specifically for breaking habits:

1. **Replace the Trigger** — Swap the cue-response loop
2. **Delay the Impulse** — Build the pause between urge and action
3. **Environment Reset** — Remove friction for good choices, add it for bad ones
4. **Urge Surfing Week** — Ride the wave without acting

### Build Your Own

Premium users can create a **Custom Snapshot** with their own title, Controllable focus, and daily intentions.

---

## Daily Rituals

### Today's Actions Hub

The dashboard centers around **Today's Actions** — a prioritized list of your daily rituals.

- **Primary Action** — The single most important thing, highlighted at the top: *"If you do one thing today, do this."*
- **Secondary Actions** — Marked as optional. Complete what you can.

### The Core Rituals

| Ritual | What It Is |
|--------|-----------|
| **Snapshot Check-In** | Confirm you showed up for today's Snapshot theme |
| **Yesterday's Reflection** | A brief look back at the previous day |
| **Promise Review** | Did you keep the promise you made yesterday? |
| **New Promise** | Make one small promise for tomorrow |
| **Time Currency** | Log minutes invested (growth) vs. wasted (drift) |

### Integrity Meter

Tracks your **promise-keeping rate**. Every promise you make and keep (or break) is recorded. The meter reflects your self-trust over time — not as judgment, but as data.

### Completion Flow

When all daily actions are done:

> **"Day X done. Come back tomorrow."**

On Day 7, if all actions are complete, you unlock a **Snapshot celebration** — a milestone summary with a downloadable certificate.

---

## Daily Alignment (Premium)

A personalized morning email delivered at **6:00 AM your local time**, built from your real progress data.

Each Daily Alignment includes:

- **Scripture** — Themed to your lowest Controllable score or active Mission
- **Growth Reflection** — AI-generated insight based on your Snapshot progress and recent check-ins
- **Guided Question** — A thought prompt for the day
- **Micro Action** — One small, concrete step you can take today
- **Evening Prompt** — A brief reflection to close your day

Daily Alignment is powered by AI (Gemini 2.5 Flash) and personalized using your Build scores, Snapshot theme, and check-in history. Activate it from the Dashboard spotlight card or in Profile settings.

---

## Email Nudge System

The app sends daily reminder emails to keep you on track during active Snapshots.

### How It Works

- **Timing**: Emails are sent at **7:00 AM** in the user's local timezone
- **Content**: Day-specific context lines (Day 1 orientation, Day 4 normalization, Day 7 closure)
- **Deduplication**: Atomic insert pattern with a unique constraint on `(user_id, nudge_date)` — no duplicate emails ever
- **Suppression**: If your daily tasks are already complete, the nudge is marked `skipped` instead of sent
- **Re-engagement**: Users between Snapshots receive a *"Start your next Snapshot"* email instead of being ignored

### Nudge Statuses

| Status | Meaning |
|--------|---------|
| `sent` | Email delivered successfully |
| `skipped` | Suppressed (tasks already done or other criteria) |
| `failed` | Delivery error |

---

## Dashboard Modules

### Greeting Banner
Personalized greeting with your XP level and streak flames. Shows your current Snapshot name and day number.

### XP & Momentum
Track experience points earned from completing daily actions, check-ins, and promises kept. Momentum visualizes your consistency trend.

### Build Overview
Your 5 Controllable scores displayed as a radar/bar view with your current archetype. Retake the assessment periodically to see growth.

### Time Currency
A reflection module showing your invested vs. wasted time ratio. Not a productivity tracker — a self-awareness tool.

### Integrity Meter
Your promise-keeping percentage. Visual feedback on how often you follow through on what you tell yourself you'll do.

### Analytics Section
A collapsible section labeled *"When you want more insight"* containing deeper stats and patterns. Hidden by default to keep the daily view calm.

---

## Experience Tab (Premium)

The **Your Story** tab is where your history lives.

### Snapshot History
Every completed and ended Snapshot is recorded:
- ✅ Completed 7-day Snapshots show a 🏆 trophy badge and "Proof Recorded" label
- Incomplete Snapshots are still visible — they're data, not failure

### Activity Patterns
- **Weekly Pattern View** — Clickable day circles showing your activity distribution
- **Day Detail Drawer** — Tap any day to see exactly what you did

### Insights at a Glance
- Current streak and longest streak
- Best day of the week
- Trends and projections
- AI-generated behavioral insights that surface patterns you might not notice

### Certificates
Downloadable proof-of-completion for every finished Snapshot. Includes your display name, dates, XP earned, and badges.

---

## AI Guide

### Ask The Controllables

A built-in AI chat that understands your context:
- Your current Snapshot and day number
- Your Build Assessment scores
- Your recent activity and patterns

It provides guidance grounded in the Controllables framework — not generic advice. The tone is human, grounded, and non-preachy.

---

## Welcome Back Flow

If you've been away for **3 or more days**, the app greets you with a shame-free re-entry:

1. **Welcome Screen** — *"Welcome back. You didn't lose anything."*
2. **Optional Focus Reset** — Choose to continue your current Snapshot or start fresh
3. **Dashboard Banner** — A temporary *"Coming back counts."* message that disappears after your first action

The flow appears once per return gap. Missed days are never counted, highlighted, or mentioned elsewhere. Session transitions now properly refresh the dashboard — no more stale data after starting a new Snapshot.

---

## Free vs. Premium

| Feature | Free | Premium |
|---------|------|---------|
| Build Assessment | ✅ | ✅ |
| XP Tracking | ✅ | ✅ |
| Time Currency | ✅ | ✅ |
| Integrity Meter | ✅ | ✅ |
| Daily Check-Ins | ✅ | ✅ |
| Email Nudge Reminders | ✅ | ✅ |
| Snapshots Available | 1 | All 36 + Custom |
| Snapshot History | — | ✅ |
| Badges | — | ✅ |
| AI Guide | — | ✅ |
| Certificates | — | ✅ |
| Momentum Analytics | — | ✅ |
| Activity Patterns | — | ✅ |
| AI Insights | — | ✅ |
| Daily Alignment Emails | — | ✅ |

**Pricing:**
- Monthly: **$9.99/mo**
- Yearly: **$79.99/yr** (saves ~33%, equivalent to $6.67/mo)

---

## Technical Reference

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Lovable Cloud (Postgres, Auth, Edge Functions) |
| PWA | Service worker, offline support, installable, pull-to-refresh |

### Backend Functions

| Function | Purpose |
|----------|---------|
| `ai-chat` | Controllables-aware AI guidance |
| `create-checkout` | Stripe checkout session creation |
| `check-payment` | Payment verification and entitlement granting |
| `customer-portal` | Stripe billing portal access |
| `dashboard-summary` | Aggregated dashboard data |
| `generate-certificate` | Snapshot completion certificates |
| `generate-insights` | AI-powered behavioral insights |
| `generate-snapshot-insight` | Per-Snapshot AI analysis |
| `generate-calendar-reminder` | .ics file generation for daily reminders |
| `send-daily-nudge` | Daily reminder emails + re-engagement nudges for users between Snapshots |
| `admin-users` | Admin user management |
| `open-claw-marketing` | Open Claw growth bot for traffic, signups, and paid conversion campaigns |

### Key Data Tables

| Table | Purpose |
|-------|---------|
| `reset_sessions` | Active and historical Snapshot sessions |
| `daily_resets` | Daily check-in completions |
| `completed_actions` | Individual action completions with XP |
| `integrity_logs` | Promise tracking (made, kept, broken) |
| `time_logs` | Invested vs. wasted time entries |
| `build_assessments` / `build_scores` | Assessment responses and computed scores |
| `user_entitlements` | Free trial and premium access |
| `xp_logs` | XP earning history |
| `wellness_logs` | Sleep, movement, nutrition ratings |
| `main_quests` | Active Mission (Direction) |
| `email_nudge_logs` | Nudge delivery tracking (sent, skipped, failed) |
| `daily_alignment_logs` | Daily Alignment email content and delivery |
| `daily_scriptures` | Scripture rotation for Daily Alignment |

---

## Philosophy

### Data, Not Failure
Missed days are never highlighted, counted down, or turned into guilt. Every Snapshot — completed or not — is recorded as proof you started.

### Today Only
No catching up. No shifting goalposts. The only day that matters is today. Yesterday is data. Tomorrow doesn't exist yet.

### Direction, Not Tasks
Your Mission is a heading, not a checklist. There's no progress bar, no countdown, no deadline. You're pointed somewhere — that's enough.

### Human-Centric Language
The app avoids "AI vibes." Instead of *"Our adaptive intelligence analyzes your patterns,"* you'll see *"The Dashboard notices what works for you."* The guides are helpful tools, not impersonal smart systems.

---

*Built with [Lovable](https://lovable.dev)*
