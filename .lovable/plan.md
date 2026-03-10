

# Plan: Three Features — Free AI Tier, Snapshot Share Card, Landing Tagline

## 1. Permanent Free Tier AI (2 messages/day)

### Changes

**`src/lib/entitlements.ts`** (line 163)
- Change `postTrial: 0` to `postTrial: 2`

**`supabase/functions/ai-chat/index.ts`** (line 74)
- Change `free: 5` to keep as-is for trial users. The edge function uses `getPlanTier` which returns `'free'` for all free users (trial and post-trial). Need to differentiate: add a check for whether the user has an active snapshot (trial) vs post-trial. If post-trial free, daily limit = 2 instead of 5.
- Update the limit-reached error message from generic to: `"You've used your 2 free messages today. Upgrade to Plus for 15."`

**`src/components/dashboard/AIGuidePanel.tsx`**
- Line 165: Change `FREE_PREVIEW_LIMIT = 1` to `FREE_POST_TRIAL_LIMIT = 2`
- Update post-trial free user flow (lines 829-933): Instead of "1 free preview message," give them 2/day with a counter, similar to the trial flow but with limit of 2
- Update copy from "Come back tomorrow for another free message" to "You've used your 2 free messages today. Upgrade to keep the conversation going."
- The "Free Preview" banner (line 893) becomes "2 free messages per day — upgrade to Plus for 15"

**`src/components/AIChat.tsx`**
- Update `PLAN_MONTHLY_LIMITS` (lines 33-37) — this component uses monthly limits which are stale. Update the limit-reached copy from "Monthly AI limit reached" to encouraging copy: "You've used your 2 free messages today. Upgrade to keep the conversation going."
- Update placeholder text from "Monthly limit reached" to "Daily limit reached"

### Edge Function Changes
The `ai-chat` edge function needs to distinguish trial vs post-trial free users. Currently all free users get 5/day. Options:
- Check if user has an active, non-expired snapshot → trial (5/day)
- Otherwise free → post-trial (2/day)
- Add this logic to `checkAndUpdateDailyUsage` by querying `reset_sessions` for an active session

---

## 2. Viral Snapshot Share Card

### New File: `src/components/dashboard/SnapshotShareCard.tsx`
- Renders a branded card with:
  - Snapshot name + relevant Controllable emoji
  - Headline: "7 days. I showed up."
  - Completion date formatted nicely
  - App URL `thecontrollables.lovable.app` as visible branded link
  - Uses the Controllable color theme for the snapshot's focus area
  - Glass-morphism styling consistent with the app
- Export a `SnapshotShareModal` wrapper that shows the card in a dialog with a "Save Image" button
- Uses `html2canvas` (already installed) to capture the card as a PNG for download

### Edit: `src/components/Day7Complete.tsx`
- Import `SnapshotShareModal`
- Add a "Share your win" button (with Share2 icon) after the "View Your Snapshot" button (~line 285)
- Button opens the share modal, passing: displayName, startDate, endDate, completedJourney info (emoji, title, controllable type)

### Edit: `src/components/SeasonComplete.tsx`
- Add same "Share your win" button after the badge unlock notice (~line 170)
- Pass season name and stats to the share card

---

## 3. Marketing: Updated Landing Tagline

### Edit: `src/pages/Landing.tsx`
- Lines 91-95: Change hero headline from "Your Life OS. Wellness. Growth. Planner. Wealth." to:
  ```
  Stop trying to control everything.
  Start controlling what matters.
  ```
- Keep the subtext but refine to be more emotionally resonant, aligned with the philosophy
- Update the `WhyStartSection` reasons to lean into the "tired of failing" narrative

### Edit: `src/components/landing/WhyStartSection.tsx`
- Update the reasons array to better target the identified audiences (overwhelmed achievers, book readers, wearable users)

---

## Files Summary

| Action | File |
|--------|------|
| Edit | `src/lib/entitlements.ts` — postTrial: 0 → 2 |
| Edit | `supabase/functions/ai-chat/index.ts` — trial vs post-trial limit logic |
| Edit | `src/components/dashboard/AIGuidePanel.tsx` — 2/day free tier UI |
| Edit | `src/components/AIChat.tsx` — updated limit copy |
| Create | `src/components/dashboard/SnapshotShareCard.tsx` — share card + modal |
| Edit | `src/components/Day7Complete.tsx` — add share button |
| Edit | `src/components/SeasonComplete.tsx` — add share button |
| Edit | `src/pages/Landing.tsx` — new tagline |
| Edit | `src/components/landing/WhyStartSection.tsx` — updated reasons |

