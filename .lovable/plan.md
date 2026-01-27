
# UX Clarity & Trust Improvements Plan

## Overview
A focused update to improve daily orientation, reduce confusion, humanize language, and build trust through reliability. All changes preserve the calm philosophy while making the app more obvious and welcoming.

---

## 1. Daily Orientation - "One Thing" Anchor (CRITICAL)

### Current State
The `TodayActions` component shows a checklist of 3-6 items without clear priority hierarchy. Users report not knowing "what to do today."

### Implementation

**File: `src/components/dashboard/TodayActions.tsx`**

Add a highlighted "Primary Action" section at the top of the component:

```text
┌─────────────────────────────────────────┐
│  ✨ If you do one thing today, do this. │
│  ────────────────────────────────────── │
│  [Day 3: Habit 🦈] "Show up for 2 mins" │
│                             [Continue →]│
├─────────────────────────────────────────┤
│  Everything else is optional.           │
│  ○ Reflect on yesterday      2 min      │
│  ○ Review 1 promise          3 min      │
│  ○ Ask The Controllables     3 min      │
└─────────────────────────────────────────┘
```

**Logic:**
- Primary action = First incomplete action from: Check-in → Journey Action → Time Reflection
- Visually elevate with gradient border and larger text
- Secondary actions use smaller, muted styling
- Add "Everything else is optional." subtext between sections

**Changes:**
1. Add `getPrimaryAction()` function to identify the most important incomplete action
2. Render primary action in a highlighted card at top
3. Group remaining actions under "Optional" subheader
4. Style secondary items with muted colors and smaller text

---

## 2. Day 0 Orientation Screen (First-Time Only)

### Current State
New users go directly from Snapshot selection to Day 1. No explanation of how the app works.

### Implementation

**New File: `src/components/onboarding/OnboardingOrientation.tsx`**

A simple interstitial screen shown once before the first Day 1:

```text
┌─────────────────────────────────────────┐
│                                         │
│         Here's how this works           │
│                                         │
│    📸  One Snapshot per week            │
│                                         │
│    ⏱️  About 5 minutes per day          │
│                                         │
│    📅  No catching up. Just today.      │
│                                         │
│              [Start Day 1]              │
│                                         │
└─────────────────────────────────────────┘
```

**Files to modify:**
- `src/components/onboarding/OnboardingFlow.tsx` - Add "orientation" step between journey_selection and starting
- `src/components/onboarding/index.ts` - Export new component
- `src/hooks/useOnboarding.ts` - Track orientation_seen in onboarding progress

**Logic:**
- Only shown once per user (tracked in `user_onboarding.features_unlocked.orientation_seen`)
- Simple 3-bullet layout with icons
- Single CTA button that triggers the existing "starting" flow

---

## 3. Terminology Cleanup - Foundation → Snapshot

### Current State
Several files still use "Foundation" terminology instead of "Snapshot":

### Files to Update

| File | Change |
|------|--------|
| `src/lib/badges.ts` | Rename `foundation_streak_*` to `snapshot_streak_*`, update names/descriptions |
| `src/components/dashboard/ResetProgressModule.tsx` | Replace "7-Day Foundation" with "7-Day Snapshot", "Start New Foundation" → "Start New Snapshot" |
| `src/components/dashboard/JourneySwitcher.tsx` | "Update Your Mission?" → "Update Your Focus?" |
| `src/lib/snapshots.ts` | Rename `getRecommendedNextFoundation` to `getRecommendedNextSnapshot` |
| `src/components/Day7Complete.tsx` | Update import and function name |
| `src/components/landing/FeatureGrid.tsx` | Keep "Adaptive Snapshots" (already correct) |

**Note:** Database column `foundation_level` will remain unchanged to avoid migration complexity, but all user-facing copy will use "Snapshot."

---

## 4. Build Assessment Language Simplification

### Current State
Some questions use philosophical/abstract language that confuses users.

### Questions to Rewrite (via database update)

| ID | Current | Proposed Rewrite |
|----|---------|------------------|
| E3 | "My digital inputs are intentional, not default." | "I often scroll or check my phone without meaning to." (inverted) |
| A3 | "I recognize when I'm acting from fear, ego, or impulse." | "I can tell when I'm reacting instead of choosing." |
| P3 | "I interpret challenges as part of a longer story." | "When things go wrong, I remind myself it's temporary." |
| H3 | "I focus on reps instead of outcomes." | "I show up even when I can't see results yet." |
| A1 | "I notice my thoughts before acting on them." | "I catch myself before reacting automatically." |

**Implementation:**
- Create a database migration to UPDATE these 5 prompts
- Questions will now follow the rule: "One idea per sentence, everyday language"
- Answer options already work well (Rarely/Sometimes/Often/Always)

---

## 5. Email Nudges (Opt-In)

### Database Changes

