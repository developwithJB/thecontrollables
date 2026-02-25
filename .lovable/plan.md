

# Full Free 7-Day Trial + Adaptive Dashboard

## Current State

Right now, free users are heavily restricted from day one: AI Companions are locked behind a paywall overlay, Experience History is gated, and the free trial only allows 1 snapshot with minimal AI interaction (1 message/day). The dashboard is static -- it shows the same modules regardless of how far the user has progressed.

Additionally, the AI chat edge function references database columns (`query_count`, `month`, `token_count`) that don't exist in the `ai_usage_logs` table (which has `usage_date` and `message_count`). This means AI usage tracking is currently broken in production.

---

## Part 1: Full Free 7-Day Trial with Limited AI

### Philosophy
Give users the FULL experience during their first 7-day Snapshot -- all modules unlocked, AI Companions accessible, Experience tab functional. The only limit is AI message count (e.g., 5 messages/day during trial vs 25 for paid). After the trial ends, the paywall gates kick in.

### Changes

**A. New entitlement concept: `isInActiveTrial`**

File: `src/lib/entitlements.ts`
- Add `isInActiveTrial(tier, hasActiveSession, sessionCount)` -- returns `true` when the user is free, has an active (not completed/expired) session, and `sessionCount < allowance`
- Update `isFeatureLocked` to accept an optional `isTrialing` flag that unlocks features during trial

**B. Update `useEntitlements` hook**
File: `src/hooks/useEntitlements.ts`
- Expose `isTrialing` boolean derived from `isInActiveTrial()`
- The Dashboard already has `activeSession`, `isCompleted`, `isExpired`, and `allSessions` -- wire these into the trial check

**C. Update Dashboard gating logic**
File: `src/pages/Dashboard.tsx`
- Replace `isPaid` checks with `isPaid || isTrialing` for:
  - AI Guide Panel (remove LockedOverlay during trial)
  - Experience tab components (unlock history view during trial)
  - Weekly Insight in GreetingBanner
- Keep post-trial lockdown exactly as-is (SnapshotReviewCard + upgrade prompts)

**D. AI Message Limits for Trial Users**
File: `src/components/dashboard/AIGuidePanel.tsx`
- Change `FREE_PREVIEW_LIMIT` from 1 to 5 (5 messages/day during active trial)
- When trial is over (no active session), revert to 0 messages (fully locked)
- Add a "X of 5 messages remaining today" counter visible to trial users
- Show a soft upsell after the 3rd message: "Enjoying The Controllables? Unlimited with Full Access."

**E. Fix AI Usage Tracking (Critical Bug)**
File: `supabase/functions/ai-chat/index.ts`
- The edge function references `query_count`, `month`, `token_count` columns that don't exist
- The actual table has `usage_date` (date) and `message_count` (integer)
- Rewrite `checkAndUpdateMonthlyUsage` to use the real schema: query by `usage_date` instead of `month`, increment `message_count` instead of `query_count`
- Remove `updateTokenUsage` function (no `token_count` column exists)
- Change the limit model from monthly to daily (5/day free trial, 25/day paid) to match the existing `usage_date`-based schema

**F. Database migration: Add `query_count` and `month` columns OR fix edge function**
- Preferred approach: Fix the edge function to use existing columns (`usage_date`, `message_count`) rather than adding new columns. This avoids schema bloat and matches the original daily-tracking design.

---

## Part 2: Payment Gateways and Blockers

### Post-Trial Paywall Flow
When the free 7-day Snapshot completes or expires:

**A. Dashboard lockdown (already partially exists)**
- SnapshotReviewCard already shows -- keep this
- Today Actions: disable "Start Day" button, show upgrade prompt
- AI Guide Panel: show LockedOverlay (already works when `isPaid=false` and no trial)

**B. New: Trial Completion Interstitial**
File: `src/components/dashboard/TrialCompleteCard.tsx` (new)
- A prominent card shown at the top of the Dashboard after trial ends
- Shows: snapshot summary (days completed, XP earned, actions taken)
- Copy: "Your 7-Day Snapshot is complete. Here's what you built."
- CTA: "Continue Your Journey" (links to checkout)
- Dismissible but re-appears on each visit until upgraded

**C. Experience Tab Post-Trial**
- During trial: fully accessible
- After trial: Snapshot History (Your Story) and Time Cycle remain visible (read-only proof of progress)
- Certificates, Badges, Momentum Decay: locked behind paywall
- AI insights: locked

---

## Part 3: Dashboard That Learns and Grows

### Adaptive Dashboard Modules

**A. Contextual Greeting Messages**
File: `src/components/dashboard/GreetingBanner.tsx`
- Replace static greeting with context-aware messages based on user data:
  - Day 1: "Welcome to your first Snapshot. One day at a time."
  - Day 3 (after Build assessment): "Your Build shows [archetype]. Here's what that means today."
  - Day 5+: Reference streak, strongest controllable, or recent pattern
  - Returning user (day gap): "You've been away X days. Pick up where you left off."
  - Post-trial: "You completed your Snapshot. Ready for the next chapter?"
- Use existing data: `currentDay`, `currentBuild`, `streakDays`, `visitCount`, `daysSinceLastAction`

**B. Progressive Module Unlocking**
File: `src/pages/Dashboard.tsx`
- Day 1-2: Show only Mission + Today Actions + Snapshot Progress (focus on orientation)
- Day 3+: Reveal Build Overview and XP Momentum (after first assessment)
- Day 4+: Reveal Time Currency and Integrity Meter
- Day 5+: Surface The Controllables AI panel more prominently
- This uses the existing `currentDay` and `completedDaysCount` data -- no new queries needed

**C. Dynamic "Your Growth" Summary**
File: `src/components/dashboard/GrowthSummaryCard.tsx` (new)
- A card that appears after Day 3 showing:
  - "You've earned X XP across Y actions"
  - "Your strongest controllable: [name]" (from Build scores)
  - "Streak: X days" 
  - Comparison to Day 1 if Build assessment was retaken
- Uses existing `totalXp`, `currentBuild`, `consecutiveStreak` -- no new queries

**D. Smart Nudges Based on Missing Actions**
File: `src/components/dashboard/TodayActions.tsx`
- If user hasn't logged time by afternoon: surface Time Currency more prominently
- If user hasn't made a promise in 2+ days: highlight Integrity Meter
- If user hasn't talked to The Controllables this session: add a contextual prompt
- All based on existing data (todayTimeLogged, todayPromiseMade, askGuideCompleted)

---

## Technical Summary

| File | Change |
|------|--------|
| `src/lib/entitlements.ts` | Add `isInActiveTrial()` function |
| `src/hooks/useEntitlements.ts` | Expose `isTrialing` boolean |
| `src/pages/Dashboard.tsx` | Wire trial state, progressive module visibility |
| `src/components/dashboard/AIGuidePanel.tsx` | 5 msg/day trial limit, counter, soft upsell |
| `src/components/dashboard/GreetingBanner.tsx` | Context-aware greeting messages |
| `src/components/dashboard/TrialCompleteCard.tsx` | New post-trial summary + CTA |
| `src/components/dashboard/GrowthSummaryCard.tsx` | New adaptive growth card |
| `src/components/dashboard/TodayActions.tsx` | Smart nudges for missing actions |
| `supabase/functions/ai-chat/index.ts` | Fix broken usage tracking (use real schema) |

No database migrations needed -- all changes use existing tables and columns.

