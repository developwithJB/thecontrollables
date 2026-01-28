
# Integrate Build Score into Time Cycles Modal

## Overview
Add the user's Build score and current archetype to the Time Cycles card in the Experience tab. This provides free users (and paid users) with contextual awareness of "where they are" beyond just time—their mental/behavioral state alongside temporal cycles.

## Design Philosophy
The Time Cycles card already answers "Where you are right now" from a time perspective. Adding Build creates a holistic "state of being" view:
- **Time Cycles** = external markers (day phase, week progress, snapshot progress)
- **Build State** = internal markers (awareness, perspective, habit, wellness, environment)

This adds mental value by showing users their current "operating mode" without requiring them to dig into a separate modal.

---

## Implementation Plan

### 1. Update TimeCycleCard Props Interface
Accept optional Build data to display when available:

```typescript
interface TimeCycleCardProps {
  activeQuest?: { ... } | null;
  currentResetDay?: number;
  hasActiveReset?: boolean;
  // NEW: Build data
  currentBuild?: {
    overall: number;
    awareness: number;
    perspective: number;
    habit: number;
    wellness: number;
    environment: number;
    build_archetype_key: string | null;
    updated_at: string;
  } | null;
}
```

### 2. Add Build State Section to TimeCycleCard
Add a new collapsible section below the existing cycles:

**UI Structure:**
```
┌──────────────────────────────────────────┐
│ 📅 Time Cycles                           │
│    Where you are right now               │
├──────────────────────────────────────────┤
│ [Day Cycle - Execute Phase, etc.]        │
│ [Week Progress - M T W T F S S]          │
│ [7-Day Snapshot Progress - if active]    │
├──────────────────────────────────────────┤
│ 🧬 Your Build                            │  ← NEW SECTION
│ ┌────────────────────────────────────┐   │
│ │ ⚡ Stable Build     Overall: 3.2   │   │
│ │ Focus: 🦈 Habit (lowest)           │   │
│ └────────────────────────────────────┘   │
│ [View Full Build →] (optional link)      │
└──────────────────────────────────────────┘
```

### 3. Visual Design Details
- **Archetype Badge**: Show the emoji + label in a themed chip (uses existing `getArchetypeThemeColors`)
- **Overall Score**: Simple `X.X/4` display
- **Focus Indicator**: Highlight the lowest controllable with its emoji + "Focus area"
- **Subdued Styling**: Use `bg-muted/30` to keep it secondary to time cycles
- **No Build State**: Show "Take the Build Assessment" prompt with muted styling

### 4. Pass Build Data from Dashboard.tsx
Update the TimeCycleCard usage in Experience tab:

```tsx
<TimeCycleCard
  activeQuest={activeQuest}
  currentResetDay={currentDay}
  hasActiveReset={!!activeSession && !isCompleted}
  currentBuild={currentBuild}  // ← Add this
/>
```

---

## Technical Details

### Files to Modify

**1. `src/components/experience/TimeCycleCard.tsx`**
- Import `getArchetypeInfo`, `getArchetypeThemeColors`, `getLowestControllable` from `@/lib/build`
- Add `currentBuild` prop
- Add new "Your Build" section after Snapshot Cycle
- Compute lowest controllable for "Focus area" display
- Handle null/undefined build gracefully

**2. `src/pages/Dashboard.tsx`**
- Pass `currentBuild` to TimeCycleCard component (data already available via `useBuildAssessment`)

### New UI Elements in TimeCycleCard

**Build Section (when user has build data):**
```tsx
<div className="p-3 rounded-xl bg-muted/30 border border-border/30">
  <div className="flex items-center gap-2 mb-2">
    <Dna className="w-4 h-4 text-purple-500" />
    <span className="text-xs font-medium text-muted-foreground">Your Build</span>
  </div>
  <div className={`flex items-center justify-between p-2 rounded-lg ${themeColors.bg} border ${themeColors.border}`}>
    <div className="flex items-center gap-2">
      <span className="text-base">{archetypeInfo.emoji}</span>
      <span className={`text-sm font-medium ${themeColors.text}`}>{archetypeInfo.label}</span>
    </div>
    <span className="text-sm font-semibold text-foreground">{overall.toFixed(1)}/4</span>
  </div>
  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
    <span>Focus:</span>
    <span>{lowestEmoji}</span>
    <span className="text-amber-600 dark:text-amber-400">{lowestLabel}</span>
  </div>
</div>
```

**No Build State:**
```tsx
<div className="p-3 rounded-xl bg-muted/20 border border-dashed border-border/30">
  <div className="flex items-center gap-2">
    <Dna className="w-4 h-4 text-muted-foreground/50" />
    <span className="text-xs text-muted-foreground">Build not scanned yet</span>
  </div>
</div>
```

### Controllable Emoji Mapping (from existing code)
```typescript
const CONTROLLABLE_EMOJIS: Record<string, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};
```

---

## User Experience

### For Free Users
- See their current Build state at a glance in the free Time Cycles section
- Understand which Controllable needs attention ("Focus: 🛰️ Wellness")
- No unlock required—this reinforces the value of the Build assessment

### For All Users
- Contextual awareness: "It's Wednesday afternoon, I'm in Execute Phase, and my Build shows I'm 'Capable but Inconsistent' with a focus on Habit"
- Quick reference without opening the full Build module
- Encourages periodic re-assessment when they notice their state feels off

### Mental Value (Not Confusion)
- **Simple**: Archetype label + overall score + focus area
- **No stats bars**: Keep it glanceable, not analytical
- **Themed colors**: Use existing archetype themes for immediate recognition
- **Non-overwhelming**: Tucks naturally below time cycles as secondary context

---

## Non-Goals
- No full stat bars or detailed breakdown (that's in BuildOverviewModule)
- No assessment trigger from this card (just awareness)
- No additional animations or complexity
- No changes to Build logic or data fetching

