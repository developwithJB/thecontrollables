# The Dashboard — v1.7.0

**Your Life OS. Planner. Money. Wellness. Growth.**

🌐 [thecontrollables.lovable.app](https://thecontrollables.lovable.app)

---

## What Is The Dashboard?

The Dashboard is a mobile-first Progressive Web App (PWA) that brings your entire life into one calm interface. It's not just a habit tracker or a todo app — it's a **Life Operating System** that connects your calendar, finances, wellness, and personal growth.

Built around **The Controllables** philosophy (from the book), everything centers on what you can actually control:

| Emoji | Controllable | Focus |
|-------|-------------|-------|
| 🦉 | **Awareness** | Noticing patterns, triggers, and emotional states |
| 🐢 | **Perspective** | How you frame situations and talk to yourself |
| 🦈 | **Habit** | The routines and micro-behaviors you repeat |
| 🛰️ | **Wellness** | Sleep, movement, and nutrition |
| 🚀 | **Environment** | The spaces, people, and inputs around you |

---

## Core Modules

### 📅 Planner

Your daily command center for tasks, events, and routines.

- **Daily & weekly views** with drag-to-reorder
- **Time blocks** with start/end times
- **Routines** that auto-populate daily
- **Google Calendar sync** — bidirectional read/write
- **Todoist import** — pull tasks into your planner
- **Energy-level tagging** for tasks
- **Promise linking** — connect tasks to your integrity commitments

### 💰 Money Hub

Financial awareness without the shame.

- **Accounts** — checking, savings, credit, cash, investments
- **Transactions** — manual entry or CSV import from any bank
- **Budget buckets** — monthly targets by category with spend tracking
- **Bills & subscriptions** — see what's due and when
- **Savings goals** — track progress toward targets
- **Financial Controllables** — actionable insights like "3 bills due this week"

### 🔌 Integration Hub

Connect the tools you already use.

| Provider | Capability |
|----------|-----------|
| **Google Calendar** | Read/write events and time blocks to your Planner |
| **Gmail** | Read-only daily inbox summary (unread, starred, needs-reply) for Daily OS |
| **Todoist** | Import active tasks into Planner |
| **Notion** | Export weekly reviews and Vault entries to a chosen database |

All OAuth tokens stored securely server-side. Provider failures never break dashboard load.

### 📸 Snapshots

7-day themed focus periods — the heart of personal growth.

- **36 Snapshots** across 6 buckets (Reset, Momentum, Clarity, Energy, Integrity, Growth)
- **Goal-based browsing** — "Stop vaping," "Sleep better," "Rebuild confidence"
- **Custom Snapshots** — create your own with Premium
- **Day-relative timing** — start any day, end 7 days later
- **Certificates** — downloadable proof of completion

### 🧠 Daily OS

Your prioritized starting point each morning.

- **Today's Actions** — primary task highlighted, secondary marked optional
- **Daily Briefing** — AI-generated context for your day
- **Gmail Summary** — unread, starred, needs-reply (if connected)
- **Time Currency** — log invested vs. wasted minutes
- **Integrity Meter** — your promise-keeping rate

### ❤️ Brain & Body Tracker

Wellness as a controllable, not a chore.

- **Sleep, movement, nutrition ratings** — simple 1-5 scales
- **Apple Health / Google Fit import** — sync steps, sleep, heart rate
- **Weekly patterns** — see which days you thrive
- **Streak tracking** — optional, never punishing

### 🎯 Build Assessment

Know where you stand across all 5 Controllables.

- **20 questions** scored 1-5
- **13 archetypes** describe your current Build (Stable, Burnout Risk, Low Battery, etc.)
- **Radar visualization** of your scores
- **Periodic retakes** to track growth over time

### 🤖 AI Guides

Contextual assistance grounded in The Controllables framework.

- **5 distinct voices** — one for each Controllable
- **Context-aware** — knows your Snapshot, Build, recent activity
- **Human-centric tone** — helpful, not robotic
- **5 messages/day** during trial, 25 with Premium

---

## The Philosophy

### Hierarchy

```
Mission (Direction)      — Your north star. Not a deadline, just a heading.
  └─ Snapshot (Weekly)   — A 7-day themed focus period.
       └─ Daily Check-In — Today's single set of actions.
```

### Core Principles

- **Data, Not Failure** — Missed days are never highlighted. Every Snapshot is recorded as proof you started.
- **Today Only** — No catching up. Yesterday is data. Tomorrow doesn't exist yet.
- **Direction, Not Tasks** — Your Mission is a heading, not a checklist.
- **Human-Centric Language** — No "AI vibes." The Dashboard notices patterns, not "adaptive intelligence."

---

## 7-Day Free Trial

New users get **full access to every feature** during their first Snapshot — no credit card required.

| Feature | Free | Trial | Premium |
|---------|------|-------|---------|
| Planner | ✅ | ✅ | ✅ |
| Money Hub | ✅ | ✅ | ✅ |
| Integration Hub | ✅ | ✅ | ✅ |
| Build Assessment | ✅ | ✅ | ✅ |
| Daily OS | ✅ | ✅ | ✅ |
| Time Currency | ✅ | ✅ | ✅ |
| Integrity Meter | ✅ | ✅ | ✅ |
| Snapshots Available | 1 | All 36 | All 36 + Custom |
| Experience History | — | ✅ | ✅ |
| AI Guides | — | 5 msgs/day | 25 msgs/day |
| Certificates | — | ✅ | ✅ |
| Daily Alignment Emails | — | — | ✅ |

**Pricing:** $9.99/mo or $79.99/yr (saves ~33%)

---

## Daily Alignment (Premium)

A personalized morning email at **6:00 AM your local time**:

- **Scripture** — themed to your lowest Controllable or Mission
- **Growth Reflection** — AI-generated from your Snapshot progress
- **Guided Question** — thought prompt for the day
- **Micro Action** — one concrete step
- **Evening Prompt** — brief reflection to close your day

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Lovable Cloud (Postgres, Auth, Edge Functions) |
| PWA | Service worker, offline support, installable |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `ai-chat` | Controllables-aware AI guidance |
| `ai-briefing` | Daily OS briefing generation |
| `ai-meal-plan` / `ai-meal-analyze` | Nutrition planning |
| `ai-grocery-list` | Shopping list generation |
| `ai-reflect` | Guided reflection prompts |
| `daily-os-plan` | Daily action prioritization |
| `dashboard-summary` | Aggregated dashboard data |
| `integration-oauth-start/callback` | OAuth flows for all providers |
| `integration-sync` | Provider-specific sync logic |
| `integration-disconnect` | Token revocation |
| `generate-certificate` | Snapshot completion certificates |
| `generate-insights` | AI behavioral insights |
| `send-daily-nudge` | Email reminders |
| `create-checkout` / `check-payment` / `customer-portal` | Stripe integration |
| `admin-*` | Admin analytics and management |

### Key Data Tables

| Table | Purpose |
|-------|---------|
| `planner_items` | Tasks, events, routines |
| `planner_routines` | Recurring task definitions |
| `planner_connections` | Calendar OAuth tokens |
| `financial_accounts` | Bank/cash accounts |
| `transactions` | Financial transactions |
| `budget_buckets` | Budget categories |
| `recurring_bills` / `subscriptions` | Bills and subscriptions |
| `savings_goals` | Savings targets |
| `integration_connections` | OAuth for all providers |
| `integration_sync_logs` | Sync history |
| `reset_sessions` | Active Snapshots |
| `daily_resets` | Daily check-ins |
| `wellness_logs` | Sleep, movement, nutrition |
| `health_sync_data` | Imported wearable data |
| `build_assessments` / `build_scores` | Assessment data |
| `integrity_logs` | Promise tracking |
| `time_logs` | Invested vs. wasted time |
| `daily_os_plans` | AI-generated daily plans |
| `daily_briefings` | Daily briefing content |

---

## Admin Command Center

10-tab intelligence system for monitoring and managing the app:

| Tab | Purpose |
|-----|---------|
| **Overview** | DAU/WAU/MAU, activation, conversion, churn, MRR |
| **Funnel** | Activation funnel with drop-off analysis |
| **Behavior** | Usage patterns and activity heatmaps |
| **Retention** | Risk-tier scoring per user |
| **Revenue** | Cohort analysis, MRR tracking |
| **Insights** | AI-generated behavioral insights |
| **Health** | Error monitoring, page performance |
| **Nudges** | Email delivery monitoring |
| **Users** | User management with access controls |
| **Actions** | Campaigns, trial extensions, CSV export |

---

## Welcome Back Flow

If you've been away for **3+ days**, the app greets you shame-free:

1. **Welcome Screen** — *"Welcome back. You didn't lose anything."*
2. **Optional Focus Reset** — Continue or start fresh
3. **Dashboard Banner** — *"Coming back counts."*

Missed days are never counted or highlighted.

---

## Philosophy in Action

The Dashboard embodies **The Controllables** book philosophy:

- Focus on what you can control
- Small, imperfect action beats grand plans
- Self-trust is rebuilt through kept promises
- Direction matters more than deadlines
- Today is the only day that matters

---

*Built with [Lovable](https://lovable.dev)*
