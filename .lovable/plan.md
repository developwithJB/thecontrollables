
# Terminology Consistency: Mission as Direction, Snapshot as Weekly Focus

## Summary

The user correctly identified that the **Mission** concept still shows duration/countdown behavior throughout the app (e.g., "5d left" in Experience tab, "X days remaining" in MainQuestModule), which contradicts the refined philosophy where:

- **Mission = Direction** (a north star, not time-bound, not a task)
- **7-Day Snapshot = Weekly Focus** (time-bound, the weekly commitment with a specific theme)

## Changes Required

### 1. MainQuestModule.tsx - Remove Duration Display
**Current Issue:** Shows progress bar, "X days remaining", and allows duration selection (7/30/90 days)  
**Fix:** 
- Remove the progress bar entirely
- Remove "days remaining" text
- Remove duration selector from creation dialog (or set a very long default like 365 days internally so it never shows urgency)
- Mission becomes a persistent direction without end date visibility

### 2. TimeCycleCard.tsx (Experience Tab) - Remove Quest Cycle Section
**Current Issue:** Shows Mission/Quest as "Lock in spending and tr... 5d left" with progress bar  
**Fix:**
- Remove the "Quest Cycle" section entirely (lines 148-171)
- The TimeCycleCard should only show:
  - Day Phase (Build/Execute/Reflect/Rest)
  - Week Progress (M-S)
  - 7-Day Snapshot progress

### 3. Update Terminology Labels
**GreetingBanner.tsx:**
- Keep "Mission" label (line 122) - this is correct
- Update tooltip (line 117) to say `"Your Direction: ${missionTitle}"` instead of `"Mission: ${missionTitle}"`

**ResetProgressModule.tsx (line 611):**  
- "X days remaining" refers to the 7-Day Snapshot, which IS time-bound - this is CORRECT and should stay

### 4. Database/API - Remove Duration Dependency (Optional Consideration)
The `main_quests` table stores `duration_days` and `ends_at`. While we won't change the DB schema, the UI should simply not display these values for Mission.

---

## Technical Implementation

### File: src/components/dashboard/MainQuestModule.tsx

1. **Remove progress bar section** (lines 256-266)
2. **Remove "days remaining" display** (lines 268-271) - replace with microcopy reinforcing direction
3. **Remove duration selector from creation dialog** (lines 148-167) - hard-code a default duration internally
4. **Update creation button text** from "Activate Mission" to "Set Direction"

### File: src/components/experience/TimeCycleCard.tsx

1. **Remove entire Quest Cycle section** (lines 148-171) - the Mission should not appear as a time-tracked item in Time Cycles

### File: src/components/dashboard/GreetingBanner.tsx

1. **Update Mission tooltip** (line 117): Change from `Mission: ${missionTitle}` to `Direction: ${missionTitle}`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/MainQuestModule.tsx` | Remove progress bar, remove duration display, hide duration selector |
| `src/components/experience/TimeCycleCard.tsx` | Remove Quest Cycle section entirely |
| `src/components/dashboard/GreetingBanner.tsx` | Update Mission tooltip to "Direction" |

---

## Outcome

After these changes:
- **Mission** will appear as a simple text direction with no countdown, no progress bar, no end date
- **7-Day Snapshot** remains the ONLY time-tracked weekly construct (as it should be)
- The Experience tab's "Time Cycles" will show Day/Week/Snapshot progress only
- Users will understand Mission = Direction (persistent), Snapshot = This Week (7 days)

