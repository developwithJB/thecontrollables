

# Private Snapshot Circles

Invite-only 2-5 person groups running the same Snapshot together with "showed up today" dots and day-7 celebration.

## Existing Infrastructure

The database already has `challenges`, `challenge_participants`, `challenge_progress` tables with RLS policies, plus `generate_invite_code()` and `is_challenge_participant()` functions. These are dormant — no frontend uses them. We'll repurpose them as the Circle backend.

## What Gets Built

### 1. Database Migration — Extend existing tables
- Add `journey_id text` and `max_members int default 5` columns to `challenges` table
- Add `display_name text` to `challenge_participants` (denormalized for privacy — no cross-user profile lookups)
- Add RLS policy: participants can view other participants' `display_name` and `challenge_progress` within their circle (already partially exists)
- Enable realtime on `challenge_progress` so dots update live

### 2. New hook: `useCircle.ts`
Central hook managing circle state:
- `createCircle(journeyId)` → inserts into `challenges` with `is_solo=false`, generates invite code, adds creator as first participant
- `joinCircle(inviteCode)` → looks up challenge by invite code, validates < max_members, inserts participant
- `leaveCircle()` → deletes participant row
- `logShowedUp(dayNumber)` → upserts into `challenge_progress` for today
- `circleMembers` → query participants with their progress dots
- `myCircle` → the user's active circle (at most one)
- Auto-links to the user's active `reset_session` journey_id

### 3. New component: `CircleCard.tsx` (Dashboard module)
Placed on the Dashboard tab below ResetProgressModule when user has an active session:

**No circle yet:**
- Card with "Run this Snapshot together" heading
- "Create a Circle" button → creates circle linked to current snapshot
- "Join a Circle" button → shows invite code input

**Has circle:**
- Circle name (snapshot name) + invite code with copy button
- Member dots row: 2-5 avatar circles showing first initial + "showed up today" green dot
- Today's dot auto-fills when user completes their daily reset
- Day count: "Day 3 of 7 · 3/4 showed up today"
- "Invite" button (if < 5 members) — copies invite link
- "Leave Circle" with confirmation

### 4. New component: `JoinCircleDialog.tsx`
Simple dialog with 6-character invite code input. Validates code, shows circle snapshot name and member count before confirming join. Accessible from CircleCard and via URL param `?join=CODE`.

### 5. Dashboard Integration
- In `Dashboard.tsx`, add `CircleCard` below `ResetProgressModule` (around line 1008)
- Only render when user has an active session
- Add `?join=CODE` URL param handling to auto-open join dialog

### 6. Day-7 Circle Celebration
- When all circle members complete day 7, show a shared celebration line in the existing Day7Complete screen: "Your circle finished together: [names]"
- Query `challenge_progress` for day 7 completions from circle members

## What Does NOT Change
- Solo snapshot flow remains identical
- No new pages or routes — circles live inside the Dashboard tab
- No cross-user data beyond circle membership (privacy preserved)
- Existing `challenge_progress` RLS already allows viewing progress of fellow participants

## Implementation Order
1. Database migration (add columns, realtime)
2. `useCircle.ts` hook
3. `CircleCard.tsx` component
4. `JoinCircleDialog.tsx` component
5. Dashboard integration + URL param handling
6. Day-7 circle celebration enhancement

## File Changes
- **New**: `src/hooks/useCircle.ts`, `src/components/dashboard/CircleCard.tsx`, `src/components/dashboard/JoinCircleDialog.tsx`
- **Edit**: `src/pages/Dashboard.tsx` (add CircleCard + join param handling)
- **Edit**: `src/components/Day7Complete.tsx` (add circle celebration line)
- **Migration**: Add columns to `challenges`/`challenge_participants`, enable realtime on `challenge_progress`

