
# Enhance Mission Clarity and Value

## Problem Analysis

The current Mission feature has several UX gaps that make it confusing for users:

1. **Minimal Context in Modals**: When users click Mission, they see a bare-bones edit modal with just "Direction, not a task" — no explanation of the psychology or hierarchy
2. **No Hierarchy Education**: The Mission → Snapshot → Daily Check-In framework is only explained in the "Dashboard Manual" section (buried, requires scrolling)
3. **No Examples for New Users**: First-time users don't understand how Mission relates to their daily activity
4. **Missing from Emails**: Daily nudges mention Snapshot day but never reinforce the Mission as the overarching direction
5. **Auto-Created Mission Hidden**: During onboarding, a Mission is auto-created from the Snapshot name, but users never see this explained

## Psychology of the Hierarchy

```text
┌─────────────────────────────────────────────────────────┐
│  MISSION (Direction)                                    │
│  "Reclaim Energy" — Your north star. Doesn't change     │
│  daily. You live under it; you don't complete it.       │
├─────────────────────────────────────────────────────────┤
│  SNAPSHOT (This Week)                                   │
│  "Rest & Recovery Week" — 7-day focused lens.           │
│  One theme at a time. Weekly reset.                     │
├─────────────────────────────────────────────────────────┤
│  DAILY CHECK-IN (Today)                                 │
│  "Rate yesterday's focus. Complete today's action."     │
│  Just today. Nothing more.                              │
└─────────────────────────────────────────────────────────┘
```

## Solution Overview

### 1. Enhanced Mission Modal with Education + Examples

**Current State**: Empty modal with input field and example chips

**Proposed State**: 
- Add visual hierarchy diagram at top of modal
- Show contextual relationship: "Mission guides your Snapshots. Snapshots structure your days."
- For new users (first 2 weeks), show rotating examples with explanations
- Add "Learn More" expandable section explaining the philosophy

### 2. Mission Tooltip on Dashboard

**Current State**: Clicking Mission in GreetingBanner opens edit modal immediately

**Proposed State**:
- First click shows an info popover with hierarchy explanation
- "Edit" button in popover opens the edit modal
- After 5 dashboard visits, default to edit modal directly

### 3. Onboarding Mission Moment

**Current State**: Mission auto-created silently from Snapshot name

**Proposed State**:
- After Day 0 Orientation, show brief "Your Direction" screen explaining:
  - "This is your Mission: [Mission Title]"
  - "It was created from your Snapshot to give you a north star"
  - "You can change it anytime — it's meant to evolve"
- Quick "Got it" button proceeds to Day 1

### 4. Email Nudge Enhancement

**Current State**: Emails mention Snapshot day but not Mission

**Proposed State**:
- Include Mission in morning nudges: "Your Direction: [Mission Title]"
- Weekly nudges (Monday) specifically reinforce: "This week you're focused on [Snapshot]. Your north star: [Mission]."
- Create relationship messaging that connects the three levels

### 5. Dashboard Hierarchy Card (New Users)

**Current State**: Hierarchy only shown in "Dashboard Manual" section

**Proposed State**:
- For first 7 dashboard visits, show a collapsible "How This Works" mini-card above Today's Actions
- Visual: Mission → Snapshot → Daily (stacked cards with arrows)
- Dismissible with "Got it, don't show again"

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/MainQuestModule.tsx` | Add hierarchy diagram, enhanced examples, philosophy explanation |
| `src/components/dashboard/GreetingBanner.tsx` | Add popover for Mission with hierarchy explanation (first clicks) |
| `src/pages/Dashboard.tsx` | Pass visit count to GreetingBanner; add "How This Works" card for new users; enhance Mission edit modal |
| `src/components/onboarding/OnboardingFlow.tsx` | Add "Your Direction" transitional screen after orientation |
| `src/components/onboarding/OnboardingMissionReveal.tsx` | **NEW** — Mission reveal component for onboarding |
| `src/components/dashboard/HierarchyExplainer.tsx` | **NEW** — Reusable hierarchy diagram component |
| `supabase/functions/send-daily-nudge/index.ts` | Include Mission title in email context and content |

---

## Detailed Implementation

### New Component: HierarchyExplainer

A reusable visual that shows the three-level structure:
- Can be compact (for modals) or expanded (for onboarding)
- Uses the existing icons (Target, Camera, CheckCircle)
- Includes subtle animations for emphasis

```tsx
// Compact mode: horizontal flow with arrows
Mission → Snapshot → Daily

