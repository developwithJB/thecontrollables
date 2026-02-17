

# Update README + Landing Page + Fix Build Errors

Three areas of work: fix the existing build errors, then update the README and landing page to reflect the latest changes (Daily Alignment emails, re-engagement nudges, nudge deduplication improvements).

---

## 1. Fix Build Errors (prerequisite -- these block deployment)

### a. `supabase/functions/check-payment/index.ts` (line 104)
- Add explicit type annotation to the `.find()` callback parameter: `(sub: Stripe.Subscription) =>` or use a local Stripe type alias to resolve the implicit `any`.

### b. `supabase/functions/create-checkout/index.ts` (line 73)
- The `tier` variable is parsed from user input (line 34: `const tier = body.tier ?? "pro"`) and is typed as `any`. Cast it to `PlanTier` before indexing: `const priceId = STRIPE_PRICE_IDS[tier as PlanTier];`

### c. `src/lib/featureFlags.ts` (lines 243, 247, 251, 255)
- The `for...of` loop over `FEATURE_FLAG_KEYS` widens `key` to `FeatureFlagKey`, which makes `resolved[key]` resolve to a union type that TypeScript narrows to `never` on assignment. Fix by casting the assignment: `(resolved as Record<FeatureFlagKey, FeatureFlags[FeatureFlagKey]>)[key] = normalizeFlagValue(...)` or use a helper function that preserves the generic relationship.

---

## 2. Update README.md

Bump version from **1.4.0 to 1.4.1** in both `README.md` and `src/lib/version.ts`.

Add/update these sections to reflect recent changes:

### Daily Alignment (new feature highlight)
Under the existing "Daily Rituals" or as a new dedicated section:
- Personalized scripture, real-time growth reflection, and one clear action delivered each morning via email
- Built from the user's actual Snapshot data, Build scores, and check-in history
- Premium feature, opt-in via Dashboard spotlight or Profile settings

### Email Nudge System (new section under Technical Reference)
- Daily nudge emails sent at user's local 7 AM
- Atomic deduplication via unique constraint on `(user_id, nudge_date)`
- Suppressed nudges marked as "skipped" (not left in "pending" limbo)
- Re-engagement emails for users between Snapshots ("Start your next Snapshot")
- Logged in `email_nudge_logs` table with statuses: pending, sent, skipped, failed

### Welcome Back + Cache Fix
- Note that session transitions now properly refresh the dashboard (no more "stuck on yesterday" after starting a new Snapshot)

### Update Technical Reference tables
- Add `email_nudge_logs` to the Key Data Tables list
- Update `send-daily-nudge` description to include re-engagement nudges

---

## 3. Update Landing Page

### FeatureGrid (`src/components/landing/FeatureGrid.tsx`)
- Update the "Daily Alignment" feature card description to better match the current implementation: emphasize the personalized morning email with scripture, reflection, and one action -- built from real progress data
- Consider adding a "Daily Nudge Emails" mention or folding it into the Daily Alignment card since they share the same email infrastructure

### No changes needed to:
- `HowItWorksSection.tsx` -- still accurate
- `WhyStartSection.tsx` -- still accurate
- `PhilosophySection.tsx` -- still accurate
- `TrustDisclosure.tsx` -- still accurate
- `Landing.tsx` -- structure is fine

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/check-payment/index.ts` | Add type annotation to `.find()` callback |
| `supabase/functions/create-checkout/index.ts` | Cast `tier` to `PlanTier` before indexing |
| `src/lib/featureFlags.ts` | Fix TS2322 assignment in `getFeatureFlags` loops |
| `src/lib/version.ts` | Bump to 1.4.1 |
| `README.md` | Add Daily Alignment, Email Nudge System, update tables, bump version |
| `src/components/landing/FeatureGrid.tsx` | Update Daily Alignment card copy |