Add columns to `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN email_nudge_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN email_nudge_time TEXT DEFAULT 'morning'; -- 'morning' or 'evening'
ALTER TABLE profiles ADD COLUMN timezone TEXT;
```

### Backend Implementation

**New Edge Function: `supabase/functions/send-daily-nudge/index.ts`**

- Triggered by cron job (Supabase pg_cron)
- Two scheduled jobs: 7am nudges, 7pm nudges (user's local time)
- Queries users where `email_nudge_enabled = true` and matches nudge time
- Uses Resend API (existing RESEND_API_KEY secret required)
- One email per user per day max

**Email Templates (minimal):**
```text
Subject: "Your Snapshot is ready"
Body: "Just do today. That's it."
[Open Today's Actions →]
---
Turn off anytime.
```

### Frontend Implementation

**Update: `src/components/ProfileSettingsModal.tsx`**

Add toggle section:
```text
Would you like a gentle daily nudge?
[ ] Enable email nudges
    ○ Morning (7am)  ● Evening (7pm)
```

---

## 6. Reduce "AI Vibes" in Copy

### Files to Update

| File | Current | Replacement |
|------|---------|-------------|
| `src/pages/Landing.tsx` | Comment "Adaptive Intelligence" | "How it helps" |
| `src/components/landing/FeatureGrid.tsx` | "This dashboard adapts to you" | "Over time, patterns emerge" |
| `src/components/landing/FeatureGrid.tsx` | "Adaptive Snapshots" | "Weekly Snapshots" |
| `src/components/dashboard/AIGuidePanel.tsx` | Keep "The Controllables" branding | (No change needed) |
| `src/hooks/useGuideSession.ts` | Internal comment only | (No user-facing change) |

**Philosophy shift:**
- From: "The Dashboard learns your patterns"
- To: "The Dashboard notices what works for you"

---

## 7. Trust & Bug Prevention

### Input Reliability Audit

Review and ensure all input fields work correctly:

1. **Build Assessment** (`OnboardingAssessment.tsx`)
   - Verify answer selection triggers state update immediately
   - Add `autoFocus` to first interactive element
   - Ensure `disabled` states are removed promptly after loading

2. **Time Reflection** (`TimeCurrencyModule.tsx`)
   - Check slider responds to touch/click immediately
   - Verify notes textarea accepts input without delay

3. **Promise Input** (`IntegrityMeterModule.tsx`)
   - Ensure text input is never blocked by loading states
   - Add visual feedback on successful save

4. **Dashboard Loading**
   - Review `isAuthReady` gating in all interactive modules
   - Ensure skeleton states transition cleanly to interactive states
   - Add `data-testid` attributes for E2E test coverage

### Implementation
- Add console warnings for any module that stays in loading state > 5 seconds
- Ensure all mutation buttons show loading spinners during operation
- Test: Pull-to-refresh should complete within 8 seconds or show timeout message

---

## Implementation Order

| Phase | Tasks | Priority |
|-------|-------|----------|
| 1 | Daily Orientation ("One Thing" anchor) | CRITICAL |
| 2 | Day 0 Orientation Screen | HIGH |
| 3 | Terminology Cleanup (Foundation → Snapshot) | HIGH |
| 4 | Build Assessment Language Simplification | MEDIUM |
| 5 | Reduce AI Vibes in Copy | MEDIUM |
| 6 | Email Nudges (Opt-In) | LOW |
| 7 | Trust & Bug Audit | ONGOING |

---

## Files Summary

### New Files
- `src/components/onboarding/OnboardingOrientation.tsx`
- `supabase/functions/send-daily-nudge/index.ts`

### Modified Files
- `src/components/dashboard/TodayActions.tsx` (Primary action highlight)
- `src/components/onboarding/OnboardingFlow.tsx` (Add orientation step)
- `src/components/ProfileSettingsModal.tsx` (Email nudge settings)
- `src/lib/badges.ts` (Terminology update)
- `src/components/dashboard/ResetProgressModule.tsx` (Terminology update)
- `src/components/dashboard/JourneySwitcher.tsx` (Terminology update)
- `src/lib/snapshots.ts` (Rename function)
- `src/components/Day7Complete.tsx` (Import update)
- `src/pages/Landing.tsx` (Copy update)
- `src/components/landing/FeatureGrid.tsx` (Copy update)

### Database Changes
- Add columns to `profiles`: `email_nudge_enabled`, `email_nudge_time`, `timezone`
- Update 5 rows in `build_questions` with simplified prompts

---

## Success Metrics

After implementation, verify:

1. **3-Second Clarity Test**: A new user can answer "What do I do today?" within 3 seconds of viewing the dashboard
2. **Return Safety**: Missed day messaging emphasizes "welcome back" over "you missed"
3. **Input Reliability**: All text inputs respond to typing within 100ms
4. **Human Tone**: No user-facing copy contains "adapts", "learns", or "intelligence"
5. **Email Opt-In**: < 5% of users enable nudges (confirms it's truly optional)
