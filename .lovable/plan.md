

# Season Setup, Project Manager & Planner Integration

## Overview
Three new components plus modifications to hook and editor to enable full Season → Project → Planner flow.

## Files to Create

### 1. `src/components/dashboard/SeasonSetup.tsx`
A full-screen dialog with 4 steps using internal state machine:

**Step 1 — Name**: "What chapter of life are you in?" with free text input + 3 suggestion chips ("New job / career move", "Health reset", "Building something new") that populate the input on tap.

**Step 2 — Theme**: "What's the one thing you most want to move forward in the next 90 days?" Free text, stored as `theme_text`.

**Step 3 — Controllable Focus**: "Which of the 5 Controllables needs the most attention?" Renders 5 `ControllableCard` components in single-select mode. Maps to the `controllable_focus` enum.

**Step 4 — First Project**: Name input, emoji picker (grid of ~20 common emojis), color picker (8 preset hex swatches), controllable tag selector. Auto-suggest project name based on season theme using simple mapping (e.g., health theme → "Daily Movement").

**CTA**: "Start this Season →" calls `startSeason` (updated to accept all fields) then creates project via supabase insert. Invalidates queries and closes.

**Trigger**: Shown on Home when `activeSeason` is null and user is authenticated + onboarded.

### 2. `src/components/dashboard/ProjectManager.tsx`
A sheet/dialog accessible from dashboard settings or season banner:

- **Active Projects list**: Cards showing emoji + name + controllable badge + momentum score bar. Max 5 active enforced with soft message.
- **Create Project form**: Name, emoji grid, color swatches, controllable select. Disabled when 5 active projects exist.
- **Calendar Mapping section**: Per-project, simple input rows: "When event contains [___] → assign to [Project]". CRUD on `project_calendar_mappings`.
- **Pause/Close actions**: Status toggle buttons per project card updating `projects.status`.

### 3. `src/hooks/useProjects.ts`
New hook wrapping project CRUD:
- `useProjects(userId, seasonId)` — fetches active projects for current season
- `createProject` mutation — inserts into `projects` with user_id, season_id
- `updateProject` mutation — status changes, name edits
- `deleteProject` mutation
- `useCalendarMappings(projectId)` — CRUD for `project_calendar_mappings`
- Active project count check (max 5 enforcement)

## Files to Modify

### 4. `src/hooks/useSeason.ts`
- Update `startSeason` to accept `{ name, theme_text, controllable_focus }` and insert all fields.
- Update the `Season` interface to include `theme_text`, `ends_at`, `controllable_focus`.

### 5. `src/components/planner/PlannerItemEditor.tsx`
- Import `useProjects` hook
- Add a Project selector below the Type/Energy row: small horizontal scroll of project pills (emoji + name, colored by `color_hex`)
- Add `project_id` to state, pre-populate from calendar keyword match if title matches a mapping
- Pass `project_id` through `onSave` in both create and update paths

### 6. `src/hooks/usePlanner.ts`
- Add `project_id?: string | null` to `PlannerItem`, `CreatePlannerItemInput`, and `UpdatePlannerItemInput` interfaces
- Include `project_id` in insert/update mutations

### 7. `src/pages/Home.tsx`
- Import `SeasonSetup`
- Render `<SeasonSetup open={!activeSeason && isOnboarded} ... />` gated on auth + onboarding complete + no active season

## UI Patterns
- Emoji picker: 20-item grid of common emojis in a popover
- Color picker: 8 preset hex circles (indigo, blue, green, emerald, amber, rose, purple, slate)
- Project pills in planner editor: horizontal scroll with `color_hex` as left border/bg tint
- All new components use existing shadcn Dialog/Sheet, Button, Input, Card primitives

