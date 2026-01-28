
# Plan: Fix Day 7 Celebration Flow & Make Proof Rewarding to Revisit

## Summary
Three issues to address:
1. Day 7 celebration screen not triggering after completing all tasks
2. No way for users to revisit the celebration/certificate for completed snapshots
3. "Your Story" section needs clearer visual presentation of proof

---

## Issue 1: Day 7 Celebration Not Triggering

**Root Cause Analysis:**
The celebration triggers in `TodayActions.tsx` when `allCompleted` transitions from false to true AND `currentDay === 7`. However, when the Day 7 reading is completed:
- The `todayResetCompleted` prop becomes `true`
- This changes the check-in action from incomplete to complete
- The `allCompleted` state may already be `true` from a previous render cycle before the callback fires
- Additionally, if the session gets marked as `completed` (via `isResetCompleted`), the condition `hasActiveSession && !isResetCompleted` fails

**Solution:**
Modify the Day 7 trigger logic to be more robust:
- Track when Day 7 reading completion happens specifically
- Use a separate effect that watches for `todayResetCompleted` becoming true on Day 7
- Add a prop from Dashboard to signal when Day 7 reading was just completed

**Files to modify:**
- `src/components/dashboard/TodayActions.tsx` - Add explicit Day 7 completion detection
- `src/pages/Dashboard.tsx` - Pass down Day 7 completion signal

---

## Issue 2: Allow Users to Revisit Celebration

**Current State:**
- `Day7Complete` component shows certificates, share options, and next snapshot recommendations
- Only accessible via `/reset?day7complete=true` URL or when session is completed
- `SnapshotDetailView` shows week details but no path to celebration

**Solution:**
Add a prominent "View Celebration" button to `SnapshotDetailView` for completed (7/7 days) snapshots:

```
┌─────────────────────────────────┐
│  🏆 Week Record                 │
│  Jan 15 - 21, 2026              │
│  ✓ Completed                    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🎉 View Your           │    │
│  │     Achievement         │    │ ← NEW: Links to celebration page
│  │  Certificate & Share    │    │
│  └─────────────────────────┘    │
│                                 │
│  📊 7/7 Days  ⚡ 350 XP        │
└─────────────────────────────────┘
```

**Files to modify:**
- `src/components/experience/SnapshotDetailView.tsx` - Add celebration link for completed snapshots
- `src/pages/Reset.tsx` - Accept session ID from URL to show historical celebrations

---

## Issue 3: Make "Your Story" Clearer and More Rewarding

**Current Issues:**
- Week cards show data but don't emphasize the "proof" narrative
- Completed snapshots don't feel like achievements
- Missing emotional connection to the recorded history

**Solution:**
Enhance the visual presentation:

1. **Add completion celebration badge** to completed week cards:
   - Show 🏆 trophy icon for 7/7 completions
   - Add "Proof Recorded" label

2. **Improve WeekCard status display:**
   - Completed: "🏆 Proof Recorded" (green, celebratory)
   - In Progress: "Day X of 7" (primary color)
   - Partial: "X days recorded" (neutral)

3. **Add quick action to view certificate** from Week card for completed snapshots

4. **Narrative enhancement** - Add inspirational microcopy:
   - "This week, you kept your word to yourself."
   - "7 days of showing up. That's proof."

**Files to modify:**
- `src/components/dashboard/SnapshotHistory.tsx` - Enhance WeekCard with trophy/proof badges
- `src/components/experience/SnapshotDetailView.tsx` - Add celebration link and better proof narrative

---

## Implementation Steps

### Step 1: Fix Day 7 Celebration Trigger
1. Add `onDay7ReadingComplete` callback prop to TodayActions
2. In TodayActions, detect when Day 7 reading completes and trigger celebration
3. Add fallback detection for when all tasks complete on Day 7

### Step 2: Add Celebration Access to History
1. Modify SnapshotDetailView to show "View Achievement" button for 7/7 completed snapshots
2. Update Reset.tsx to accept a `sessionId` query param to show historical celebrations
3. Pass session data to Day7Complete for historical views

### Step 3: Enhance Your Story Visuals
1. Update WeekCard to show trophy badge for completed weeks
2. Add "Proof Recorded" status for 7/7 completions
3. Add quick "View Certificate" action on completed cards
4. Improve narrative text to emphasize proof/achievement

---

## Technical Notes

**Console Warning Fix:**
The Badge component doesn't support `forwardRef`, causing a React warning. Will also fix this by wrapping Badge usage properly or adding forwardRef support to the Badge component.

**Navigation Flow for Historical Celebrations:**
- From SnapshotDetailView → `/reset?sessionId=xxx&celebration=true`
- Reset.tsx will fetch the session data and display Day7Complete with historical data

---

## Expected Outcome

1. ✅ Day 7 celebration reliably triggers after completing all tasks
2. ✅ Users can revisit their celebration/certificate from "Your Story"
3. ✅ Completed snapshots feel like achievements with trophy badges
4. ✅ "Proof Recorded" language reinforces the value of the record
5. ✅ Console warning about Badge refs is resolved
