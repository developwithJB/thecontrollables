

# Plan: Push Planner Items to Google Calendar

## Problem
Currently the Google Calendar sync is one-way: it imports events FROM Google Calendar into the planner. Users cannot push their locally-created planner items (tasks, time blocks) TO Google Calendar.

## Solution
Add a "push to Google Calendar" capability via a new edge function and expose it through the UI at two levels: per-item (in the item's dropdown menu) and bulk (export button in the PvA view / calendar connect card).

## Changes

### 1. New edge function: `supabase/functions/planner-gcal-push/index.ts`

- Accepts `{ connection_id, item_ids: string[] }` (or `{ connection_id, date: string }` to push all items for a day)
- Authenticates user, fetches their `planner_connections` row, refreshes token if expired (same pattern as `planner-gcal-sync`)
- For each planner item:
  - If `external_event_id` is already set and `connection_id` matches, PATCH the existing Google Calendar event
  - Otherwise, POST to `https://www.googleapis.com/calendar/v3/calendars/primary/events` to create a new event
  - Map `title` → `summary`, `description` → `description`, `scheduled_date` + `start_time`/`end_time` → `start`/`end` (use all-day event if no times)
  - Save the returned Google event ID back to the planner item's `external_event_id` and `connection_id`
- Return `{ pushed: number, errors: string[] }`

### 2. `src/hooks/usePlanner.ts` — add `pushToGoogleCal` mutation

- Add a `pushToGoogleCal` mutation inside `usePlannerConnections` that calls the new edge function
- Invalidates `planner-items` on success so `external_event_id` updates are reflected

### 3. `src/components/planner/PlannerItemRow.tsx` — per-item "Push to Calendar" option

- Add a "Push to Calendar" dropdown menu item (only shown if a Google Calendar connection exists and the item is NOT already an `external_event`)
- Calls `onPushToCalendar(item)` callback

### 4. `src/components/planner/PlannerDayView.tsx` — wire the callback

- Accept `onPushToCalendar` prop and pass it to each `PlannerItemRow`

### 5. `src/pages/Planner.tsx` — connect push logic

- Destructure `pushToGoogleCal` from `usePlannerConnections`
- Pass `onPushToCalendar` to `PlannerDayView` that calls the mutation with the Google connection ID and item ID
- Show toast on success/failure

### 6. `src/components/planner/PlannerCalendarConnect.tsx` — add "Push today" button

- When a Google connection exists, show a second button "Push to Cal" next to "Sync" that pushes all non-external items for today

## Files

| Action | File |
|--------|------|
| Create | `supabase/functions/planner-gcal-push/index.ts` |
| Edit | `src/hooks/usePlanner.ts` — add `pushToGoogleCal` mutation |
| Edit | `src/components/planner/PlannerItemRow.tsx` — add dropdown option |
| Edit | `src/components/planner/PlannerDayView.tsx` — pass callback |
| Edit | `src/pages/Planner.tsx` — wire push logic |
| Edit | `src/components/planner/PlannerCalendarConnect.tsx` — add bulk push button |

