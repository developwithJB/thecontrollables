

# Fix Command Mode Actions + Condense Mode Toggle

## Problems
1. **Command Mode actions navigate away** — clicking "Start Reset" goes to `/reset`, clicking "Log Wellness" switches to Control mode. Actions should be completable inline without leaving Command Mode.
2. **Mode toggle too wide for mobile** — the "Command" and "Control" text labels alongside icons make the header overflow horizontally on small screens.

## Plan

### 1. Condense the Mode Toggle (`DashboardModeToggle.tsx`)
- Replace the horizontal pill with two **icon-only buttons** stacked with a tiny label underneath each icon.
- Use a compact layout: two square-ish tap targets side by side, each with icon on top and label below in `text-[10px]`.
- Total width shrinks from ~200px to ~80px, eliminating horizontal overflow.

### 2. Make Command Mode Actions Inline (`CommandModeView.tsx` + `FocusedActionCard.tsx`)
Instead of navigating away or switching to Control mode, each action opens its relevant UI **inline within Command Mode** using expandable card sections or embedded dialogs:

- **Daily Reset**: Embed the day's reading content and completion button directly in the action card (pull from `getDayContent`). Mark complete without leaving.
- **Log Wellness**: Show the `WellnessLogger` inline below the action card when tapped.
- **Log Time**: Show the time log form (invested/wasted inputs) inline.
- **Review Promises**: Show pending promises list with resolve buttons inline.
- **Ask Guide**: Already works (opens AI panel overlay) — no change needed.

**Implementation approach:**
- Add an `expandedActionId` state to `CommandModeView`.
- When user clicks the action button, instead of calling `onAction()` which navigates, set `expandedActionId` to show the inline form.
- Each inline form has a "Done" button that marks the action complete and advances the queue.
- Keep the `onOpen*` callbacks as fallbacks for the "I want to..." quick actions (those can still navigate).

### 3. Dashboard Header Width Fix (`Dashboard.tsx`)
- Ensure the header uses `overflow-x-hidden` or `max-w-full` to prevent any horizontal scroll.
- The toggle condensing should resolve this, but add a safety `overflow-hidden` on the header container.

### Files to Change
| File | Change |
|------|--------|
| `src/components/dashboard/DashboardModeToggle.tsx` | Icon-only buttons with tiny labels below, much narrower |
| `src/components/dashboard/CommandModeView.tsx` | Add inline expanded state; embed wellness/time/reset/promise forms |
| `src/components/dashboard/FocusedActionCard.tsx` | Accept `children` prop for inline expanded content |
| `src/pages/Dashboard.tsx` | Pass necessary data/callbacks for inline forms; add overflow protection to header |

