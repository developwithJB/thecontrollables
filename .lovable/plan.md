

# Project Health View — Redesign PlanVsActualView

## Overview
Replace the flat Plan vs. Actual view with a dual-mode component: **Project View** (new default) showing per-project cards, and **Day View** (existing, enhanced with project filtering).

## Data Flow Change
The current `PlanVsActualView` receives `PvADay[]` with flat items. We need to enrich PvA items with `project_id` so the component can group and filter by project.

### Props Changes (`PlanVsActualViewProps`)
- Add `projects?: Project[]` — active projects from `useProjects`
- Extend `PvAItem` with `project_id?: string | null`
- Both `Planner.tsx` and `Home.tsx` will pass `project_id` from planner items into PvA data

### Parent Changes (`Planner.tsx` and `Home.tsx`)
- Import `useProjects` hook, pass `activeProjects` to `PlanVsActualView`
- Include `project_id: item.project_id` in PvA item mapping

## Component Redesign (`PlanVsActualView.tsx`)

### Mode Toggle
Replace the Day/Week toggle with a **Project / Day** toggle at the top. Week navigation remains available in Day mode.

### Mode 1: Project View (new default)
One card per active project containing:
- **Header**: emoji + name + color accent border + controllable badge
- **Stats row**: `X blocks scheduled · Y with data · Z tasks done`
- **Recovery**: Average recovery score across days that have items for this project
- **Momentum**: Compare this week's completion rate vs last week → show ↑ ↓ → arrow
- **Synthesis**: Show the daily synthesis line from the most recent day that has items for this project
- **Expandable**: Tap card to expand day-by-day breakdown filtered to that project's items

An "Unassigned" card collects items with no `project_id`.

### Mode 2: Day View (enhanced existing)
- **Project filter chips** at top: horizontal scroll of project pills (emoji + name, colored). Tap to filter. "All" chip selected by default.
- When filtered, only show items matching that project and health data for days with that project's blocks.
- **Summary bar replacement**: Instead of "X done · Y missed · Z planned", show per-project chips: "📱 App Launch: 3/4 · 💪 Fitness: 1/2" — tappable to filter to that project.

### Momentum Calculation
Simple client-side: compare `done / total` ratio for current week items vs items from `days` that fall in previous week range. If no previous week data available, show →.

## Files

| File | Change |
|------|--------|
| `src/components/planner/PlanVsActualView.tsx` | Full redesign with dual mode, project cards, filter chips |
| `src/pages/Planner.tsx` | Pass `project_id` in PvA items, pass `activeProjects` prop |
| `src/pages/Home.tsx` | Same — pass `project_id` in PvA items, pass `activeProjects` prop |

No database changes needed — all data already available via existing tables and hooks.

