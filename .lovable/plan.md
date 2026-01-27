

# Clarity Refinements with Product Owner Adjustments

## Overview
This plan incorporates your feedback to preserve the "welcome check-in" magic by placing contextual helper text directly in the UI components (not just the Manual), adding pre-assessment reassurance, and ensuring The Controllables surface only when users are stuck—never as a primary CTA.

---

## 1. Contextual Helper Text in UI Components

### Problem
The Dashboard Manual alone isn't enough—users need one-time, in-context explanations where they first encounter each concept.

### Solution
Add subtle helper text directly in the Mission card, Snapshot card, and Daily Check-In area. These appear once per user or on first meaningful interaction.

### Implementation

**A. Mission Card (`MainQuestModule.tsx`)**

Add helper text when showing "No Active Mission" state (lines 114-121):

```tsx
<h3 className="font-display font-semibold text-foreground">No Active Mission</h3>
<p className="text-xs text-muted-foreground mt-1">
  Your Mission is the direction you're pointing your life right now. It doesn't change daily.
</p>
```

Also update the Dialog header (line 132) with contextual copy:

```tsx
<DialogTitle className="font-display">Define Your Main Mission</DialogTitle>
<p className="text-xs text-muted-foreground mt-1">
  Pick a direction. You can refine it later.
</p>
```

**B. Snapshot Card (`SnapshotSelector.tsx`)**

Update DialogDescription (lines 387-391) to include grounding copy:

```tsx
<DialogDescription>
  {viewMode === "recommendation" 
    ? "A Snapshot is your focus for the next 7 days. One theme. No perfection."
    : "Explore all 36 Snapshots across 6 life themes."
  }
</DialogDescription>
```

**C. Daily Check-In Area (`TodayActions.tsx`)**

Add a one-time helper line below the primary action anchor (around line 687):

```tsx
<div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-2">
  <Sparkles className="w-3.5 h-3.5" />
  If you do one thing today, do this.
</div>
<p className="text-[10px] text-muted-foreground mb-3">
  This is about today only. One honest check-in. Then you're done.
</p>
```

This helper appears only when the check-in is the primary action.

---

## 2. Dashboard Manual Hierarchy Section (Keep)

### Rationale
The Manual should still contain a clear hierarchy explanation for users who explore it. This complements the in-context text.

### Implementation

Add a new section to `DashboardManualSection.tsx` before "Quick Reference":

**New constant:**
```typescript
import { Target, Camera, CheckCircle } from "lucide-react";

const HIERARCHY_ITEMS = [
  {
    title: "Mission",
    subtitle: "Direction",
    icon: Target,
    description: "Your Mission is the direction you're pointing your life right now. It doesn't change daily.",
  },
  {
    title: "Snapshot", 
    subtitle: "This Week",
    icon: Camera,
    description: "A Snapshot is your focus for the next 7 days. One theme. No perfection.",
  },
  {
    title: "Daily Check-In",
    subtitle: "Today",
    icon: CheckCircle,
    description: "This is about today only. One honest check-in. Then you're done.",
  },
];
```

**Render a simple "How This Works" card** above Quick Reference with these three items stacked vertically, plus footer text: "You don't manage all three at once. Just focus on today."

---

## 3. Pre-Assessment Reassurance Line (Add)

### Problem
Users may feel anxious before starting the Build assessment. The current intro text is functional but not emotionally grounding.

### Solution
Add a single reassurance line at the start of the assessment.

### Implementation

**Update `BuildAssessmentModal.tsx`**

Add below the DialogTitle (after line 97):

```tsx
<DialogHeader>
  <DialogTitle className="font-display">
    {showResults ? "Your Build" : "Scan Your Build"}
  </DialogTitle>
  {!showResults && (
    <p className="text-sm text-muted-foreground mt-1">
      No right answers. This just helps us know where to start.
    </p>
  )}
</DialogHeader>
```

This appears only during the questions phase, not results.

---

## 4. Daily Success Anchor Visual Emphasis (Keep)

### Current State
The primary action anchor at lines 682-711 already has the correct copy:
- "If you do one thing today, do this."
- "Everything else is optional." (line 727)

