# QA Regression Checklist

**Duration:** 60-90 minutes  
**Purpose:** Full validation before releases  
**Devices:** iPhone Safari, iPhone Chrome, Android Chrome, Desktop Chrome

---

## 1. Authentication & Session (10 min)

### Sign Up Flow
- [ ] New user can sign up with email/password
- [ ] Password validation (min 6 chars) shows error
- [ ] Empty field validation works
- [ ] Successful signup redirects to dashboard
- [ ] Profile record created in database

### Sign In Flow
- [ ] Existing user can sign in
- [ ] Invalid credentials show appropriate error
- [ ] Session persists after page refresh
- [ ] Session persists after tab close/reopen

### Sign Out
- [ ] Sign out button works
- [ ] Redirects to landing page
- [ ] Cannot access /dashboard after sign out

---

## 2. Dashboard Tab - Core Modules (15 min)

### Main Quest Module
- [ ] "No Active Quest" state displays correctly
- [ ] Can create new quest with title and duration
- [ ] Active quest shows progress bar
- [ ] Can edit quest title inline
- [ ] Can complete quest
- [ ] Quest duration options: 7, 30, 90 days

### Reset Progress Module
- [ ] "Start Reset" shows when no active session
- [ ] "Continue" shows when session active
- [ ] Progress dots update with completed days
- [ ] Expandable day list works
- [ ] Navigate to /reset works

### Build Overview Module
- [ ] "Scan Build" button opens assessment
- [ ] 20-question assessment completes
- [ ] Build stats display after assessment
- [ ] Archetype shows with description
- [ ] "Rescan" button works
- [ ] "Share" opens share dialog

### XP Momentum Module
- [ ] XP value displays
- [ ] Level calculation correct
- [ ] Recent XP logs visible

### Time Currency Module
- [ ] "Log Today's Time" opens dialog
- [ ] Can enter invested/wasted minutes
- [ ] Values persist after submit
- [ ] "Update Time" pre-fills existing values
- [ ] Time bar visualization correct

### Integrity Meter Module
- [ ] Integrity score displays (or "No data")
- [ ] "Make a Promise" opens dialog
- [ ] Can create promise
- [ ] Pending promises show with ✓ / ✗ buttons
- [ ] Resolving promise updates score

---

## 3. Experience Tab (10 min)

### Free User Locks
- [ ] Time Cycle card visible (FREE)
- [ ] Offline Triggers visible (FREE)
- [ ] Badges section has locked overlay
- [ ] Progress History has locked overlay
- [ ] Momentum Decay has locked overlay
- [ ] Reset History has locked overlay (if completed resets exist)

### Locked Overlay UX
- [ ] Blur effect applied correctly
- [ ] Lock icon visible
- [ ] Upgrade CTA button visible
- [ ] Pricing text displays correctly
- [ ] Overlay doesn't trap scroll

### Paid User Access
- [ ] Mock paid status: all sections accessible
- [ ] No locked overlays visible
- [ ] Badges are interactive
- [ ] History data displays

---

## 4. Guide Tab (5 min)

- [ ] Game Rules section visible
- [ ] Collapsible sections work
- [ ] Daily Readings list shows
- [ ] Completed days marked
- [ ] Locked days show preview text
- [ ] Book promo link works

---

## 5. AI Operators (10 min)

### Free User State
- [ ] Panel expands on tap
- [ ] Operator selector visible
- [ ] Locked state shows in expanded area
- [ ] Upgrade CTA visible
- [ ] Cannot send messages

### Paid User State
- [ ] Chat input visible
- [ ] Can select different operators
- [ ] Quick prompts appear for selected operator
- [ ] Message sends and response appears
- [ ] Action items in responses work
- [ ] "Complete Action" awards XP

---

## 6. 7-Day Reset Flow (15 min)

### Start New Reset
- [ ] /reset page loads
- [ ] Covenant screen appears first
- [ ] Can accept covenant
- [ ] Day 1 content loads

### Daily Reset (test Day 1)
- [ ] Reading displays correctly
- [ ] Can enter reflection
- [ ] Completion button works
- [ ] XP awarded
- [ ] Badge awarded (if applicable)
- [ ] Returns to dashboard
- [ ] Progress updates

### Day-by-Day Progression
- [ ] Today's day is accessible
- [ ] Future days show locked
- [ ] Completed days show as done
- [ ] Cannot re-complete same day

### Day 7 Completion
- [ ] Final day completes successfully
- [ ] Completion celebration shows
- [ ] Can start new reset

---

## 7. Payment Flow (10 min)

### Checkout Initiation
- [ ] Upgrade CTA from AI Operators works
- [ ] Upgrade CTA from Experience tab works
- [ ] Button shows loading state
- [ ] Redirects to Stripe checkout

### Post-Payment
- [ ] ?payment=success shows toast
- [ ] URL cleaned up after toast
- [ ] Entitlement status updates
- [ ] AI Operators unlocks
- [ ] Experience History unlocks

### Already Paid
- [ ] Clicking upgrade shows "Already have access"
- [ ] No duplicate payment possible

---

## 8. Mobile-Specific Tests (10 min)

### iOS Safari
- [ ] No scroll trapping on locked overlays
- [ ] Modal back navigation works
- [ ] Keyboard shows and "Done" dismisses
- [ ] Tap targets are large enough (44pt min)
- [ ] No hover-only interactions

### iOS Chrome
- [ ] All above Safari tests pass

### Android Chrome
- [ ] Keyboard doesn't cover submit buttons
- [ ] Touch interactions work

### Orientation
- [ ] Portrait layout correct
- [ ] Landscape layout stable (if rotated)

---

## 9. Edge Cases (5 min)

- [ ] Network drop: error state shown, no white screen
- [ ] Slow network: loading states visible
- [ ] Large XP value displays correctly
- [ ] Long quest title truncates
- [ ] Long promise text truncates
- [ ] Empty states show correctly

---

## 10. Performance (5 min)

- [ ] Initial load < 3 seconds
- [ ] No visible layout shift
- [ ] Tab transitions smooth
- [ ] No infinite spinners
- [ ] Skeleton loaders show during data fetch

---

## Results Summary

| Section | Pass | Fail | Notes |
|---------|------|------|-------|
| Authentication | | | |
| Dashboard | | | |
| Experience | | | |
| Guide | | | |
| AI Operators | | | |
| 7-Day Reset | | | |
| Payment | | | |
| Mobile | | | |
| Edge Cases | | | |
| Performance | | | |

**Overall:** ✅ PASS / ⚠️ CONDITIONAL / ❌ FAIL

**Tester:** _____________  
**Date:** _____________  
**Devices Tested:** _____________  
**Version/Commit:** _____________
