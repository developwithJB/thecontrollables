

# Dashboard Polish Pass

After reviewing the full dashboard codebase, here are the issues and improvements to address:

## Terminology & Copy Issues

1. **Experience tab footer says "Resets" instead of "Snapshots"** (line 1377 of Dashboard.tsx) — The app unified on "Snapshot" terminology but this footer still reads `{allSessions.length} Resets`. Should be "Snapshots".

2. **Share text references "thedashboard.agbcoaching.com"** (SnapshotReviewCard.tsx line 239) — Should reference the published URL `thecontrollables.lovable.app` or the proper domain. Also the hashtag says `#TheDashboard` which is inconsistent with the product name.

3. **Duplicate "Designed for intentional check-ins" microcopy** — This text appears both in the GreetingBanner (for visitCount <= 5, line 159) and in the footer (for visitCount > 5, line 1398). Users with exactly 5 visits would see it twice. The logic should be mutually exclusive and it already is (<=5 vs >5), but the same copy appearing in two places feels redundant. The footer one can be simplified or differentiated.

## Layout & Visual Polish

4. **Growth Summary Card never rendered** — `GrowthSummaryCard` is imported (line 57) but never actually used anywhere in the Dashboard render. It was mentioned in memory as appearing on Day 3+. Either wire it up or remove the dead import.

5. **Tab glow effect hardcoded color** — The active tab uses `shadow-[0_0_12px_rgba(102,189,239,0.3)]` which is a hardcoded blue rather than using the theme's accent color variable. Should use a CSS variable or Tailwind class for consistency across light/dark themes.

6. **Footer "Resets" label in Experience summary** — Same terminology issue; the journey summary footer at the bottom of the Experience tab says "Resets" and "Days Logged" — should say "Snapshots" and "Days Checked In" for consistency.

## Functional Polish

7. **`todayXpEarned` calculation uses ISO date, not local date** — Dashboard line 942 uses `todayLocal` (local YYYY-MM-DD) but `xpLogs[].created_at` is a UTC timestamp. `.startsWith(todayLocal)` could miss XP earned in certain timezones. Should convert `created_at` to local date before comparing.

8. **XpMomentumModule uses `toISOString()` for today** — Line 44 of XpMomentumModule uses `new Date().toISOString().split("T")[0]` which is UTC, not local time. Same timezone mismatch as above.

9. **`BuildEntryPoint` reads localStorage synchronously in `useState` initializer** — Line 18-20 doesn't wrap in try/catch. If localStorage is blocked (private browsing in some browsers), this could throw. Should be wrapped.

## Dead Code Cleanup

10. **Unused `greeting` function** — Dashboard line 750-755 defines a `greeting()` function that is never called (the `GreetingBanner` component handles greetings). Remove it.

11. **Unused import `GrowthSummaryCard`** — Imported but never rendered. Remove.

## Implementation Plan

### Step 1: Terminology fixes
- Dashboard.tsx line 1377: Change "Resets" to "Snapshots"
- SnapshotReviewCard.tsx line 239-240: Update share URL and hashtag
- Experience footer: "Days Logged" to "Days Checked In"

### Step 2: Dead code cleanup
- Remove unused `greeting()` function (lines 750-755)
- Remove `GrowthSummaryCard` import (line 57) if not wiring it up

### Step 3: Timezone fix for XP calculations
- Dashboard todayXpEarned: convert `created_at` to local date
- XpMomentumModule: use local date for today's XP calculation

### Step 4: Minor robustness
- BuildEntryPoint: wrap localStorage read in try/catch
- SnapshotReviewCard share text: use correct domain

### Step 5: Tab styling
- Replace hardcoded shadow color with theme-aware value

