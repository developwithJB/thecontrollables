
# Connect Snapshots to Real-World Habits & Life Goals

## Overview
Transform the Snapshot browsing experience from abstract "Controllables" to relatable real-world habits and life changes people actually search for—like quitting vaping, reducing drinking, eating healthier, or managing spending. This creates an immediate "oh, this can help me with THAT" moment.

## The Problem Today
Current Snapshot browsing is organized by:
- Abstract buckets: "Reset & Re-Entry", "Momentum & Consistency"
- Internal states: "I fell off", "My head is loud"
- Framework language: "Controllables", "Awareness", "Habit"

While philosophically sound, this requires users to translate their real goals into the framework. A user thinking "I want to stop impulse buying" has to figure out that's a Habit + Environment issue.

## The Solution: Intent-Based Navigation
Add a layer that connects user intentions to the right Snapshots:

```
┌──────────────────────────────────────────────────────────┐
│ "What do you want to work on?"                           │
├──────────────────────────────────────────────────────────┤
│ 🚭 Stop vaping/smoking     🍷 Drink less                 │
│ 💸 Stop impulse spending   🍔 Eat healthier              │
│ 📱 Reduce screen time      🏃 Move more                  │
│ 😴 Sleep better            🧘 Reduce stress              │
│ ⏰ Stop procrastinating    💬 Better relationships       │
│ 🎯 Stay focused            🔄 Start fresh                │
└──────────────────────────────────────────────────────────┘
                              ↓
        Filtered Snapshots that address this goal
```

---

## Implementation Strategy

### 1. Create Goal-to-Snapshot Mappings
Map real-world habits to relevant Snapshots:

```typescript
interface LifeGoal {
  id: string;
  label: string;
  emoji: string;
  category: "break-habit" | "build-habit" | "mindset" | "wellness";
  relatedSnapshots: string[]; // Snapshot IDs
  tagline: string;
}

const LIFE_GOALS: LifeGoal[] = [
  {
    id: "stop-vaping",
    label: "Stop vaping/smoking",
    emoji: "🚭",
    category: "break-habit",
    relatedSnapshots: ["build-the-chain", "show-up-anyway", "one-day-at-time", "replace-the-trigger"],
    tagline: "Break the cycle, one day at a time"
  },
  {
    id: "drink-less",
    label: "Drink less alcohol",
    emoji: "🍷",
    category: "break-habit",
    relatedSnapshots: ["stabilize-basics", "replace-the-trigger", "back-to-zero", "protect-your-energy"],
    tagline: "Reclaim your evenings and energy"
  },
  {
    id: "stop-spending",
    label: "Stop impulse spending",
    emoji: "💸",
    category: "break-habit",
    relatedSnapshots: ["pause-before-reacting", "see-it-clearly", "word-equals-bond", "environment-reset"],
    tagline: "Build awareness before you buy"
  },
  {
    id: "eat-healthier",
    label: "Eat healthier",
    emoji: "🥗",
    category: "build-habit",
    relatedSnapshots: ["fuel-the-body", "stabilize-basics", "one-thing-a-day", "back-to-basics"],
    tagline: "Small food wins that stick"
  },
  {
    id: "less-screen",
    label: "Reduce screen time",
    emoji: "📱",
    category: "break-habit",
    relatedSnapshots: ["quiet-the-noise", "get-grounded", "protect-your-energy", "design-environment"],
    tagline: "Take back your attention"
  },
  {
    id: "exercise-more",
    label: "Move more",
    emoji: "🏃",
    category: "build-habit",
    relatedSnapshots: ["just-show-up", "tiny-wins", "build-the-chain", "back-to-basics"],
    tagline: "Start small, show up daily"
  },
  // ... more goals
];
```

### 2. Add Goal Filter to Journey Switcher
Enhance the existing JourneySwitcher with a goal-first view:

**New UI Flow:**
```
┌──────────────────────────────────────────────────────────┐
│ What Kind of Week Is This?                               │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │  By Goal        │  │  By State       │                │
│ │  (What I want)  │  │  (How I feel)   │                │
│ └─────────────────┘  └─────────────────┘                │
├──────────────────────────────────────────────────────────┤
│ [When "By Goal" selected:]                               │
│                                                          │
│ "What do you want to work on this week?"                 │
│                                                          │
│ ┌────────────────┐ ┌────────────────┐                   │
│ │ 🚭 Stop        │ │ 💸 Stop impulse│                   │
│ │   vaping       │ │   spending     │                   │
│ └────────────────┘ └────────────────┘                   │
│                                                          │
│ [Then show filtered snapshots relevant to that goal]     │
└──────────────────────────────────────────────────────────┘
```

### 3. Create New Snapshots for Common Habits
Add 4-6 new Snapshots specifically designed for common "break a habit" goals:

