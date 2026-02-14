

# Daily Alignment Adoption Campaign

## Problem

Daily Alignment is off by default, even for paid users. Existing users (both paid and free) have no idea this feature exists. We need to surface it without being pushy -- consistent with the app's calm, permission-based philosophy.

## Strategy: Three Adoption Levers

```text
+---------------------------+----------------------------+----------------------------+
|   1. AWARENESS            |   2. ACTIVATION            |   3. CONVERSION            |
|   (All users see it)      |   (Paid users opt in)      |   (Free users upgrade)     |
+---------------------------+----------------------------+----------------------------+
| What's New modal on       | One-tap enable toggle      | Enriched promo card        |
| next login (v1.4.0)       | right inside the modal     | with sample preview        |
|                           |                            |                            |
| Dashboard spotlight       | Welcome Back flow          | "Try a sample" CTA that    |
| card (one-time,           | includes DA suggestion     | shows a static example     |
| dismissible)              | for returning paid users   | alignment email            |
+---------------------------+----------------------------+----------------------------+
```

---

## Changes

### 1. Version bump and What's New modal update

**Files:** `src/lib/version.ts`, `src/components/WhatsNewModal.tsx`

Bump version to `1.4.0` and add a changelog entry highlighting Daily Alignment as the headline feature. This modal auto-shows to returning users who last saw a previous version.

Changelog entry:
- Title: "Daily Alignment"
- Items:
  - "Daily Alignment -- personalized scripture and reflection delivered each morning"
  - "Built from your actual Snapshot data and Build scores"
  - "Enable it in Profile Settings under Reminders"

### 2. One-time Dashboard spotlight card (new component)

**New file:** `src/components/dashboard/DailyAlignmentSpotlight.tsx`

A dismissible, attention-drawing card shown once to ALL authenticated users (paid and free) at the top of the dashboard (above GreetingBanner). It uses localStorage (`da_spotlight_dismissed`) to track dismissal.

For paid users:
- Headline: "New: Daily Alignment"
- Body: "A personalized scripture and one clear action, delivered to your inbox each morning. Built from your real progress."
- CTA button: "Enable Daily Alignment" -- opens ProfileSettingsModal with nudge frequency pre-set to "daily" and saves immediately
- Secondary: "Not now" dismiss link

For free users:
- Same headline and body
- CTA: "Upgrade to unlock" -- triggers checkout
- Secondary: "Learn more" -- scrolls to the existing promo card

**File:** `src/pages/Dashboard.tsx`
- Import and render `DailyAlignmentSpotlight` above `GreetingBanner`
- Pass `isPaid`, `userId`, `onUpgrade`, and a callback to open settings with auto-enable

### 3. Quick-enable from spotlight (auto opt-in)

**File:** `src/pages/Dashboard.tsx`

Add a `handleEnableDailyAlignment` function that:
1. Updates the user's profile directly: `email_nudge_enabled = true`, `nudge_frequency = 'daily'`
2. Shows a success toast: "Daily Alignment enabled. Your first email arrives tomorrow morning."
3. Dismisses the spotlight card
4. Tracks an analytics event: `feature_activation`, `daily_alignment_enabled`

This removes friction -- users don't have to navigate to settings, find the toggle, and save.

### 4. Welcome Back flow integration

**File:** `src/components/welcome-back/WelcomeBackFollowUp.tsx`

For paid users who haven't enabled Daily Alignment (check profile `email_nudge_enabled`), add a soft suggestion in the follow-up screen:

- After the existing content, add a small card:
  "Want a calm start each morning? Enable Daily Alignment -- personalized scripture built from your progress."
  [Enable] [Skip]

This targets the exact users who've been away and are re-engaging -- the highest-intent moment.

**File:** `src/hooks/useWelcomeBack.ts` or `src/components/WelcomeBack.tsx`

Fetch the user's `email_nudge_enabled` status to conditionally show the DA suggestion.

### 5. Enriched free-user promo card with sample preview

**File:** `src/components/dashboard/DailyAlignmentPromo.tsx`

Upgrade the existing static promo card:
- Add a "See a sample" expandable section that shows a mock Daily Alignment email preview (static content, not AI-generated)
- Sample includes: a scripture verse, a 2-sentence reflection, a micro-action, and an evening prompt
- This gives free users a tangible preview of what they're missing
- Keep the "Upgrade to Premium" CTA

### 6. Analytics tracking

**File:** `src/hooks/useAnalytics.ts` (existing trackEvent)

Track these new events through the existing analytics system:
- `feature_awareness`: `da_spotlight_shown` -- when spotlight renders
- `feature_activation`: `da_spotlight_enable_clicked` -- when paid user clicks enable
- `feature_activation`: `da_welcome_back_enable_clicked` -- when paid user enables from welcome back
- `feature_awareness`: `da_promo_sample_expanded` -- when free user views sample
- `feature_conversion`: `da_promo_upgrade_clicked` -- when free user clicks upgrade from promo

---

## Technical Details

### localStorage keys
- `da_spotlight_dismissed` -- prevents spotlight from showing again after dismissal or enable
- `da_spotlight_dismissed_{userId}` -- per-user to handle multi-account scenarios

### Profile check for spotlight
Query `profiles` table for `email_nudge_enabled` to determine if paid user already has it on. If already enabled, don't show spotlight.

### Component rendering order (Dashboard tab)
```text
1. WelcomeBackBanner (if returning)
2. DailyAlignmentSpotlight (if not dismissed and not already enabled)  <-- NEW
3. GreetingBanner
4. MainQuestModule
5. SnapshotReviewCard
6. TodayActions
7. BuildEntryPoint
8. DailyAlignmentPromo (free users only)  <-- ENHANCED
9. ResetProgressModule
...
```

### Files summary

| File | Action |
|------|--------|
| `src/lib/version.ts` | Bump to 1.4.0 |
| `src/components/WhatsNewModal.tsx` | Add 1.4.0 changelog with DA headline |
| `src/components/dashboard/DailyAlignmentSpotlight.tsx` | New -- one-time dismissible spotlight card |
| `src/components/dashboard/DailyAlignmentPromo.tsx` | Enhance -- add sample preview section |
| `src/pages/Dashboard.tsx` | Integrate spotlight, add quick-enable handler |
| `src/components/welcome-back/WelcomeBackFollowUp.tsx` | Add DA suggestion for paid users |

No new database tables or edge functions needed. No new dependencies.

