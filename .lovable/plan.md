
# Multi-Part Update: Certificates, Badges, Experience Tab, and Performance

This plan addresses four distinct improvements to make the app cleaner, faster, and more aligned with the product philosophy.

---

## Overview

| Area | Change |
|------|--------|
| Certificate Design | Remove badges/XP sections, make user's name and commitment text most prominent |
| Badge System | Simplify to philosophy-aligned badges, remove streak-based gamification |
| Experience Tab | Remove "Cost of Inaction" module |
| App Performance | Prioritize essential data loading with background fetching for secondary data |

---

## 1. Certificate Design Update

**Goal**: Make the certificate feel personal and achievement-focused, not gamified.

**Current State**: The certificate includes:
- Left side: "Badges Earned" section with 8 badge slots
- Right side: "Momentum" section with XP and Level display
- Center: User name and commitment quote

**New Design**: Clean, name-focused certificate that emphasizes:
- User's name (larger, more prominent)
- The commitment statement
- The 5 Controllables section
- Date range and verification

**Changes to `supabase/functions/generate-certificate/index.ts`**:
- Remove the left-side "Badges Earned" section (lines 357-369)
- Remove the right-side "Momentum/XP/Level" section (lines 371-403)
- Increase user name font size from 42px to 52px
- Make commitment statement more prominent (increase font from 18px to 20px)
- Center the layout now that side columns are removed
- Keep the 5 Controllables, date range, and verification sections

---

## 2. Badge System Philosophy Update

**Goal**: Align badges with meaningful moments, not counts or streaks.

**Current State** (`src/lib/badges.ts`):
- 12 badges total including 3 streak-based badges:
  - `foundation_streak_2` (2 consecutive snapshots)
  - `foundation_streak_3` (3 consecutive snapshots)
  - `foundation_streak_5` (5 consecutive snapshots)

**New State**: 
- Remove the 3 streak-based badges (they encourage gamification over meaning)
- Keep the 8 philosophy-aligned badges that mark genuine moments:
  - `chose_quest`, `returned`, `kept_promise`, `respecd`
  - `paused_reacting`, `completed_reset`, `protected_time`, `asked_guidance`
- Add 1 new meaningful badge:
  - `snapshot_explorer` (already defined but not in certificate logic)

**Files to update**:
- `src/lib/badges.ts`: Remove streak badges from the type and BADGES object
- `src/components/experience/BadgesEarned.tsx`: Update the "locked badges hint" count from 8 to the new total (9)
- `supabase/functions/generate-certificate/index.ts`: Remove ALL_BADGES constant (no longer needed since badges aren't on certificate)

---

## 3. Remove "Cost of Inaction" Module

**Goal**: Reduce negative reinforcement and simplify the Experience tab.

**Current Location**: `src/pages/Dashboard.tsx` lines 1162-1184

**Changes**:
- Remove the `LazyMomentumDecay` component import and usage from Dashboard.tsx
- Remove the import from `src/components/experience/LazyExperienceComponents.tsx`
- Keep the `MomentumDecay.tsx` file for now (can be deleted later if confirmed unused)

---

## 4. App Speed and Loading Optimizations

**Goal**: Essential data first, secondary data in background. Create a snappy perceived experience.

### 4.1 Dashboard Data Prioritization

**Current State**: `useDashboardSummary` fetches all data in one edge function call.

**Optimization Strategy** - Split into tiers:

**Tier 1 - Critical (blocks render)**:
- Active session status
- Today's check-in status
- User profile (display name)

**Tier 2 - Important (load immediately after)**:
- Active quest
- Pending promises
- Today's time log

**Tier 3 - Background (lazy load)**:
- XP logs (full history)
- Integrity logs (30-day history)
- All reset sessions (for Experience tab)
- Badges

### 4.2 Implementation Changes

**`src/pages/Dashboard.tsx`**:
- Add `staleTime` to queries that don't need real-time updates
- Defer Experience tab data loading until tab is selected
- Use `suspense: false` for non-critical queries

**`src/hooks/useDashboardSummary.ts`**:
- Already has `staleTime: 60 * 1000` - good baseline
- Add `refetchOnMount: false` for stable data

**`src/components/experience/LazyExperienceComponents.tsx`**:
- Already lazy loading - maintain this pattern
- Experience tab data should only load when tab is activated

### 4.3 Specific Optimizations

1. **Defer all-sessions query** until Experience tab is opened:
```text
const { data: allSessions } = useQuery({
  ...
  enabled: !!user?.id && activeTab === "experience",
});
```

2. **Defer all-completed-days query** similarly:
```text
const { data: allCompletedDays } = useQuery({
  ...
  enabled: !!user?.id && activeTab === "experience",
});
```

3. **Add skeleton fallbacks** when data is still loading (already partially implemented)

4. **Prefetch on tab hover** for smoother transitions (optional enhancement)

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-certificate/index.ts` | Remove badges/XP sections from SVG, enlarge name |
| `src/lib/badges.ts` | Remove 3 streak-based badges |
| `src/components/experience/BadgesEarned.tsx` | Update locked badge count |
| `src/components/experience/LazyExperienceComponents.tsx` | Remove MomentumDecay export |
| `src/pages/Dashboard.tsx` | Remove MomentumDecay usage, defer Experience queries |

---

## Technical Details

### Certificate SVG Changes (generate-certificate/index.ts)

**Remove**:
- Lines 240-261: `badgesSvg` generation
- Lines 357-369: Left side badges section
- Lines 371-403: Right side momentum/XP section

**Update**:
- Line 346: User name font size from `font-size="42"` to `font-size="52"`
- Lines 350-355: Commitment statement font size from `font-size="18"` to `font-size="20"`

### Badge Type Cleanup (badges.ts)

**Remove from BadgeKey type**:
```text
| "foundation_streak_2"
| "foundation_streak_3"
| "foundation_streak_5"
```

**Remove from BADGES object**:
- `foundation_streak_2` entry
- `foundation_streak_3` entry
- `foundation_streak_5` entry

### Dashboard Query Optimization

**Before** (always fetches):
```text
const { data: allSessions } = useQuery({
  enabled: !!user?.id,
  ...
});
```

**After** (deferred until needed):
```text
const { data: allSessions } = useQuery({
  enabled: !!user?.id && activeTab === "experience",
  ...
});
```

---

## Expected Outcomes

1. **Certificate**: Cleaner, more personal design focused on the user's name and commitment
2. **Badges**: Meaningful philosophy-aligned achievements only, no streak pressure
3. **Experience Tab**: Simpler, removes negative "Cost of Inaction" messaging
4. **Performance**: Dashboard feels snappier - essential data loads first, Experience tab data deferred

---

## Rollout Notes

- Certificate changes require edge function redeployment
- Existing certificates won't change (already generated)
- Badge changes are backward-compatible (existing streak badges in user_badges table won't break, just won't display)
- Performance changes are transparent to users