```typescript
// New Snapshot: Replace the Trigger
{
  id: "replace-the-trigger",
  name: "Replace the Trigger",
  bucketId: "momentum-consistency",
  focus: "habit",
  tagline: "Swap the urge, keep the routine",
  emoji: "🔄",
  dailyActions: [
    { day: 1, task: "Identify one trigger for your unwanted habit", description: "What situation or feeling precedes it?" },
    { day: 2, task: "Plan one alternative response", description: "When I feel X, I'll do Y instead" },
    { day: 3, task: "Use your replacement once today", description: "Even if you slip, try the replacement first" },
    { day: 4, task: "Notice what the habit actually gives you", description: "Relief? Distraction? Connection?" },
    { day: 5, task: "Find another way to get that need met", description: "Address the root, not just the surface" },
    { day: 6, task: "Make the replacement easier than the habit", description: "Reduce friction for the good choice" },
    { day: 7, task: "Reflect: which replacement worked best?", description: "Data for next week" },
  ],
}

// New Snapshot: Delay the Impulse
{
  id: "delay-the-impulse",
  name: "Delay the Impulse",
  bucketId: "clarity-perspective",
  focus: "awareness",
  tagline: "10 minutes changes everything",
  emoji: "⏳",
  dailyActions: [
    { day: 1, task: "When you want to [habit], wait 10 minutes", description: "Just delay, don't decide" },
    { day: 2, task: "During the wait, do one deep breath", description: "Interrupt the autopilot" },
    { day: 3, task: "Ask: 'Will I regret this in an hour?'", description: "Future you knows" },
    { day: 4, task: "If you still want it after waiting, notice that", description: "Data, not failure" },
    { day: 5, task: "Extend the wait to 15 minutes", description: "Build the muscle" },
    { day: 6, task: "Journal about what you notice during waits", description: "Patterns emerge" },
    { day: 7, task: "Celebrate every delay, even imperfect ones", description: "Delay is progress" },
  ],
}
```

---

## Technical Implementation

### Files to Create/Modify

**1. New File: `src/lib/lifeGoals.ts`**
- Define `LifeGoal` interface
- Create `LIFE_GOALS` constant with 12-15 common goals
- Create `getSnapshotsForGoal(goalId)` function
- Create `getGoalsForSnapshot(snapshotId)` function (reverse lookup)

**2. Modify: `src/lib/snapshots.ts`**
- Add 4-6 new Snapshots designed for habit-breaking:
  - "Replace the Trigger" (habit)
  - "Delay the Impulse" (awareness)
  - "Environment Reset" (environment)
  - "The Urge Surfing Week" (awareness)

**3. Modify: `src/components/dashboard/JourneySwitcher.tsx`**
- Add tab toggle: "By Goal" | "By State"
- Add goal chip grid when "By Goal" is selected
- Filter snapshots based on selected goal
- Show goal-specific context when viewing filtered results

**4. Modify: `src/components/onboarding/OnboardingJourneySelection.tsx`**
- Add optional "What brought you here?" goal selection before showing snapshots
- Pre-filter recommendations based on goal

---

## User Experience

### Landing Page Hook
Add a new section showing relatable goals:

```
"The Dashboard helps with real changes like..."

🚭 Quitting vaping       💸 Spending less
📱 Less phone time       🍷 Drinking less
🏃 Moving more           😴 Sleeping better
```

This immediately signals: "This isn't just another productivity app—it helps with the habits I actually struggle with."

### Browse Flow
1. User opens "Browse Snapshots"
2. Sees toggle: "By Goal" (default) | "By State"
3. Taps a goal chip like "🍷 Drink less"
4. Sees 3-5 relevant Snapshots with context:
   - "Replace the Trigger" - Swap the evening drink ritual
   - "Protect Your Energy" - Understand what you're escaping from
   - "One Day at a Time" - Focus only on today
5. Picks one, starts 7-day week with daily actions

### Goal-Specific Messaging
When a user selects a goal, show contextual framing:

```
You selected: 🍷 Drink less

"This isn't about willpower. It's about understanding 
what the drink gives you, and finding other ways to get it.

These Snapshots help you build awareness around triggers,
replace automatic patterns, and take it one day at a time."
```

---

## Life Goals to Include (Initial Set)

**Break a Habit (6):**
- 🚭 Stop smoking/vaping
- 🍷 Drink less
- 💸 Stop impulse spending
- 📱 Reduce screen time
- 🍔 Stop stress eating
- 🎮 Less gaming/scrolling

**Build a Habit (6):**
- 🏃 Exercise more
- 😴 Sleep better
- 🥗 Eat healthier
- 💧 Drink more water
- 📖 Read more
- 🧘 Meditate daily

**Mindset Shifts (4):**
- ⏰ Stop procrastinating
- 😰 Reduce anxiety
- 🎯 Stay focused
- 💬 Better relationships

---

## Philosophy Alignment

This connects to "The Controllables" philosophy:
- **Awareness**: Notice your triggers
- **Perspective**: See the bigger picture of why you do this
- **Habit**: Build the replacement pattern
- **Wellness**: Restore the foundation so you don't need the crutch
- **Environment**: Design your space to make the good choice easier

The user doesn't need to know the framework—they just know "I want to stop vaping" and the system guides them to the right lens.

---

## Phased Rollout

**Phase 1 (This Implementation):**
- Add `lifeGoals.ts` with 16 goals
- Add goal filter to JourneySwitcher
- Add 4 new habit-breaking Snapshots

**Phase 2 (Future):**
- Landing page goal showcase
- Goal selection in onboarding
- Goal-specific AI guidance from The Controllables

---

## Non-Goals
- Not creating "programs" or multi-week curricula—still 7-day Snapshots
- Not tracking specific habit metrics (e.g., "days sober")—that's external
- Not changing the Controllables framework—just adding an accessible entry point
- Not removing the current "By State" view—adding alongside it
