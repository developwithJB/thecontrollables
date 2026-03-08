

## Plan: Brain & Body Empty State — Quick Start Onboarding

### Problem
When users have no wellness data, the Brain & Body card shows "0" scores with empty rings, which is confusing and gives no actionable next step. The card needs to guide users into providing initial data.

### Approach
Replace the empty/zero state with a **Quick Check-In** flow directly inside the card. Instead of showing meaningless zeros, present a friendly inline onboarding that collects yesterday's wellness in 3 quick taps, instantly populating the card with real scores.

### Changes

#### 1. New empty state UI in BrainBodyTracker

**File: `src/components/dashboard/BrainBodyTracker.tsx`**

When `!hasData` (or `brainScore === 0 && bodyScore === 0`), render a new inline onboarding view instead of the current bland text:

- **Step 1 — Welcome prompt**: "How did you sleep last night?" with 5 emoji buttons (😴 → 😁) representing 1-5 ratings
- **Step 2**: "How active were you yesterday?" — same 5-tap scale
- **Step 3**: "How was your nutrition?" — same 5-tap scale
- On completion: call the existing `onLog` wellness mutation to save as yesterday's log, then the card auto-refreshes with real scores

This keeps users on the dashboard (no modal/navigation) and fills the card in ~5 seconds.

Also add two secondary options below the quick check-in:
- **"Import Health Data"** button — opens the existing `HealthDataSync` dialog
- **"Log today instead"** link — opens the existing `WellnessLogger` modal

#### 2. Wire up inline logging

**File: `src/components/dashboard/BrainBodyTracker.tsx`**
- Accept a new prop `onImportHealth?: () => void` alongside existing `onLogWellness`
- Add local state for the 3-step quick flow (`quickStep`, `quickRatings`)
- On final tap, call the wellness log mutation directly (via a new `onQuickLog` callback prop that takes sleep, movement, nutrition ratings)

**File: `src/pages/Dashboard.tsx`**
- Pass `onQuickLog` and `onImportHealth` callbacks to `BrainBodyTracker`
- `onQuickLog` calls the same mutation used by `WellnessLogger` (from `useWellness` hook)
- `onImportHealth` opens the `HealthDataSync` dialog

#### 3. Fix the "false positive hasData" issue

**File: `src/hooks/useBrainBodyHealth.ts`**
- Tighten the `hasData` check: only return `true` if at least one score > 0 (currently returns true even when all computed scores are 0 due to empty/null data)

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/BrainBodyTracker.tsx` | Replace empty state with inline 3-step quick check-in + import/log links |
| `src/hooks/useBrainBodyHealth.ts` | Fix `hasData` to require at least one positive score |
| `src/pages/Dashboard.tsx` | Wire up `onQuickLog` and `onImportHealth` callbacks |

