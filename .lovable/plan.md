

# Google Calendar-Style Planner + Projects → Chapters Rename

## Part 1: Planner Redesign — Google Calendar Mobile Views

The uploaded screenshots show Google Calendar's three view levels: **Month** (grid with event chips), **Week** (7-column time grid), and **Day** (single-column timeline with time slots). The current planner has a horizontal date strip on mobile → flat task list. No month view, no time-based visual layout.

### New View System

Add a **view toggle** (Month / Week / Day) to the planner header, matching Google Calendar's natural zoom levels.

**Month View** (new component: `PlannerMonthGrid.tsx`):
- Calendar grid showing the full month with day cells
- Each cell shows date number + up to 2-3 truncated event chips (colored by chapter)
- Tap a day → switches to Day view for that date
- Swipe/arrows to navigate months
- Current day highlighted with accent circle (matching Google Calendar style)

**Week View** — Redesign `PlannerWeekGrid.tsx` for mobile:
- 7-column time grid with hour rows (like the uploaded week screenshot)
- Events rendered as positioned blocks based on start_time/end_time
- All-day items shown as chips at top of each column
- Tap an event to edit; tap empty space to create
- Current implementation stays for desktop (it's already good), but mobile gets the time-based column view

**Day View** — Redesign `PlannerDayView.tsx`:
- Full timeline layout with hour markers on the left (4 AM – 11 PM)
- Events rendered as colored blocks at their time positions (like Google Calendar day view screenshot)
- Untimed tasks listed above the timeline
- All-day events as chips at top
- Keep existing drag-to-reorder for untimed tasks
- Meal slots shown inline at their planned times

### Implementation

**New file**: `src/components/planner/PlannerMonthGrid.tsx`
- Month calendar grid with event chip previews
- Uses date-fns for month calculations
- Shows chapter-colored event indicators

**Modified**: `src/components/planner/PlannerDayView.tsx`
- Add timeline layout with hour markers
- Position timed items as absolute blocks within time slots
- Keep untimed items as a sortable list above the timeline

**Modified**: `src/components/planner/PlannerWeekGrid.tsx`
- Add mobile variant with time-based column layout
- Desktop keeps current compact grid

**Modified**: `src/pages/Planner.tsx`
- Add `viewMode` state: "month" | "week" | "day"
- View toggle in header (3 buttons or segmented control)
- Month view navigation (prev/next month)
- Tapping a day in month view → switches to day view
- Mobile: all 3 views available. Desktop: week + day (month optional)

**Modified**: `src/components/planner/PlannerDateStrip.tsx`
- Show month name + year in month mode
- Show week range in week mode
- Show full date in day mode

### Visual Style
- Event blocks colored by chapter (using `color_hex` from project/chapter)
- Hour grid lines subtle (`border-border/30`)
- Current time indicator: red/accent horizontal line
- Matches the dark theme from screenshots

---

## Part 2: Rename "Projects" → "Chapters"

Rename all user-facing text from "Project/Projects" to "Chapter/Chapters". The database table stays as `projects` — this is a UI-only rename. Internal variable names (e.g., `useProjects`, `Project` type) stay unchanged for stability.

### Files to update (user-facing strings only):

| File | Changes |
|---|---|
| `src/components/dashboard/ProjectManager.tsx` | Sheet title "Projects" → "Chapters", "Add Project" → "Add Chapter", "5 active projects max" → "5 active chapters max", placeholder "Project name" → "Chapter name", "5 active projects keeps focus sharp" → "5 active chapters keeps focus sharp" |
| `src/components/dashboard/SeasonSetup.tsx` | Step 3 heading "Create your first Project" → "Create your first Chapter", description "Projects are intention containers" → "Chapters are intention containers", placeholder "Project name" → "Chapter name" |
| `src/components/dashboard/HierarchyExplainer.tsx` | title "Project" → "Chapter", description update |
| `src/components/DashboardManualSection.tsx` | title "Project" → "Chapter", description update, "allocated to projects" → "allocated to chapters" |
| `src/components/planner/PlannerItemEditor.tsx` | Label "Project" → "Chapter" |
| `src/components/planner/PlanVsActualView.tsx` | Mode toggle "Project" → "Chapter", "No project activity" → "No chapter activity", "Assign tasks to projects" → "Assign tasks to chapters" |
| `docs/DAILY_HIERARCHY.md` | Update any project references |
| `README.md` | Update terminology |

---

## Files Summary

### New Files
| File | Purpose |
|---|---|
| `src/components/planner/PlannerMonthGrid.tsx` | Month calendar grid view with event chips |

### Modified Files
| File | Change |
|---|---|
| `src/pages/Planner.tsx` | Add view mode toggle (month/week/day), month navigation, view switching |
| `src/components/planner/PlannerDayView.tsx` | Add timeline layout with hour markers and positioned event blocks |
| `src/components/planner/PlannerWeekGrid.tsx` | Add mobile time-grid variant |
| `src/components/planner/PlannerDateStrip.tsx` | Adapt header text per view mode |
| `src/components/dashboard/ProjectManager.tsx` | Rename labels to "Chapter" |
| `src/components/dashboard/SeasonSetup.tsx` | Rename labels to "Chapter" |
| `src/components/dashboard/HierarchyExplainer.tsx` | Rename to "Chapter" |
| `src/components/DashboardManualSection.tsx` | Rename to "Chapter" |
| `src/components/planner/PlannerItemEditor.tsx` | Rename label to "Chapter" |
| `src/components/planner/PlanVsActualView.tsx` | Rename mode toggle and empty states to "Chapter" |
| `docs/DAILY_HIERARCHY.md` | Update terminology |
| `README.md` | Update terminology |

### No Changes
- Database schema (`projects` table stays as-is)
- Hook names (`useProjects` stays)
- TypeScript types (`Project`, `CreateProjectInput` stay)
- Edge functions (no user-facing project text)

