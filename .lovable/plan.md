
# Free Trial Lockdown + Admin Tracking Update

## Problem Analysis

The current implementation has a significant loophole:

1. **Free trial bypass via "Change Focus"**: When a free user (`freetest@test.com`) completes their 7-day snapshot, they can still:
   - Open the SnapshotSelector and click "Change Focus"
   - This creates a new journey_changes record and triggers new "Today's Actions"
   - They can repeat this loop indefinitely, getting ongoing engagement without paying

2. **Missing enforcement**: The `multipleResets` paid feature is defined in `src/lib/entitlements.ts` but is ONLY enforced in `useReset.ts` when starting a NEW session—not when changing focus or accessing other interactive features.

3. **Admin tracking gaps**: The analytics in `admin-users/index.ts` doesn't specifically track free trial usage, conversion attempts, or post-trial behavior.

---

## Solution Overview

| Component | Change |
|-----------|--------|
| **Free Trial Lockdown** | Block all interactive features for free users who have used their snapshot |
| **Post-Trial Experience** | Show review-only state with one-time AI insight and upgrade CTA |
| **SnapshotSelector** | Hide "Change Focus" for free users with completed snapshot |
| **TodayActions** | Show locked/review state for post-trial users |
| **SnapshotReviewCard** | Show AI insight for ALL users (one-time generation) |
| **Admin Tracking** | Add free trial funnel metrics and post-trial behavior tracking |

---

## Detailed Implementation

### 1. Add Free Trial Consumption Tracking

**New concept**: `hasUsedFreeTrial` = user is NOT paid AND has 1+ reset_sessions (any status)

**Files to update**:

**`src/lib/entitlements.ts`**:
```typescript
/**
 * Check if free user has consumed their trial
 * A free trial is "used" when a user has ANY reset session (started, completed, expired, or paused)
 */
export const hasUsedFreeTrial = (isPaid: boolean, sessionCount: number): boolean => {
  if (isPaid) return false;
  return sessionCount >= 1;
};

/**
 * Check if free user can start a new snapshot
 */
export const canStartNewSnapshot = (isPaid: boolean, sessionCount: number): boolean => {
  if (isPaid) return true;
  return sessionCount < 1;
};

/**
 * Check if free user can modify their current snapshot (change focus)
 */
export const canModifySnapshot = (isPaid: boolean, sessionCount: number): boolean => {
  // Free users with a completed/expired session cannot modify
  // Only paid users or free users on their first active snapshot can modify
  if (isPaid) return true;
  return sessionCount < 1;
};
```

### 2. Lock Down SnapshotSelector for Post-Trial Users

**File**: `src/components/dashboard/SnapshotSelector.tsx`

**Changes**:
- Add `isPaid` and `hasUsedFreeTrial` props
- Hide "Change Focus" button when `hasUsedFreeTrial && !isPaid`
- Show locked state with upgrade CTA instead

**Before (line 451)**:
```typescript
<Button variant="outline" className="w-full" onClick={() => setViewMode("browse")}>
  Change Focus
  <ChevronRight className="w-4 h-4 ml-2" />
</Button>
```

**After**:
```typescript
{isPaid || !hasUsedFreeTrial ? (
  <Button variant="outline" className="w-full" onClick={() => setViewMode("browse")}>
    Change Focus
    <ChevronRight className="w-4 h-4 ml-2" />
  </Button>
) : (
  <Button 
    variant="outline" 
    className="w-full border-amber-500/30 text-amber-600 dark:text-amber-400"
    onClick={onUpgrade}
  >
    <Lock className="w-4 h-4 mr-2" />
    Upgrade to Change Focus
    <ChevronRight className="w-4 h-4 ml-2" />
  </Button>
)}
```

### 3. Update Dashboard.tsx Rendering Logic

**File**: `src/pages/Dashboard.tsx`