// Expanded mode: vertical cards with descriptions
[Mission Card]
    ↓
[Snapshot Card]
    ↓
[Daily Card]
```

### Enhanced Mission Modal Content

```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Set Your Direction</DialogTitle>
    <p>Your Mission is the big-picture goal. It doesn't change daily.</p>
  </DialogHeader>
  
  {/* NEW: Compact hierarchy visual */}
  <HierarchyExplainer variant="compact" highlighted="mission" />
  
  {/* Input with examples */}
  <Input placeholder="e.g., Reclaim Energy" />
  
  {/* Clickable example chips */}
  <div className="flex flex-wrap gap-2">
    {["Build discipline", "Reclaim energy", ...].map(...)}
  </div>
  
  {/* NEW: Expandable philosophy section */}
  <Collapsible>
    <CollapsibleTrigger>Why set a Mission?</CollapsibleTrigger>
    <CollapsibleContent>
      <p>Your Mission is where you're pointing your life right now...</p>
      <ul>
        <li>Snapshots serve your Mission (weekly focus)</li>
        <li>Daily check-ins serve your Snapshot (today only)</li>
        <li>Missions can evolve — you're not locked in</li>
      </ul>
    </CollapsibleContent>
  </Collapsible>
</DialogContent>
```

### Email Enhancement

Add Mission fetching to `getUserContext()`:
```typescript
// In send-daily-nudge/index.ts
async function getUserContext(...): Promise<UserContext> {
  // ... existing context fetching
  
  // NEW: Fetch active quest (Mission)
  const questResult = await supabase
    .from("quests")
    .select("title")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
    
  context.missionTitle = questResult.data?.title || null;
}
```

Update email content generation:
```typescript
function generateEmailContent(context, nudgeTime) {
  // ... existing logic
  
  // NEW: Include Mission in personalization
  if (context.missionTitle) {
    mainMessage = `Day ${dayNum} of 7 — Your direction: ${context.missionTitle}`;
  }
}
```

### Onboarding Mission Reveal Screen

New transitional screen after orientation:
```tsx
export function OnboardingMissionReveal({ 
  missionTitle, 
  snapshotName, 
  onContinue 
}: Props) {
  return (
    <motion.div className="min-h-screen flex flex-col items-center justify-center">
      <Target className="w-12 h-12 text-primary mb-6" />
      
      <h1>Your Direction</h1>
      <p className="text-2xl font-semibold">{missionTitle}</p>
      
      <p className="text-muted-foreground mt-4">
        This is your north star. Your Snapshot "{snapshotName}" 
        serves this direction. You can change it anytime.
      </p>
      
      <Button onClick={onContinue}>Got it → Start Day 1</Button>
    </motion.div>
  );
}
```

---

## Testing Checklist

1. **New User Onboarding**: Complete full onboarding → verify Mission reveal screen appears → verify Mission is set
2. **Dashboard (New User)**: First 7 visits show hierarchy explainer card → dismissible → doesn't reappear
3. **Mission Edit Modal**: Click Mission in header → see enhanced modal with hierarchy + examples + philosophy
4. **Email Nudges**: Receive morning nudge → verify Mission title appears in email body
5. **Existing Users**: Hierarchy card doesn't appear for users with 7+ visits

---

## Technical Notes

- `dashboardVisitCount` is already tracked via `useDashboardVisitCount` hook
- Mission (Quest) data is already loaded in `useDashboardSummary`
- Email nudge function already has `UserContext` pattern for extensibility
- HierarchyExplainer can reuse existing `HIERARCHY_ITEMS` from DashboardManualSection
- Visit-based gating can use localStorage to track "seen_hierarchy_explainer" dismissal
