# Release Checklist

**Purpose:** Pre-launch and major release validation  
**Owner:** Solo Founder

---

## Pre-Release (1 day before)

### Code Freeze
- [ ] All features complete and merged
- [ ] No pending critical PRs
- [ ] Version bumped (if applicable)

### Testing
- [ ] Smoke test passed on preview URL
- [ ] Regression test completed (or key paths)
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Unit tests passing: `npm run test:unit`

### Database
- [ ] All migrations applied
- [ ] RLS policies verified
- [ ] Test data cleaned (if in production db)

### Stripe
- [ ] Correct price ID in create-checkout
- [ ] Test mode purchase verified
- [ ] Webhook connected (check-payment works)

---

## Release Day

### Pre-Deploy Checks
- [ ] Backup current version URL
- [ ] Note current commit hash
- [ ] Verify Supabase is healthy

### Deploy
- [ ] Publish to production
- [ ] Note new version URL
- [ ] Verify deploy successful

### Post-Deploy Verification (30 min)

#### Quick Smoke
- [ ] Landing page loads
- [ ] Can sign in
- [ ] Dashboard loads
- [ ] No console errors
- [ ] Offline indicator works

#### Critical Paths
- [ ] New user signup works
- [ ] Reset flow: Day 1 can complete
- [ ] Upgrade CTA initiates checkout
- [ ] Paid user sees unlocked features

#### Mobile Verification
- [ ] iPhone Safari loads correctly
- [ ] iPhone Chrome loads correctly
- [ ] Android Chrome loads correctly

### Monitoring (First Hour)
- [ ] Check Supabase logs for errors
- [ ] Check Stripe dashboard for payments
- [ ] Monitor user reports (if any channel)

---

## Launch Day Specific (First Release)

### Marketing Readiness
- [ ] Launch announcement ready
- [ ] Social media scheduled
- [ ] Support email ready

### Pricing Verification
- [ ] Launch price ($29) active
- [ ] Regular price ($49) ready for March 1
- [ ] Price displays correctly in UI

### Analytics
- [ ] Page view tracking works
- [ ] Conversion events fire

---

## Rollback Plan

If critical issues found:

1. **Immediate:** Revert to previous version via Lovable
2. **Notify:** Post status update if users affected
3. **Investigate:** Check logs, reproduce issue
4. **Fix:** Apply hotfix and re-test
5. **Re-deploy:** Follow checklist again

### Rollback Triggers
- White screen on load
- Authentication broken
- Payment flow broken
- Data loss or corruption

---

## Post-Release (Next Day)

- [ ] Review any error logs
- [ ] Check user feedback
- [ ] Verify all features still working
- [ ] Document any issues found
- [ ] Plan fixes for next release

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Tester | | | |

**Release Version:** _____________  
**Release Date:** _____________  
**Status:** ✅ RELEASED / ❌ BLOCKED