**Changes**:
- Pass `isPaid` and `hasUsedFreeTrial` to SnapshotSelector
- Only render SnapshotSelector's browsing capability if user is allowed
- Block `onStartNewSnapshot` callback in SnapshotReviewCard for post-trial users

**Key logic update (around line 852-866)**:
```typescript
{/* Snapshot Selector - only allow modifications if not post-trial */}
{activeSession && !isCompleted && user?.id && (
  <SnapshotSelector
    currentSnapshotId={activeSession.journey_id}
    sessionId={activeSession.id}
    currentDay={currentDay}
    userId={user.id}
    isPaid={isPaid}
    hasUsedFreeTrial={!isPaid && allSessions.length >= 1}
    onSnapshotChanged={...}
    onUpgrade={() => initiateCheckout("monthly")}
    isOpen={showJourneySwitcher}
    onOpenChange={setShowJourneySwitcher}
  />
)}
```

**SnapshotReviewCard update (around line 751-758)**:
```typescript
<SnapshotReviewCard
  userId={user.id}
  isPaid={isPaid}
  // Only allow starting new snapshot if paid
  onStartNewSnapshot={isPaid ? () => setShowJourneySwitcher(true) : undefined}
  onUpgrade={() => initiateCheckout("monthly")}
/>
```

### 4. Update TodayActions for Post-Trial State

**File**: `src/components/dashboard/TodayActions.tsx`

When `hasUsedFreeReset` is true AND there's no active session (or session is completed), show a simplified "Review" state instead of interactive actions:

**New locked state UI**:
- Gray out all action items
- Replace action buttons with "Unlock with Upgrade" CTAs
- Show message: "Your free 7-day snapshot is complete. Upgrade to continue building proof."

### 5. One-Time AI Insight for ALL Users

**File**: `src/components/dashboard/SnapshotReviewCard.tsx`

Currently, the AI insight (line 376-399) only shows for paid users. Update to:
- Generate ONE insight for free users too (stored in database)
- Free users see the insight but can't get more
- Add messaging: "This is your one free insight from The Controllables"

**Changes**:
```typescript
// Line 376-399 update
{snapshotInsight?.insight && (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
    <p className="text-sm text-foreground italic">
      "{snapshotInsight.insight}"
    </p>
    <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
      <span>{guide.emoji}</span>
      <span>— {guide.name}</span>
    </p>
    {!isPaid && (
      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
        Your complimentary insight from The Controllables
      </p>
    )}
  </div>
)}
```

**File**: `src/hooks/useSnapshotInsight.ts`

Update to generate insight for free users too (only once per session):
```typescript
// Remove the isPaid gate for generation, but still track it was free
export const useSnapshotInsight = (
  userId: string | undefined,
  sessionId: string | undefined,
  isPaid: boolean,
  snapshot?: { id: string; name: string; focus: string }
) => {
  // Generate for all users, not just paid
  // The edge function will store it, so it's only generated once
  ...
}
```

### 6. Admin Tracking Updates

**File**: `supabase/functions/admin-users/index.ts`

Add new analytics for free trial tracking:

```typescript
// In the analytics_summary section, add:

// Free trial metrics
const { data: allResetSessions } = await adminClient
  .from("reset_sessions")
  .select("user_id, status, created_at");

const { data: entitlements } = await adminClient
  .from("user_entitlements")
  .select("user_id");

const paidUserIds = new Set(entitlements?.map(e => e.user_id) || []);

// Users who started a free trial (have at least 1 reset session, no entitlement)
const freeTrialStarted = [...new Set(
  allResetSessions
    ?.filter(s => !paidUserIds.has(s.user_id))
    .map(s => s.user_id) || []
)].length;

// Users who completed a free trial (completed status, no entitlement)
const freeTrialCompleted = [...new Set(
  allResetSessions
    ?.filter(s => s.status === "completed" && !paidUserIds.has(s.user_id))
    .map(s => s.user_id) || []
)].length;

// Conversion: free trial → paid (users who have both a reset session AND an entitlement)
const convertedUsers = [...new Set(
  allResetSessions
    ?.filter(s => paidUserIds.has(s.user_id))
    .map(s => s.user_id) || []
)].length;

const freeTrialMetrics = {
  started: freeTrialStarted,
  completed: freeTrialCompleted,
  converted: convertedUsers,
  conversionRate: freeTrialCompleted > 0 
    ? Math.round((convertedUsers / freeTrialCompleted) * 100) 
    : 0,
  activeFreeTrial: freeTrialStarted - freeTrialCompleted - convertedUsers,
};
```

