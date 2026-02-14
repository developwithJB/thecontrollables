

# Experience Dashboard Enhancement -- Phase 1

## Scope

Four high-impact additions to the Experience tab, using only the user's own data (no cross-user benchmarks or aggregates).

```text
+------------------------------+-------------------------------+
|  1. Personal Insight Card    |  2. Insights at a Glance      |
|  (enhanced with gauge +      |  (new card: streak, best day, |
|   trend + focus breakdown)   |   trend, projected weeks)     |
+------------------------------+-------------------------------+
|  3. Interactive Activity     |  4. Rest Days Analytics       |
|  by Day (clickable circles,  |  (new card: rest compliance,  |
|   color intensity, drawer)   |   rest streak, next rest day) |
+------------------------------+-------------------------------+
```

---

## 1. Enhanced Personal Insight Card

**File:** New `src/components/experience/PersonalInsightCard.tsx`

A standalone card placed at the top of the Experience tab (after Time Cycles, before Snapshot History).

What it shows (all computed from the user's own `integrity_logs` data):

- **Circular progress gauge** for promise-keeping rate (e.g., 79%)
- **Trend indicator**: compare current month vs previous month ("up 8% from last month" or "down 3%")
- **Mini sparkline**: last 6 snapshot periods' promise-keeping rates (simple SVG line)
- **Expandable focus-area breakdown** (if `completed_actions` has controllable data):
  - Wellness: 82%, Habit: 76%, Awareness: 71%, Environment: 85%
- **Impact line**: "Your 79% rate earned you X XP" (calculated from integrity XP logs)

Data sources:
- `integrity_logs` table -- promised_at, kept, kept_at
- `completed_actions` table -- controllable field for breakdown
- `xp_logs` table -- for XP impact calculation

### 2. Insights at a Glance Card

**File:** New `src/components/experience/InsightsAtAGlance.tsx`

A compact summary card placed between Personal Insight and Snapshot History.

Metrics shown:
- Current streak (from `consecutiveStreak` already computed by dashboard-summary edge function)
- Longest streak (computed client-side from `daily_checkins` data)
- Best day of the week (from existing `WeeklyPatternView` logic, extracted)
- Trend vs last month (check-in count comparison)
- Projected weeks this year (simple linear projection from current pace)

All calculations use the user's own `daily_checkins`, `completed_actions`, and `xp_logs` data.

### 3. Interactive Activity by Day

**File:** Enhanced `src/components/experience/WeeklyPatternView.tsx`

Updates to the existing "Activity by Day" circles in the Patterns view:

- **Color-coded intensity**: circles go from light to dark based on activity level (already partially done via inline styles, will improve with better gradient steps)
- **Clickable circles**: tapping a day opens a small drawer/dialog showing:
  - List of actions completed on that day of the week
  - Average XP earned on that day
  - Number of check-ins on that day
- **Hover tooltip** (desktop): quick preview of day stats on hover using existing Tooltip component

### 4. Rest Days Analytics Card

**File:** New `src/components/experience/RestDaysCard.tsx`

A new card placed after Activity History in the Experience tab.

What it shows:
- Detected rest days (the 2 lowest-activity days from pattern data)
- Rest compliance this month (days where the user had no actions on their detected rest days, shown as a progress bar)
- Current rest streak (consecutive rest days honored)
- Next rest day (which upcoming day is a detected rest day)
- Whether user is currently in a "Rest Phase" (based on Time Cycles logic -- evening/night)

Data sources:
- `completed_actions` -- to detect which days have low/no activity
- `daily_checkins` -- to see which days the user checks in
- Pattern data already computed in `WeeklyPatternView`

---

## Component Rendering Order (Experience Tab)

```text
1. Header ("Experience" + subtitle)
2. TimeCycleCard (existing, free)
3. PersonalInsightCard (NEW -- paid only)
4. InsightsAtAGlance (NEW -- paid only)
5. SnapshotHistory / Your Story (existing)
6. Locked overlay or Badges (existing)
7. Activity History (existing, paid)
8. RestDaysCard (NEW -- paid only)
9. Certificates (existing, paid)
10. Journey Summary Footer (existing)
```

## Technical Details

### New files

| File | Purpose |
|------|---------|
| `src/components/experience/PersonalInsightCard.tsx` | Circular gauge + trend + breakdown |
| `src/components/experience/InsightsAtAGlance.tsx` | Compact streak/trend/projection card |
| `src/components/experience/RestDaysCard.tsx` | Rest day analytics |
| `src/components/experience/DayDetailDrawer.tsx` | Drawer for clicking a day circle |

### Modified files

| File | Change |
|------|--------|
| `src/components/experience/WeeklyPatternView.tsx` | Add click handlers, tooltips, color intensity |
| `src/components/experience/LazyExperienceComponents.tsx` | Add lazy imports for new components |
| `src/pages/Dashboard.tsx` | Render new cards in Experience tab |

### Data fetching approach

- PersonalInsightCard and InsightsAtAGlance will use `useQuery` hooks to fetch `integrity_logs`, `daily_checkins`, and `completed_actions` with `staleTime: 5 * 60 * 1000`
- Queries only enabled when Experience tab is active (following existing Tier 3 deferred loading pattern)
- RestDaysCard reuses pattern data already fetched by WeeklyPatternView via shared query keys
- No new edge functions or database changes needed

### Circular progress gauge

Built with SVG -- a simple `<circle>` with `stroke-dasharray` and `stroke-dashoffset` for the animated fill. No new dependencies.

### No cross-user data

Per your preference, no "Top 35% of users" or "above platform average" benchmarks. All metrics are personal: your rate, your trend, your projection.

