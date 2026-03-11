

# Plan vs. Actual View Fixes

Four changes to `PlanVsActualView.tsx` plus minor prop-threading in `Planner.tsx` and `Home.tsx`.

---

## 1. Round all wearable display values

In `PlanVsActualView.tsx`, apply formatting at the display layer:

- **Recovery**: `Math.round(health.recovery)` → e.g. `72%`
- **HRV**: `Math.round(health.hrv)` → e.g. `136ms`
- **Strain**: `health.strain.toFixed(1)` → e.g. `4.4`
- **Sleep**: Already uses `Math.round(health.sleepMinutes / 60)` but the minutes remainder can be fractional from the API. Use `Math.floor(health.sleepMinutes / 60)` for hours and `Math.round(health.sleepMinutes % 60)` for minutes → e.g. `7h 58m`

Also apply the same rounding in `generateObservation()` where recovery/sleep values are interpolated into strings.

---

## 2. Replace "X missed" with neutral language

In the week summary bar (lines 174-178):

- Remove `<span className="text-destructive">{weekStats.missed} missed</span>`
- Compute `remaining = weekStats.total - weekStats.done` (items not yet done)
- If all done: show `<span className="text-perspective">All done</span>`
- Otherwise: show `<span className="text-muted-foreground">{weekStats.done} completed · {remaining} remaining</span>`

Also in `statusConfig`, change the `missed` entry to use the same neutral `planned` styling (muted, no red) and rename its label to something like "Incomplete". Remove any red/destructive color classes from this status.

In `generateObservation()`, replace the word "missed" with "incomplete" in the observation string.

---

## 3. Contextual empty wearable states

Add a new prop to `PlanVsActualView`:

```ts
interface PlanVsActualViewProps {
  days: PvADay[];
  onPushToCalendar?: () => void;
  view?: "day" | "week";
  isWearableConnected?: boolean; // NEW
}
```

Pass `isConnected` from `useHealthData` through `Planner.tsx` and `Home.tsx`.

In the Body column empty state (line 272), replace the single "No wearable data" with:

- **Future day** (`!isPast && !isToday(date)`): render nothing — blank column
- **Wearable not connected**: show "Connect WHOOP, Oura, or Fitbit to see your body data here" with a `<Link to="/integrations">` in muted text
- **Wearable connected, no data for day**: show "Wearable data will appear here once synced" in muted gray

---

## 4. Filter calendar noise in PLANNED column

Add state: `const [showAllCalEvents, setShowAllCalEvents] = useState(false)`

Add a small toggle at the top of the component (below header): "Show all calendar events" switch, off by default.

When filtering items for display, if `!showAllCalEvents`, filter out items where `item.type === "external_event"`. This keeps only planner-created tasks, time blocks, and routines visible by default.

---

## Files to change

| File | Change |
|------|--------|
| `src/components/planner/PlanVsActualView.tsx` | All four fixes: rounding, missed→remaining, empty states, calendar filter |
| `src/pages/Planner.tsx` | Pass `isWearableConnected` to `PlanVsActualView` |
| `src/pages/Home.tsx` | Pass `isWearableConnected` to `PlanVsActualView` |