**File**: `src/pages/Admin.tsx`

Add free trial funnel visualization:

```typescript
// In the overview tab, add:
<Card>
  <CardHeader>
    <CardTitle>Free Trial Funnel</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span>Started Free Trial</span>
        <span className="font-bold">{summary?.freeTrialMetrics?.started || 0}</span>
      </div>
      <div className="flex justify-between items-center">
        <span>Completed 7-Day Snapshot</span>
        <span className="font-bold">{summary?.freeTrialMetrics?.completed || 0}</span>
      </div>
      <div className="flex justify-between items-center">
        <span>Converted to Paid</span>
        <span className="font-bold text-emerald-500">{summary?.freeTrialMetrics?.converted || 0}</span>
      </div>
      <div className="pt-2 border-t">
        <span className="text-muted-foreground">Conversion Rate: </span>
        <span className="font-bold">{summary?.freeTrialMetrics?.conversionRate || 0}%</span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/entitlements.ts` | Add `hasUsedFreeTrial`, `canStartNewSnapshot`, `canModifySnapshot` helpers |
| `src/components/dashboard/SnapshotSelector.tsx` | Add `isPaid`, `hasUsedFreeTrial`, `onUpgrade` props; lock "Change Focus" for post-trial users |
| `src/pages/Dashboard.tsx` | Pass new props to SnapshotSelector and SnapshotReviewCard; conditionally render features |
| `src/components/dashboard/SnapshotReviewCard.tsx` | Show AI insight for free users (one-time); conditionally show "Start Next Snapshot" |
| `src/components/dashboard/TodayActions.tsx` | Show locked state for post-trial free users |
| `src/hooks/useSnapshotInsight.ts` | Allow insight generation for free users (once per session) |
| `supabase/functions/admin-users/index.ts` | Add free trial funnel metrics |
| `src/pages/Admin.tsx` | Add free trial funnel visualization card |

---

## Post-Trial UX Flow

```text
Free User After Completing Snapshot:

┌─────────────────────────────────────────────┐
│ Dashboard (Post-Trial State)                │
├─────────────────────────────────────────────┤
│                                             │
│ 🏆 Your Snapshot (Review Card)              │
│   ├── Slides: Celebration, Stats, Proof    │
│   ├── ✨ One-time AI Insight visible       │
│   └── [Upgrade to Start Next Snapshot]     │
│                                             │
│ 📋 Today's Actions (Locked)                 │
│   "Your free snapshot is complete.          │
│    Upgrade to continue building proof."     │
│   [Upgrade Now] button                      │
│                                             │
│ 📊 Your Current State (Read-only)           │
│   ├── Build assessment (viewable)          │
│   ├── XP level (viewable)                  │
│   └── Time/Integrity (read-only)           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Key Behavior Changes

1. **"Change Focus" button**: Hidden/locked for post-trial free users
2. **"Start Next Snapshot" button**: Hidden in SnapshotReviewCard for free users
3. **TodayActions**: Shows locked state with upgrade CTA after free trial
4. **AI Insight**: Generated once for ALL users (free and paid)
5. **Admin panel**: Shows free trial funnel with conversion metrics

---

## Technical Notes

- The `hasUsedFreeTrial` check uses `allSessions.length >= 1` which is already calculated in Dashboard
- No database schema changes required
- Edge function update for admin-users adds new metrics to existing summary response
- The one-time AI insight is already stored per session, so free users only get it once per snapshot