### Refinements

**Slightly increase prominence:**
- Increase icon size from `w-3.5 h-3.5` to `w-4 h-4`
- Add `font-semibold` to the anchor text
- Add a subtle separator (horizontal line) between primary and secondary actions

**Implementation:**
```tsx
{/* After primary action card, before "Everything else is optional" */}
{secondaryActions.length > 0 && primaryAction && !primaryAction.completed && (
  <div className="mx-4 border-t border-border/50" />
)}
```

---

## 5. AI Guides Positioning: Optional, Not Primary (Critical)

### Goal
The Controllables should never be a primary CTA. They surface when users are stuck—contextually, not proactively.

### Current Issue
- "Ask The Controllables" appears as a Day 5 task in Today's Actions (line 359)
- The Manual says "Five AI guides for action-focused advice. Ask when you're stuck."—mentions "AI"

### Refinements

**A. Update Dashboard Manual (`DashboardManualSection.tsx`)**

Change line 41-43:
```tsx
{
  title: "The Controllables",
  icon: MessageCircle,
  description: "Five guides to help when you're stuck. Ask a question, get one action.",
},
```

This removes "AI" language entirely.

**B. Update AI Guide Panel Header (`AIGuidePanel.tsx`)**

Add contextual helper text below the panel header (around line ~520 where the guide selector renders):

```tsx
<p className="text-xs text-muted-foreground mt-1 mb-3">
  Use a guide when you're stuck or need help choosing your next rep.
</p>
```

**C. Update Landing Page (`HowItWorksSection.tsx`)**

Change line 15:
```tsx
description: "The Dashboard notices what works for you and suggests what to focus on this week.",
```

This removes "Based on your Build and patterns" which sounds too algorithmic.

**D. Today's Actions: Keep "Ask The Controllables" as Day 5 Task BUT...**

This is fine as-is because:
- It only appears on Day 5 (not primary action by default)
- It's marked as optional via the secondary actions section
- Copy is already "Ask The Controllables" (not "Chat with AI")

No change needed here.

---

## 6. Snapshot Terminology Audit (Keep)

### Verification
- `MainQuestModule.tsx`: Uses "Mission" ✓
- `SnapshotSelector.tsx`: Uses "Snapshot" ✓
- `DashboardManualSection.tsx`: Uses "7-Day Snapshot" ✓

### One Change Needed

**`DashboardManualSection.tsx` line 46:**

Current:
```tsx
description: "Your scores across 5 dimensions. Take the assessment to discover your archetype.",
```

Change to:
```tsx
description: "Your scores across 5 dimensions. Answer a few questions to see where to grow.",
```

This is simpler and doesn't promise "discovery"—just insight.

---

## 7. Tone Check Validation (Add)

### Implementation
This is a process guideline, not a code change. Before shipping, apply this test to all copy:

> "Does this still feel like a welcome check-in?"

If a tired person would feel evaluated or pressured, simplify.

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/MainQuestModule.tsx` | Add helper text to empty state and dialog header |
| `src/components/dashboard/SnapshotSelector.tsx` | Update DialogDescription to include grounding copy |
| `src/components/dashboard/TodayActions.tsx` | Add one-time helper below primary action, add visual separator |
| `src/components/DashboardManualSection.tsx` | Add hierarchy section, update Controllables copy, simplify Build description |
| `src/components/dashboard/BuildAssessmentModal.tsx` | Add pre-assessment reassurance line |
| `src/components/dashboard/AIGuidePanel.tsx` | Add contextual helper text for tool-like positioning |
| `src/components/landing/HowItWorksSection.tsx` | Remove algorithmic language from "Get Guided" |

---

## Validation Criteria

After implementation:

1. A user can explain Mission vs Snapshot vs Daily Check-In in one sentence
2. A tired user knows exactly what "done" means today
3. The app feels calmer and more human than before
4. The Controllables feel like optional tools, not a primary feature
5. Pre-assessment copy reduces anxiety, not increases it
6. All changes pass the "welcome check-in" tone test

