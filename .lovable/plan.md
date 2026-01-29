
# Fix Onboarding → Welcome Back Flow Bug

## Problem Identified

When a brand new user completes onboarding and picks their first snapshot, they incorrectly see the "Welcome Back" screen. This happens due to a **race condition** between onboarding completion and the welcome back detection logic.

### Root Cause Analysis

The flow goes:
1. User picks snapshot → `handleOrientationComplete()` runs
2. `acceptCovenant()` creates a reset_session (active session now exists)
3. `onUpdateOnboarding({ step: "completed" })` marks onboarding done
4. After 2-second delay, `onComplete()` is called
5. `queryClient.invalidateQueries({ queryKey: ["user-onboarding"] })` runs
6. Dashboard re-renders with `needsOnboarding = false`
7. **Now the Welcome Back logic kicks in...**

The bug is in `useWelcomeBack` at line 173-174:
```typescript
// Show if user has no recorded actions but has an active session (stale return)
if (!lastActionDate && hasActiveSession) return true;
```

A brand new user who just completed onboarding will have:
- `lastActionDate = null` (no actions yet recorded in `daily_checkins`, `daily_resets`, `completed_actions`, or `time_logs`)
- `hasActiveSession = true` (just created by `acceptCovenant`)

This condition was designed to catch users who started a snapshot long ago and are returning, but it **incorrectly triggers for brand new users** who just completed onboarding.

---

## Solution

Add onboarding awareness to the Welcome Back hook. A user who **just completed onboarding** should never see the Welcome Back screen—they should go straight to Day 1.

### Key Changes

| File | Change |
|------|--------|
| `src/hooks/useWelcomeBack.ts` | Add `justCompletedOnboarding` check to skip welcome back for new users |
| `src/pages/Dashboard.tsx` | Pass `justCompletedOnboarding` from onboarding data to useWelcomeBack |

---

## Detailed Implementation

### 1. Update useWelcomeBack Hook

**File**: `src/hooks/useWelcomeBack.ts`

Add a new parameter to the hook:
```typescript
interface UseWelcomeBackOptions {
  userId: string | null;
  hasActiveSession: boolean;
  todayActionsCompleted: boolean;
  justCompletedOnboarding: boolean; // NEW: user just finished onboarding
}
```

Update the `showWelcomeBack` logic to add an early exit for new users:
```typescript
const showWelcomeBack = useMemo(() => {
  // Don't show if still loading
  if (isLoadingLastAction) return false;
  
  // Don't show if no user
  if (!userId) return false;
  
  // NEW: Don't show if user just completed onboarding (they're brand new)
  if (justCompletedOnboarding) return false;
  
  // Don't show if already completed today's actions
  if (todayActionsCompleted) return false;
  
  // ... rest of logic
}, [...dependencies, justCompletedOnboarding]);
```

### 2. Update Dashboard.tsx

**File**: `src/pages/Dashboard.tsx`

Calculate whether user just completed onboarding based on `onboarding` data:
```typescript
// User "just completed" onboarding if:
// 1. onboarding_step === "completed"
// 2. first_action_completed_at is within the last 5 minutes
const justCompletedOnboarding = useMemo(() => {
  if (!onboarding) return false;
  if (onboarding.onboarding_step !== "completed") return false;
  
  // Check if first_action_completed_at is within last 5 minutes
  if (!onboarding.first_action_completed_at) return false;
  
  const completedAt = new Date(onboarding.first_action_completed_at);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return completedAt > fiveMinutesAgo;
}, [onboarding]);
```

Pass this to `useWelcomeBack`:
```typescript
const {
  showWelcomeBack,
  showFollowUp,
  // ...
} = useWelcomeBack({
  userId: user?.id || null,
  hasActiveSession: !!activeSession,
  todayActionsCompleted,
  justCompletedOnboarding, // NEW
});
```

### 3. Alternative Simpler Fix

Instead of the time-based check, we can use a simpler heuristic:

**If user has no action history AND session was created less than 10 minutes ago, skip welcome back.**

This requires checking `activeSession.created_at`:
```typescript
// In useWelcomeBack, update the problematic condition:
// Show if user has no recorded actions but has an active session (stale return)
// But NOT if the session is fresh (created recently = just finished onboarding)
const sessionIsStale = activeSessionCreatedAt 
  ? (Date.now() - new Date(activeSessionCreatedAt).getTime()) > 10 * 60 * 1000 // 10 minutes
  : true;

if (!lastActionDate && hasActiveSession && sessionIsStale) return true;
```

This approach requires passing `activeSessionCreatedAt` to the hook.

---

## Recommended Approach

I recommend **Option 3 (session freshness check)** because:
1. It's more robust—doesn't rely on onboarding-specific data
2. It handles edge cases like app crashes during onboarding
3. It's self-contained within the useWelcomeBack hook

### Updated useWelcomeBack Interface
```typescript
interface UseWelcomeBackOptions {
  userId: string | null;
  hasActiveSession: boolean;
  activeSessionCreatedAt: string | null; // NEW
  todayActionsCompleted: boolean;
}
```

### Key Logic Change
```typescript
// Calculate if this is a fresh session (just started, not a stale return)
const sessionIsStale = useMemo(() => {
  if (!activeSessionCreatedAt) return true;
  const createdTime = new Date(activeSessionCreatedAt).getTime();
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  return createdTime < tenMinutesAgo;
}, [activeSessionCreatedAt]);

// In showWelcomeBack logic:
// Show if user has no recorded actions but has an active STALE session
if (!lastActionDate && hasActiveSession && sessionIsStale) return true;
```

---

## Files to Modify

| File | Changes |
|------|--------|
| `src/hooks/useWelcomeBack.ts` | Add `activeSessionCreatedAt` param; add session freshness check |
| `src/pages/Dashboard.tsx` | Pass `activeSession?.created_at` to useWelcomeBack |

---

## Testing Checklist

After implementation, verify:
1. **New user flow**: Create new account → complete onboarding → select snapshot → should go directly to Day 1 dashboard (NO welcome back)
2. **Returning user flow**: User with existing session who hasn't acted in 3+ days → should see Welcome Back
3. **Same-day return**: User who acted today but refreshes page → should NOT see Welcome Back
4. **Stale session return**: User who started a session 2 weeks ago, never acted → should see Welcome Back

---

## Technical Notes

- The 10-minute freshness window is generous enough to handle slow networks or delays
- `activeSession.created_at` is already available in the Dashboard from `useReset`
- This fix doesn't require any database changes
- The fix is backwards compatible—existing returning users will still see Welcome Back correctly
