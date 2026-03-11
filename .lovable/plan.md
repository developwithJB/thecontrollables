
# AI Insight Engine + Enhanced Action Center + README & Landing Page Update

## Overview

Three interconnected deliverables:
1. **AI Insight Engine** -- a new edge function and admin panel that generates weekly data-driven recommendations
2. **Enhanced Action Center** -- upgrade the existing placeholder-heavy Action Center with working controls
3. **README + Landing Page** -- align both with the 7-day free trial, adaptive dashboard, and Data Command Center updates

---

## Part 1: AI Insight Engine

### New Edge Function: `admin-insights`

**File: `supabase/functions/admin-insights/index.ts`**

This function:
1. Verifies the caller is an admin (same pattern as `admin-analytics`)
2. Queries aggregated metrics from the last 7 days using the service role client:
   - `app_events` grouped by `event_name` and day-of-week
   - `completed_actions` grouped by `controllable`
   - `daily_resets` count per user (for retention correlation)
   - `reset_sessions` completion rates
   - `user_entitlements` conversion data
   - `user_onboarding` activation delays
3. Sends the aggregated data (no PII) to Lovable AI (`google/gemini-3-flash-preview`) with a structured prompt requesting:
   - 3 behavioral insights
   - 2 retention risks
   - 2 growth opportunities
   - 1 experiment recommendation
4. Uses tool calling to extract structured JSON output (array of insight objects with `type`, `title`, `detail`, `confidence`)
5. Returns the insights directly (no caching table needed initially -- can add later)

**Prompt structure:**
```
You are a product analytics advisor for a personal growth app called The Controllables.
Given the following 7-day metrics, generate actionable insights.

[structured data blob]

Return insights as structured tool output.
```

**Rate limit handling:** Catch 429/402 from Lovable AI and surface to admin.

**Config:** Add `[functions.admin-insights]` with `verify_jwt = false` to `supabase/config.toml`.

### New Admin Component: AI Insights Panel

**File: `src/components/admin/AIInsightsPanel.tsx`**

- A card with "Weekly Intelligence" header and a "Generate Insights" button
- On click, calls the `admin-insights` edge function
- Displays results in categorized sections:
  - Behavioral Insights (brain icon, blue accent)
  - Retention Risks (alert icon, amber accent)
  - Growth Opportunities (trending-up icon, green accent)
  - Experiment Recommendation (flask icon, purple accent)
- Each insight shows: title, detail paragraph, confidence badge (high/medium/low)
- Loading state with skeleton cards
- Error state with retry button
- "Last generated" timestamp display

### Integration into Admin.tsx

- Add a new tab "Insights" with a Sparkles icon between Revenue and Health tabs
- The tab renders `<AIInsightsPanel />`

---

## Part 2: Enhanced Action Center

**File: `src/components/admin/ActionCenter.tsx` (rewrite)**

Replace the three "Coming soon" cards with working functionality:

### A. Send Nudge Campaign
- Select segment: All Free Users, Slipping Users, At Risk Users, Dormant Users
- Confirmation dialog before sending
- Calls the existing `send-daily-nudge` edge function for each selected user
- Shows progress and results

### B. Grant Trial Extension
- Search for a specific user by email
- Set extension duration (7 days, 14 days, 30 days)
- Calls `admin-users?action=grant_access` with an `expires_at` parameter
- Confirmation toast on success

### C. Export with More Segments
- Add segment filters: By Risk Tier (healthy/slipping/at_risk/dormant), By Signup Cohort (last 7d/30d/90d)
- Risk tier data fetched from `admin-analytics?resource=retention_radar`
- CSV includes: email, signup date, last active, risk tier, paid status, source

### D. Quick Stats Bar
- Show counts above the action cards: Total Users, Free, Paid, At Risk
- Derived from the `users` prop already passed in

---

## Part 3: Landing Page Updates

**File: `src/pages/Landing.tsx`**

Update the hero copy to reflect the free trial:
- Change hero tagline to emphasize "Try the full experience free for 7 days"
- Update secondary CTA from "Start free" to "Start your free 7-Day Snapshot"
- Add a brief mention below the CTA: "Full access. No credit card. See what changes in a week."

**File: `src/components/landing/FeatureGrid.tsx`**

- Update the Free/Premium labeling:
  - "The Controllables Guides" -- change from "Premium" badge to "Free during trial"
  - "Experience History" -- add "Free during trial" badge
  - Add a new feature card: "7-Day Free Trial" with description: "Get full access to every feature during your first Snapshot. No credit card required. Upgrade only if it helps."

**File: `src/components/landing/HowItWorksSection.tsx`**

- No structural changes, but update Step 3 description to mention: "Your first Snapshot is fully unlocked -- all features, all guides."

---

## Part 4: README Update

**File: `README.md`**

Update to v1.5.0 reflecting all recent changes:

1. **Version bump**: `v1.4.1` to `v1.5.0`
2. **New section: "Admin Command Center"** after Technical Reference:
   - Document the 10-tab structure (Overview, Funnel, Behavior, Retention, Revenue, Health, Nudges, Users, Actions, Claw)
   - Mention the `admin-analytics` and `admin-insights` edge functions
   - Document the AI Insight Engine capability
3. **Update "Free vs. Premium" table**:
   - Add "7-Day Free Trial" row explaining full access during first Snapshot
   - Update AI Guide from "---" to "5 msgs/day during trial"
   - Update Experience History from "---" to "During trial"
4. **Update Backend Functions table**:
   - Add `admin-analytics` -- Admin data aggregation and executive metrics
   - Add `admin-insights` -- AI-powered weekly behavioral insights for admins
5. **Update Key Data Tables**:
   - Add `user_build_current` -- Current Build scores (snapshot for dashboard)
   - Add `ai_usage_logs` -- Daily AI message tracking
6. **Version in `src/lib/version.ts`**: Update to `"1.5.0"`

---

## Technical Summary

| File | Change | Type |
|------|--------|------|
| `supabase/functions/admin-insights/index.ts` | New AI insight generation edge function | Create |
| `supabase/config.toml` | Add `[functions.admin-insights]` entry | Edit |
| `src/components/admin/AIInsightsPanel.tsx` | New insights panel component | Create |
| `src/components/admin/ActionCenter.tsx` | Upgrade with working nudge, trial extension, enhanced export | Edit |
| `src/pages/Admin.tsx` | Add Insights tab | Edit |
| `src/pages/Landing.tsx` | Update hero copy for free trial messaging | Edit |
| `src/components/landing/FeatureGrid.tsx` | Add trial badges, new feature card | Edit |
| `src/components/landing/HowItWorksSection.tsx` | Update Step 3 copy | Edit |
| `README.md` | v1.5.0 with Command Center docs, trial info, new functions | Edit |
| `src/lib/version.ts` | Bump to 1.5.0 | Edit |

No database migrations needed. The AI Insight Engine uses Lovable AI (LOVABLE_API_KEY already configured) and returns insights on-demand without persistent storage.
