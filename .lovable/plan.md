
# Codebase Cleanup & Language Consistency Plan

## Overview
This plan removes legacy code from the Challenge/Streak system and unifies language around the "Snapshot" philosophy to reinforce the product positioning: **a calm place to stay consistent**.

---

## Phase 1: Remove Legacy Challenge System

### Files to Delete (7 files)
| File | Reason |
|------|--------|
| `src/pages/Challenge.tsx` | Legacy page, not linked in navigation |
| `src/components/ChallengeCard.tsx` | Only used by Challenge page |
| `src/components/ChallengeHistoryCard.tsx` | Only used by Challenge page |
| `src/components/ChallengeList.tsx` | Only used by Challenge page |
| `src/components/NewChallengeCard.tsx` | Only used by Challenge page |
| `src/hooks/useChallenge.ts` | Only used by Challenge page |

### Files to Update
| File | Change |
|------|--------|
| `src/App.tsx` | Remove `/challenge` route (line 74) |

---

## Phase 2: Remove Legacy Streak System

### Files to Delete (3 files)
| File | Reason |
|------|--------|
| `src/components/StreakDisplay.tsx` | Unused, replaced by XP/Level display |
| `src/components/StreakHistory.tsx` | Unused, replaced by Snapshot History |
| `src/hooks/useStreaks.ts` | Unused, legacy streak calculation |

### Files to Delete (1 file - confirmed unused)
| File | Reason |
|------|--------|
| `src/components/dashboard/DailyCheckinCard.tsx` | Explicitly marked as removed in Dashboard.tsx comments |

---

## Phase 3: Language Audit & Updates

### Update "Foundation" to "Snapshot" terminology

| File | Current | Change To |
|------|---------|-----------|
| `src/components/dashboard/JourneySwitcher.tsx` | "Current Foundation" | "Current Snapshot" |
| `src/components/dashboard/JourneySwitcher.tsx` | "Start Next Foundation" | "Start Next Snapshot" |
| `src/components/Day7Complete.tsx` | "recommended next Foundation" | "recommended next Snapshot" |
| `src/components/Day7Complete.tsx` | "handleStartNextFoundation" | "handleStartNextSnapshot" |
| `src/lib/resetContent.ts` | "You paused the foundation" | "You paused the snapshot" |

### Update "Mission" to "Quest" or remove

| File | Current | Change To |
|------|---------|-----------|
| `src/components/experience/QuestCard.tsx` | "Main Mission" | "Current Focus" |
| `src/components/dashboard/TodayActions.tsx` | "Mission: [Title]" | "Focus: [Title]" |
| `src/hooks/useDashboardSummary.ts` | "Completed main mission" | "Quest completed" |
| `src/hooks/useDashboardSummary.ts` | "Mission completed!" toast | "Quest completed!" |

---

## Phase 4: Strengthen Consistency Language

Update copy to reinforce "staying consistent" messaging:

| File | Current | Improved |
|------|---------|----------|
| `src/lib/resetContent.ts` MISSED_DAY_MESSAGE | "You didn't lose progress. You paused the snapshot. Ready to resume?" | "You're back. That's what matters. Pick up where you left off." |
| `src/components/ResetComplete.tsx` | "Come back tomorrow." | "See you tomorrow. Consistency beats perfection." |

---

## Technical Details

### Database Tables (No Changes Needed)
The following legacy tables exist but should NOT be dropped as they may contain historical user data:
- `challenges`
- `challenge_participants`  
- `challenge_progress`
- `daily_checkins`

These can be cleaned up in a future data migration if needed, but removing the frontend code is the priority.

### Impact Assessment
- **Bundle Size**: Removing ~1,500 lines of unused code
- **Route Changes**: `/challenge` route will 404 (was already orphaned)
- **Breaking Changes**: None for active users

---

## Summary

| Category | Files Deleted | Files Updated |
|----------|---------------|---------------|
| Challenge System | 6 | 1 |
| Streak System | 4 | 0 |
| Language Updates | 0 | 7 |
| **Total** | **10 files deleted** | **8 files updated** |

This cleanup:
1. Removes ~2,000 lines of dead code
2. Unifies terminology around "Snapshot" and "Quest"
3. Reinforces the product philosophy: **consistency over perfection**
