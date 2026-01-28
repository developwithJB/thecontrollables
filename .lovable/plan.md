
# Onboarding Clarity Update Plan

## Problem
The current onboarding flow uses outdated "Journey" terminology and a flat selection list, while the dashboard now uses a cleaner "By Goal" / "By State" Snapshot navigation system. This creates confusion from the user's first interaction.

## Solution
Align onboarding with the dashboard's Snapshot selection UX to create a consistent experience from first touch.

---

## Current vs. New Flow

```text
CURRENT ONBOARDING:                    NEW ONBOARDING:
┌──────────────────────┐              ┌──────────────────────┐
│ Build Assessment     │──────────►   │ Build Assessment     │ (Keep)
└──────────────────────┘              └──────────────────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────┐
│ Archetype Result     │──────────►   │ Archetype Result     │ (Keep)
│ "Choose Your Journey"│              │ "Pick Your Snapshot" │
└──────────────────────┘              └──────────────────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────┐
│ Journey Selection    │──────────►   │ Snapshot Selection   │
│ (flat list, 8 items) │              │  ├─ By Goal tab      │
│ "Begin 7-Day Reset"  │              │  └─ By State tab     │
└──────────────────────┘              │ "Start 7-Day Snapshot"│
           │                          └──────────────────────┘
           ▼                                     │
┌──────────────────────┐                         ▼
│ Orientation (Day 0)  │──────────►   ┌──────────────────────┐
└──────────────────────┘              │ Orientation (Day 0)  │ (Keep)
                                      └──────────────────────┘
```

---

## Changes Required

### 1. Update `OnboardingArchetypeResult.tsx`
**File**: `src/components/onboarding/OnboardingArchetypeResult.tsx`

**Changes**:
- Button text: "Choose Your Journey" → "Pick Your Snapshot"
- Subtitle: "You can retake this assessment anytime" (keep as is)

### 2. Replace `OnboardingJourneySelection.tsx` with Goal/State Selection
**File**: `src/components/onboarding/OnboardingJourneySelection.tsx`

This is the main change. Replace the current flat journey list with a tabbed interface matching StartSnapshotDialog:

**New Structure**:
- **Header**: "Pick Your First Snapshot" with subtitle about focus
- **Tabs**: "By Goal" | "By State" toggle (defaulting to "By Goal")
- **By Goal Tab**:
  - Goal categories (Break a Habit, Build a Habit, Shift Mindset)
  - Clickable goal pills that filter snapshots
  - Filtered snapshot cards when goal is selected
- **By State Tab**:
  - Build scores display (if available)
  - Recommended snapshot based on Build
  - Collapsible category buckets
- **CTA**: "Start 7-Day Snapshot"

**Key differences from StartSnapshotDialog**:
- Full-screen layout (not modal)
- Animation between views
- Integrated with onboarding flow state
- Default to "By Goal" for first-time users (more relatable)

### 3. Update `OnboardingOrientation.tsx`
**File**: `src/components/onboarding/OnboardingOrientation.tsx`

**Minor copy changes**:
- "Starting: {journeyTitle}" → "Your Focus: {snapshotName}"
- Button "Start Day 1" (keep as is - this is clear)

### 4. Update `OnboardingFlow.tsx`
**File**: `src/components/onboarding/OnboardingFlow.tsx`

**Changes**:
- Update types/terminology in comments
- Update `getRecommendedJourneyId` to use snapshot system
- Pass snapshot data (not just journey) to child components

### 5. Update Button/Label Terminology Across Files
- "Begin 7-Day Reset" → "Start 7-Day Snapshot"
- "journey" → "snapshot" in variable names and UI copy
- "Choose Your Journey" → "Pick Your Snapshot"

---

## Detailed Component Changes

### OnboardingJourneySelection.tsx (Complete Rewrite)

**New Props**:
```typescript
interface OnboardingSnapshotSelectionProps {
  buildResult?: BuildScore | null;
  onSelect: (snapshot: Snapshot) => void;
}
```

**State Management**:
```typescript
const [viewMode, setViewMode] = useState<"goal" | "state">("goal");
const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
const [expandedBuckets, setExpandedBuckets] = useState<Set<BucketId>>(new Set());
```

**Layout Sections**:
1. **Header** - "Pick Your First Snapshot"
2. **Tab Toggle** - Goal | State (using existing Tabs component)
3. **By Goal Content**:
   - Goal category sections with clickable pills
   - Filtered snapshot cards
4. **By State Content**:
   - Build scores (if available)
   - Recommended snapshot
   - Category accordions
5. **Continue Button** - "Start 7-Day Snapshot"

---

## UI/UX Details

### By Goal Tab (Default for Onboarding)
- Shows all 17 life goals organized by category
- User taps a goal → relevant snapshots appear below
- Pre-select first snapshot in filtered list for easy flow
- Context message appears explaining connection

### By State Tab
- Shows Build assessment scores (if completed)
- Highlights recommended snapshot based on lowest score
- Buckets expand to show all options
- Good for users who skipped assessment or want to explore

### Animation Flow
- Tab switch: Subtle fade/slide
- Goal selection: Snapshot list slides in from bottom
- Bucket expand: Standard collapsible animation

---

## Copy Updates Summary

| Component | Current | New |
|-----------|---------|-----|
| ArchetypeResult button | "Choose Your Journey" | "Pick Your Snapshot" |
| JourneySelection header | "Where to Begin" | "Pick Your First Snapshot" |
| JourneySelection subtitle | "Direction should be selected..." | "What do you want to work on?" |
| JourneySelection CTA | "Begin 7-Day Reset" | "Start 7-Day Snapshot" |
| Orientation subtitle | "Starting: {title}" | "Your Focus: {name}" |

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `src/components/onboarding/OnboardingArchetypeResult.tsx` | Minor copy update |
| `src/components/onboarding/OnboardingJourneySelection.tsx` | Major rewrite |
| `src/components/onboarding/OnboardingOrientation.tsx` | Minor copy update |
| `src/components/onboarding/OnboardingFlow.tsx` | Type/terminology updates |

---

## Benefits

1. **First impression matches dashboard** - Users learn the UI once
2. **Goal-first navigation** - More relatable for new users ("Stop procrastinating" vs "Habit controllable")
3. **State-based fallback** - Users who took assessment can use their Build data
4. **Consistent language** - "Snapshot" everywhere, no "Journey" confusion
5. **Familiar patterns** - Same tab system they'll use on dashboard later

---

## Technical Notes

- Reuse `SNAPSHOTS`, `BUCKETS`, `LIFE_GOALS` from existing lib files
- Import `getSnapshotsForGoal`, `getRecommendedSnapshot` helpers
- Use same `Controllable` type and emoji config
- Animations via existing Framer Motion patterns
- No new dependencies needed
