# QA Smoke Test Checklist

**Duration:** ~10 minutes  
**Purpose:** Quick validation before any deploy or major change  
**Environment:** Mobile Safari (primary), Desktop Chrome (secondary)

---

## Pre-Flight (1 min)

- [ ] Open app on iPhone Safari
- [ ] Confirm no white screen on initial load
- [ ] Confirm no console errors in dev tools (if available)
- [ ] Verify offline indicator appears when disconnected

---

## Authentication (2 min)

- [ ] Landing page loads with hero content
- [ ] "Get Started" navigates to /auth
- [ ] Can toggle between Sign In and Sign Up
- [ ] Sign in with valid credentials works
- [ ] Redirects to /dashboard after auth

---

## Dashboard Core (3 min)

- [ ] Dashboard loads without infinite spinner
- [ ] Tab navigation works: Dashboard → Experience → Guide
- [ ] Main Quest module visible
- [ ] Reset Progress module visible
- [ ] Can tap "Start Reset" or "Continue" button

---

## Free User Gating (2 min)

- [ ] AI Operators panel shows locked state when expanded
- [ ] Experience tab shows blurred/locked sections
- [ ] "Unlock Full Access" button visible on locked content
- [ ] Tapping upgrade CTA shows loading state (checkout initiates)

---

## Basic Interactions (2 min)

- [ ] Can open and close dialogs (Time Log, Promise)
- [ ] Keyboard appears and "Done" works on iOS
- [ ] Modals don't break scroll or navigation
- [ ] Sign out button works

---

## Pass Criteria

✅ **PASS:** All checkboxes marked, no blocking errors  
⚠️ **WARN:** Minor visual issues, proceed with caution  
❌ **FAIL:** Any unchecked critical item, do not deploy

---

## Notes

| Issue | Severity | Notes |
|-------|----------|-------|
|       |          |       |
|       |          |       |
|       |          |       |

**Tester:** _____________  
**Date:** _____________  
**Version/Commit:** _____________
