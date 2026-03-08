

# Naming Clarity Pass: "The Dashboard" (app) vs "The Controllables" (book)

**The rule**: "The Dashboard" = the app name. "The Controllables" = the book and the five guide categories. URLs, share hashtags, and email sender names should all use "The Dashboard."

## Changes Required

### 1. Logo & Splash Screen — Fix subtitle
- `src/components/Logo.tsx` line 68: Change `"by The Controllables"` → `"by AGB Coaching"` (or remove subtitle — "The Controllables" is the book, not the company)
- `src/components/SplashScreen.tsx` line 114: Same change

### 2. Share text hashtags — Use `#TheDashboard`
All social share text currently uses `#TheControllables`. Change to `#TheDashboard` in:
- `src/components/dashboard/SnapshotReviewCard.tsx` (line 240)
- `src/components/dashboard/BuildCard.tsx` (line 37)
- `src/components/experience/SnapshotDetailView.tsx` (line 309)
- `src/components/experience/SnapshotReviewModal.tsx` (line 173)
- `src/hooks/useCertificate.ts` (line 167)

### 3. Share URLs — Standardize to `thedashboard.agbcoaching.com`
The previous polish pass incorrectly changed URLs to `thecontrollables.lovable.app`. Revert these to the canonical domain `thedashboard.agbcoaching.com`:
- `src/components/dashboard/SnapshotReviewCard.tsx` (line 239)
- `src/components/dashboard/BuildCard.tsx` (line 168)
- `src/components/experience/SnapshotDetailView.tsx` (lines 308, 820)
- `src/components/experience/SnapshotReviewModal.tsx` (line 172)
- `src/components/experience/QuestCard.tsx` (line 122)

Edge functions already use `thedashboard.agbcoaching.com` — those are correct.

### 4. LockedOverlay — Fix AI companion copy
- `src/components/experience/LockedOverlay.tsx` lines 69-70: The title says "The Controllables" and description says "The Controllables unlock with Full Access." This refers to the AI guide companions, not the book. Change to something like:
  - Title: `"AI Companions"`
  - Description: `"...AI Companions unlock with Full Access."`

### 5. Billing page label
- `src/pages/Billing.tsx` line 311: `"AI Companions (The Controllables)"` → `"AI Companions"` (the parenthetical is confusing — the companions are a Dashboard feature, not a book feature)

### 6. Manifest & index.html — Already correct
- `index.html` title is "The Dashboard" ✓
- `manifest.webmanifest` uses "The Dashboard" in name ✓
- Canonical URL uses `thedashboard.agbcoaching.com` ✓

### 7. Landing page copy — Verify context
The landing `TrustDisclosure.tsx` says "trained on The Controllables philosophy" — this is correct usage (referring to the book's philosophy).

### 8. Edge function URLs — Already correct  
`send-daily-nudge`, `admin-broadcast`, `create-checkout`, `generate-certificate`, `generate-calendar-reminder` all use `thedashboard.agbcoaching.com` — correct. The `customer-portal` fallback uses `thecontrollables.lovable.app` and should be updated to `thedashboard.agbcoaching.com`.

### Summary
- ~12 files touched
- Mostly string replacements
- Core principle: "The Dashboard" = app, "The Controllables" = book/philosophy, "AGB Coaching" = author/company

