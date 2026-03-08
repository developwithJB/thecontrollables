

## Plan: Move Health Import to Settings & Refocus History Views

### 1. Move Health Data Import into Profile Settings

**Current state**: `HealthDataSync` dialog is triggered from the `BrainBodyTracker` card on the dashboard via "Connect" / "Synced" / "Or import from Apple Health" buttons.

**Changes**:

| File | Change |
|---|---|
| `src/components/ProfileSettingsModal.tsx` | Add a new "Health Data" section (between Reminders and Timezone) with a button to open `HealthDataSync`. Import and render the dialog. |
| `src/components/dashboard/BrainBodyTracker.tsx` | Remove the `HealthDataSync` import, the `syncOpen` state, all three buttons that open it, and the `<HealthDataSync>` render. Replace with a simple "Log wellness" prompt when no data exists. |

### 2. Refocus Week/Month/Year Views on User Activity

**Current state**: `SnapshotHistory` shows snapshot (7-day reset) cards grouped by week/month/year. Each `WeekCard` shows snapshot name, days completed, XP earned, and controllable breakdown per snapshot.

**Proposed change**: Instead of showing controllable-level breakdowns per snapshot card, show **what the user actually did** — completed actions, check-ins, promises kept, wellness logs — as an activity summary for each time period.

| File | Change |
|---|---|
| `src/components/dashboard/SnapshotHistory.tsx` | In the `WeekCard` component, replace the per-controllable XP breakdown with an activity summary: actions completed count, check-ins done, promises kept ratio, wellness logs count. Query `completed_actions`, `daily_checkins`, `integrity_logs`, `wellness_logs` for the snapshot's date range. |
| `src/components/dashboard/SnapshotHistory.tsx` | In the Month view, show aggregated activity stats (total actions, total check-ins, streak info) instead of just listing snapshot cards with controllable data. |

### Technical Details

**Settings health import section** will:
- Pass `userId` from the existing prop
- Show last sync date inline (query same as current HealthDataSync)
- Open HealthDataSync dialog on button click

**Activity summary per week card** will query:
- `completed_actions` count + total XP in date range
- `daily_checkins` count in date range  
- `integrity_logs` kept/total ratio in date range
- `wellness_logs` count in date range

This replaces the current per-controllable XP bars with human-readable activity stats like "12 actions completed · 5/7 check-ins · 3 promises kept".

