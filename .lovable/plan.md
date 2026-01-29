

# Email Nudges System Update

## Overview

This update will completely rewrite the email nudges system to align with the new specifications. The goal is a calm, contextual reminder system that respects user autonomy and reinforces self-trust - not engagement maximization.

## Current State Analysis

The existing system:
- Has daily and weekly frequency options (correct)
- Uses morning/evening time preferences (partially correct)
- Generates generic subject lines like "Day 3. Still counts." (needs update)
- Has permission lines (correct pattern, needs exact copy update)
- Weekly emails currently send Monday morning only (correct trigger, wrong content)
- Missing: Snapshot name, theme, focus area, day-specific context lines, proper weekly reflection format

## Changes Required

### 1. Profile Settings Modal (UI Copy Update)

**File:** `src/components/ProfileSettingsModal.tsx`

Update the Email Nudges section copy to match specification:

| Current | Updated |
|---------|---------|
| "Gentle Email Nudges" | "Email Nudges (Optional)" |
| "The Dashboard checks in for you — without pressure..." | "A calm reminder to return to your Snapshot. No streaks. No guilt. Turn off anytime." |
| Radio: "Daily" / "Weekly (Monday)" | "Daily" / "Weekly" / "Off" |
| Default: Switch off | Default: "Off" selected |

**UI Flow Change:** Replace Switch + Radio pattern with a single RadioGroup:
- `off` (default)
- `daily` 
- `weekly`

Remove the separate Switch toggle since "Off" is now a radio option.

---

### 2. Edge Function Complete Rewrite

**File:** `supabase/functions/send-daily-nudge/index.ts`

#### A. Data Fetching Updates

Expand `getUserContext` to fetch:
- Snapshot name (from journey_id mapping)
- Snapshot theme/tagline (from Snapshot data)
- Snapshot focus (Controllable)
- Days completed in current snapshot (count of daily_resets for current session)
- Total days completed for weekly email (7 days total view)

#### B. Daily Email Template

**Subject Line Format:**
```
{{snapshot_name}}. Day {{day_number}}.
```
Example: `Back to Zero. Day 3.`

**Body Template:**
```
🌱

Hey {{user_name}},

You're on Day {{day_number}} of your {{snapshot_name}} Snapshot.

This week's focus: {{snapshot_theme}}
Focus area: {{focus_area}}

{{context_line}}

If you want to check in, your next small action is waiting.

[Open Today's Actions →]

{{permission_line}}

Turn off anytime in settings.
```

#### C. Day-Based Context Lines

| Day | Context Line |
|-----|--------------|
| 1 | "Starting fresh. No pressure to be perfect." |
| 4 | "Day 4 — the wobble is normal. It's part of the process." |
| 7 | "This is what proof looks like. One week of showing up." |
| Other | Neutral context like "Still here. That matters." |

#### D. Weekly Email Template (New)

**Trigger:** Once per Snapshot completion OR end of week

**Subject Line Format:**
```
Your {{snapshot_name}} Snapshot.
```
Example: `Your Back to Zero Snapshot.`

**Body Template:**
```
🏁

Hey {{user_name}},

Here's your Snapshot from this past week.

Snapshot: {{snapshot_name}}
Focus: {{snapshot_theme}}
Days shown up: {{days_completed}} / 7

This week still counts.
What matters most is that you showed up at least once.

If you want to review or start another Snapshot, it's ready.

[View Your Snapshot →]

{{permission_line}}

You're always allowed to pause or return later.
```

#### E. Permission Lines (Exact Rotation)

```typescript
const PERMISSION_LINES = [
  "Nothing is required today.",
  "This is here whenever you're ready.",
  "No pressure. Just a quiet check-in.",
  "You're allowed to pause or continue at your own pace.",
  "You don't need to do anything more unless you want to.",
];
```

#### F. CTA Standardization

- Daily emails: `Open Today's Actions →` (never vary)
- Weekly emails: `View Your Snapshot →` (never vary)

---

### 3. Database Consideration

The `nudge_frequency` column already exists with values `daily` | `weekly`. Add support for `off` as a value (or use `null` / remove `email_nudge_enabled` flag).

**Option A (Cleaner):** Keep `email_nudge_enabled` but treat `nudge_frequency = 'off'` as equivalent to disabled
**Option B:** Remove the separate enabled flag and use frequency alone

Recommendation: **Option A** - minimal migration, just update UI logic.

---

## Implementation Summary

| File | Changes |
|------|---------|
| `src/components/ProfileSettingsModal.tsx` | Replace Switch + Radio with single RadioGroup (Off/Daily/Weekly), update copy |
| `supabase/functions/send-daily-nudge/index.ts` | Complete rewrite of email templates, add snapshot data fetching, implement day-based context, separate daily vs weekly logic |
| Database | Add `'off'` as valid `nudge_frequency` value (or use existing `email_nudge_enabled = false`) |

---

## Technical Details

### Edge Function Data Flow

```text
1. Fetch user profile (timezone, nudge settings)
2. Determine if user qualifies for nudge (time match, frequency match)
3. Fetch user context:
   - reset_sessions → current_day, journey_id
   - daily_resets → count completed days for this session
   - profiles → display_name
4. Map journey_id to Snapshot data (inline SNAPSHOTS lookup)
5. Generate appropriate email (daily vs weekly)
6. Send via Resend, log to email_nudge_logs
```

### Snapshot Data in Edge Function

Since the edge function cannot import from `src/lib/snapshots.ts`, we need to either:
- **Option A:** Inline a minimal snapshot lookup map in the edge function
- **Option B:** Query from database (would require new table)

Recommendation: **Option A** - Inline a `SNAPSHOT_DATA` map with just `{ name, tagline, focus }` for each snapshot ID.

### Weekly Email Trigger Logic

Current: Weekly sends only on Monday at 7am
Updated: Weekly sends:
- At end of Day 7 (completion)
- OR on Monday morning for incomplete snapshots

This requires tracking whether weekly email was already sent for the current snapshot.

---

## Files to Modify

1. `src/components/ProfileSettingsModal.tsx` - UI and copy updates
2. `supabase/functions/send-daily-nudge/index.ts` - Complete email generation rewrite

---

## Acceptance Criteria Verification

| Requirement | Implementation |
|-------------|----------------|
| Opt-in only, off by default | UI defaults to "Off" radio selection |
| No shame, rush, or pressure | All copy reviewed for calm tone |
| Reinforce context (Snapshot + Focus) | Subject and body include snapshot name, theme, focus |
| Permission-giving line in every email | Mandatory rotation from 5 approved lines |
| Consistent CTA | "Open Today's Actions →" / "View Your Snapshot →" only |
| Daily: light orientation | Day-based micro-variation with context |
| Weekly: reflection, closure | Summary format with days shown up |
| Turning off feels safe | "Turn off anytime in settings" footer |

