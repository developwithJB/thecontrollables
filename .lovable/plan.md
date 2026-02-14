

# User Pattern Analysis and Drop-Off Hardening Plan

## Data Summary (Last 30 Days)

```text
FULL FUNNEL (25 users total)
=======================================================
Landing Page Views:     1,315 views / 680 sessions
Auth Page Views:        16 views / 16 sessions         
Signups:                25 accounts created             
Onboarding Completed:   16 (64%)                        <<< DROP 1: 9 users stuck
Snapshots Started:      21 users (84% of signups)
Day 1 Completed:        18 users
Day 2 Completed:        10 users                        <<< DROP 2: 44% gone after Day 1
Day 3-5:                6-10 users
Day 7 Completed:        8 users
Snapshot Completed:     7 users (33% of starters)        <<< DROP 3: 2/3 never finish

Users with no display_name: 17 out of 25 (68%)          <<< RED FLAG
```

---

## Key Drop-Off Points

### DROP 1: Onboarding (36% never complete it)
- 6 users stuck at `build_assessment` -- they either abandoned the 20-question quiz or hit an error
- 1 stuck at `archetype_result`, 1 at `journey_selection`
- The 24-hour auto-recovery we just added will help future users, but the assessment itself may be too long

### DROP 2: Day 1 to Day 2 (44% never return)
- 18 users complete Day 1, only 10 come back for Day 2
- 8 users did Day 1 and never returned -- this is the biggest leak
- 3 of those users only spent ~1 minute total (did the reset and left)

### DROP 3: Snapshot completion (only 33% finish)
- Of 21 users who started snapshots, only 7 completed one
- Day 4-5 is where most drop off (10 users at Day 3, down to 6 by Day 5)

### RED FLAG: 68% of users have no display name
- 17 out of 25 profiles have `display_name: null`
- This means the signup form either doesn't collect it, or the `handle_new_user` trigger isn't picking it up
- Affects personalization (greeting banner, certificates, AI conversations)

---

## Proposed Fixes (Priority Order)

### 1. Collect Display Name During Signup (Critical)
68% of users have no name. The greeting banner says "Welcome back" with no name, certificates are blank, and AI chat has no context. The signup form needs a required "Name" field that passes to `raw_user_meta_data.display_name`.

**Files:** `src/pages/Auth.tsx`

### 2. Add a "Quick Start" Assessment Option (High)
The 20-question Build Assessment is the #1 onboarding blocker. 36% of users never get past it. Add a prominent "Skip assessment and start now" option at the TOP of the assessment (not buried at the bottom), with copy like "You can always take this later from your dashboard."

**Files:** `src/components/onboarding/OnboardingAssessment.tsx`

### 3. Day 1 Completion Nudge Copy (High)
After completing Day 1, users see the dashboard but there's no clear "See you tomorrow" message or hook. Add a brief completion state to the Today's Actions section when all tasks are done: "Day 1 done. Come back tomorrow -- same time, same place." with a calendar reminder CTA.

**Files:** `src/components/dashboard/TodayActions.tsx`

### 4. Track Day-by-Day Retention Events (Medium)
Currently we can count daily_resets per day_number but can't see the TIME between Day 1 and Day 2 visits, or what users do when they return. Add a `daily_return` event that fires when a user opens the dashboard, capturing `days_since_last_visit` and `current_snapshot_day`.

**Files:** `src/pages/Dashboard.tsx`, `src/hooks/useAnalytics.ts`

### 5. Add Onboarding Funnel Dashboard to Admin (Medium)
The admin panel tracks "Free Trial Funnel" but doesn't show the full onboarding funnel. Add a section showing: Landing Views -> Auth Views -> Signups -> Assessment Complete -> Snapshot Started -> Day 1 Done. This lets you monitor drop-off in real time as you promote.

**Files:** `src/pages/Admin.tsx`

### 6. Harden Empty States (Low)
Users with no activity data see potentially broken or confusing empty states in the Experience tab, Snapshot History, and Patterns view. Audit these components to ensure they show helpful "Start your first Snapshot" messaging rather than empty cards.

**Files:** `src/components/experience/*`, `src/components/dashboard/SnapshotHistory.tsx`

---

## Technical Details

### Changes by file:

1. **`src/pages/Auth.tsx`**
   - Add a "Display Name" input field to the signup form
   - Pass `display_name` in `options.data` during `signUp()`
   - Make the field required with validation

2. **`src/components/onboarding/OnboardingAssessment.tsx`**
   - Add a prominent "Skip and start now" button at the top of the assessment, before the first question
   - Style it as a secondary action but make it visible

3. **`src/components/dashboard/TodayActions.tsx`**
   - When all today's actions are complete, show a "Day X done" celebration micro-state
   - Include "See you tomorrow" copy and optional calendar reminder button

4. **`src/pages/Dashboard.tsx`**
   - Track `daily_return` event on mount with `days_since_last_visit` metadata
   - Use last activity timestamp from dashboard summary

5. **`src/pages/Admin.tsx`**
   - Add "Onboarding Funnel" card querying page_views, app_events, user_onboarding, and reset_sessions
   - Show conversion rates between each step

6. **`src/components/experience/*`**
   - Audit empty states in ActivityHistory, SnapshotHistory, BadgesEarned
   - Replace blank/broken states with guided CTAs

### No new database tables needed. No new dependencies.

