

# Update README: The Controllables Ultimate User Guide

Replace the default Lovable boilerplate README with a comprehensive user guide that serves as the definitive reference for understanding The Controllables Dashboard.

## Structure

The new README.md will contain the following sections:

### 1. Hero Introduction
- App name, version (v1.4.0), tagline, and published URL (thecontrollables.lovable.app)
- One-line philosophy: "A shame-free personal accountability system built around what you can control."

### 2. What Is The Controllables?
- A mobile-first PWA for personal growth and habit accountability
- Explanation of the 5 Controllables framework: Awareness, Perspective, Habit, Wellness, Environment
- The core hierarchy: Mission (Direction) > Snapshot (Weekly Theme) > Daily Check-In (Today's Action)

### 3. Getting Started
- Sign up and complete the Build Assessment (20 questions across 5 Controllables)
- Receive your Archetype (one of 13 types like "Stable Build", "Low Battery Mode", etc.)
- Day 0 Orientation: establishes the cadence ("One Snapshot per week", "About 5 minutes per day", "No catching up. Just today.")
- Choose your first Snapshot and set your Mission (Direction)

### 4. The Snapshot System
- What a Snapshot is: a 7-day themed focus period relative to your start date
- 36 Snapshots across 6 Buckets: Reset & Re-Entry, Momentum & Consistency, Clarity & Perspective, Energy & Care, Integrity & Self-Trust, Growth & Expansion
- Two browsing modes: "By Goal" (16 life intentions like Stop vaping, Drink less, Move more) and "By State" (framework categories)
- 4 specialized habit-breaking Snapshots (Replace the Trigger, Delay the Impulse, Environment Reset, Urge Surfing Week)
- Custom "Build Your Own" Snapshot option

### 5. Daily Rituals
- The "Today's Actions" hub and the Primary Action anchor ("If you do one thing today, do this.")
- Daily Check-In flow: the core ritual
- Promise tracking and Integrity Meter
- Time Currency logging (invested vs. wasted time)
- "Day X done. Come back tomorrow." completion nudge
- Focus Card download for lock screens

### 6. Dashboard Modules
- Greeting Banner with XP level and streak flames
- XP & Momentum tracking
- Build Overview (your 5 Controllable scores and archetype)
- Time Currency reflection
- Integrity Meter (promise-keeping rate)
- Collapsible analytics section ("When you want more insight")

### 7. Experience Tab (Paid)
- Snapshot History with trophy badges for completed 7-day cycles
- Activity patterns and weekly pattern view with clickable day circles
- Insights at a Glance (streaks, best day, trends, projections)
- AI-generated behavioral insights
- Certificates for completed Snapshots

### 8. AI Guide
- "Ask The Controllables" chat powered by AI
- Context-aware guidance based on your current Snapshot, Build scores, and activity

### 9. Welcome Back Flow
- Triggers after 3+ days of inactivity
- Shame-free re-entry: "You didn't lose anything. Life happens."
- Optional focus reset and temporary dashboard banner

### 10. Free vs. Premium
- Free tier: One Snapshot, Build Assessment, XP tracking, Time Currency, Integrity Meter
- Premium ($9.99/mo or $79.99/yr): All 36 Snapshots, Snapshot History, Badges, AI Guide, Certificates, Momentum analytics

### 11. Technical Reference
- Stack: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- Backend: Lovable Cloud (Postgres, Auth, Edge Functions)
- PWA: Offline support, installable, service worker, pull-to-refresh
- 12 Edge Functions listed with purpose
- Key data tables overview

### 12. Philosophy
- "Data, not failure" -- missed days are never highlighted
- "Today only" -- no catching up, no shifting goalposts
- "Direction, not tasks" -- Mission is a north star, not a deadline
- Human-centric copy: "The Dashboard notices what works for you" over "AI-powered adaptive intelligence"

## File Changed

| File | Change |
|------|--------|
| `README.md` | Complete rewrite from boilerplate to comprehensive user guide |

