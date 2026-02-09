

# Launch Hardening and Analytics Plan

## Summary

You're promoting the app today with 24 users so far. After reviewing the full codebase, database, error logs, and analytics data, I've found several gaps that could hurt the first-time user experience. Here's what needs fixing:

---

## 1. Resolve All Remaining Unresolved Errors

**Problem:** 28 unresolved errors still sitting in the database -- all are stale artifacts from the auth race condition that was already fixed.

- 9x "signal is aborted without reason" (from your own admin account, Feb 7)
- 8x "null is not an object (evaluating 's.id')" (anonymous, Jan 29)
- 5x "Failed to fetch dynamically imported module" (Jan 28 -- stale build cache)
- 3x "TGIMWeeklyBanner is not defined" (Jan 27 -- removed component)
- 2x "The operation was aborted" (Jan 29)
- 1x "Importing a module script failed" (Jan 27)

**Fix:** Mark all as resolved in one database update. These are all historical.

---

## 2. Track Account Creation (Missing Funnel Event)

**Problem:** `trackAccountCreated()` is defined in `useOnboardingAnalytics` but is **never called** anywhere. Zero "account_created" events exist in the database. This breaks the top of your onboarding funnel: you can't see how many signups convert to assessment completion.

**Fix:** Call `trackAccountCreated()` in `Auth.tsx` after a successful `signUp()` call.

---

## 3. Track Auth Page Views

**Problem:** The Auth page (`/auth`) has no `usePageViewTracking()` call. Landing and Dashboard track page views, but Auth doesn't. You can't see how many people reach the signup/signin page.

**Fix:** Add `usePageViewTracking("Auth")` to `Auth.tsx`.

---

## 4. Rescue Stuck Onboarding Users

**Problem:** 8 users are stuck in incomplete onboarding states and will see the assessment screen every time they log in:
- 6 stuck at `build_assessment` (never started or abandoned)
- 1 stuck at `archetype_result` 
- 1 stuck at `journey_selection`

These users will have a broken experience when they return.

**Fix:** Add a "Skip for now" escape hatch that's more prominent. Currently the skip button exists but these users either missed it or hit an error. Add a defensive check: if a user's onboarding record is older than 24 hours and they're still not at `completed`, auto-show a simplified recovery that lets them skip straight to dashboard with a default snapshot.

---

## 5. Suppress Abort Errors from Error Tracking

**Problem:** "signal is aborted without reason" errors are React Query query cancellations -- they're normal and expected, not real bugs. They pollute the error log and make it harder to spot real issues.

**Fix:** Filter out `AbortError` and "signal is aborted" messages in both `setupGlobalErrorTracking()` and the `window.onunhandledrejection` handler so they never hit the database.

---

## 6. Add Landing Page CTA Click Tracking

**Problem:** You can see landing page views (70 in the last week) but you can't see how many people click the "Start with a 7-Day Snapshot" CTA or the secondary "Start free" CTA. This is critical for measuring landing page effectiveness.

**Fix:** Add click tracking to both CTA buttons on the Landing page.

---

## 7. Harden the Signup Success Message

**Problem:** After signup, the toast says "Your account has been created. Redirecting to your dashboard..." but if email confirmation is required, the user won't be redirected -- they need to check their email first. This creates confusion.

**Fix:** Check the signup response for `session` presence. If no session (email confirmation required), show "Check your email to confirm your account." If session exists (auto-confirmed), show the redirect message.

---

## Technical Details

### Files to modify:
1. **`src/pages/Auth.tsx`** -- Add page view tracking, account creation tracking, fix signup toast
2. **`src/hooks/useAnalytics.ts`** -- Filter AbortError from global error handlers
3. **`src/pages/Landing.tsx`** -- Add CTA click tracking
4. **`src/components/onboarding/OnboardingFlow.tsx`** -- Add stale onboarding auto-recovery
5. **Database** -- Resolve all 28 stale errors

### Database changes:
- Mark all existing unresolved errors as resolved (UPDATE, no schema change)

### No new dependencies needed.

### Priority order:
1. Fix signup toast (prevents confusion for new users TODAY)
2. Add Auth page tracking + account creation event (funnel visibility)
3. Filter AbortErrors (clean error log for monitoring)
4. Add Landing CTA tracking (measure promotion effectiveness)
5. Resolve stale errors (clean admin panel)
6. Add stale onboarding recovery (rescue stuck users)

