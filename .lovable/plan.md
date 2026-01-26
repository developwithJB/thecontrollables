

# Remove Daily Readings + Launch Readiness Cleanup

## Overview
Removing the "Daily Readings" feature from the Guide tab and simplifying the dashboard experience. This also includes product owner recommendations for other items to clean up or improve before launch.

---

## Part 1: Remove Daily Readings

### Why Remove?
The Daily Readings feature duplicates functionality now handled by:
- **The Controllables AI guides** (philosophy-grounded advice)
- **RESET_DAYS content** in `resetContent.ts` (7-day journey structure)
- **Snapshot system** (weekly themed content)

Having a separate "Daily Readings" section adds cognitive load without unique value.

### Files to Delete (4 files)

| File | Reason |
|------|--------|
| `src/hooks/useDailyReadings.ts` | Primary data fetcher for the readings |
| `src/components/ReadingCard.tsx` | UI for displaying reading cards |
| `src/components/ReadingReview.tsx` | Reading review page component |

### Files to Update (6 files)

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Remove `useDailyReadings` import and all ReadingCard rendering (lines 20, 50, 847-917, 934-997) |
| `src/components/dashboard/TodayActions.tsx` | Remove `DailyReading` interface and reading-based `getTodayInfo()` logic (lines 28-35, 216-231) |
| `src/components/dashboard/ResetProgressModule.tsx` | Remove `DailyReading` interface and reading-based logic (lines 22-29, 38, 182-195) |
| `src/lib/entitlements.ts` | Remove `dailyReadings: true` from FREE_FEATURES (line 33) |
| `src/components/DashboardManualSection.tsx` | Update "Today's Actions" description to remove "readings" mention (line 36) |
| `docs/QA_REGRESSION_CHECKLIST.md` | Remove "Daily Readings list shows" checklist items (lines 106-108) |

### Database
The `daily_readings` table will remain in the database for historical integrity but won't be queried by the frontend.

---

## Part 2: Product Owner Recommendations

### 🟢 ADD These Before Launch

#### 1. Onboarding Completion Rate Tracking
**Why:** No way to know if users finish onboarding or drop off
**What:** Add analytics events at each onboarding step (Account Created → Assessment Done → Archetype Shown → Snapshot Selected → Day 1 Started)

#### 2. "What's New" Feature Announcement
**Why:** Users returning after updates won't know about new features
**What:** Simple changelog modal that shows once per version upgrade

#### 3. Error Boundary Component
**Why:** If the app crashes, users see a broken white screen
**What:** Add a friendly error boundary that suggests refreshing or contacting support

### 🔴 REMOVE These Before Launch

#### 1. Main Mission Feature (Outdated)
**Current state:** The "Main Mission" card in the dashboard duplicates the Snapshot focus system
**Memory conflict:** DashboardManualSection still calls it "Main Mission" while other areas use "Quest" or "Focus"
**Recommendation:** Either remove entirely OR rename to "Current Quest" and make it read-only (derived from active Snapshot)

Files affected:
- `src/pages/Dashboard.tsx` (mission edit dialog, lines 92-93)
- `src/components/DashboardManualSection.tsx` (line 46-49)
- `src/components/dashboard/MainQuestModule.tsx`

#### 2. "Offline Triggers" Entitlement
**Why:** The feature was removed per memory but entitlement reference remains
**File:** `src/lib/entitlements.ts` line 32 - remove `offlineTriggers: true`

#### 3. CompletedDayView Legacy Component
**File:** `src/components/CompletedDayView.tsx`
**Why:** Only used by ReadingCard.tsx which we're deleting

### 🟡 SIMPLIFY These

#### 1. Dashboard Manual Section
**Current:** 11 sections with detailed explanations
**Problem:** Overwhelming for new users, rarely read
**Suggestion:** Collapse to 5 core items: Today's Actions, Snapshot, The Controllables, Your Build, Experience

#### 2. Game Rules Section
**Current:** 10 philosophy rules shown in the Guide tab
**Problem:** Dense, competes with The Controllables for attention
**Suggestion:** Move to Settings/About or reduce to 3 "Core Principles"

---

## Implementation Summary

| Category | Files Deleted | Files Updated |
|----------|---------------|---------------|
| Daily Readings Removal | 3 | 6 |
| Main Mission Cleanup | 0-1 | 2-3 |
| Offline Triggers | 0 | 1 |
| CompletedDayView | 1 | 0 |
| **Total** | **4-5** | **9-10** |

---

## Technical Details

### Dashboard.tsx Changes
```typescript
// REMOVE these imports
import { useDailyReadings } from "@/hooks/useDailyReadings";
import { ReadingCard } from "@/components/ReadingCard";

// REMOVE the hook call
const { readings } = useDailyReadings();

// REMOVE the entire "Daily Readings" sections (both active and inactive reset states)
```

### TodayActions.tsx Changes
```typescript
// REMOVE DailyReading interface (lines 28-35)

// SIMPLIFY getTodayInfo() to only use static content:
const getTodayInfo = () => {
  const staticContent = getDayContent(currentDay);
  return {
    emoji: staticContent.emoji,
    controllable: staticContent.controllable,
    chapter: staticContent.reading.chapter,
  };
};
```

### entitlements.ts Changes
```typescript
export const FREE_FEATURES = {
  sevenDayReset: true,
  buildAssessment: true,
  xpTracking: true,
  timeCurrency: true,
  integrityMeter: true,
  // REMOVE: offlineTriggers: true,
  // REMOVE: dailyReadings: true,
} as const;
```

---

## Post-Launch Consideration

The `daily_readings` database table can be dropped in a future migration once you're confident the feature won't return. For now, leaving it preserves data and simplifies rollback if needed.

