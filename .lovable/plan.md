

# Fix Controllable Emojis & Align Hierarchy

## Problem 1: Wrong Emojis in SeasonSetup & ProjectManager

Two files use incorrect animal emojis instead of the canonical set:

| Controllable | Correct | SeasonSetup.tsx | ProjectManager.tsx |
|---|---|---|---|
| Awareness | 🦉 | 🦉 ✓ | 🦉 ✓ |
| Perspective | 🐢 | 🦅 ✗ | 🦅 ✗ |
| Habit | 🦈 | 🐺 ✗ | 🐺 ✗ |
| Wellness | 🛰️ | 🐬 ✗ | 🐬 ✗ |
| Environment | 🚀 | 🦁 ✗ | 🦁 ✗ |

**Fix**: Update both `SeasonSetup.tsx` (line 21-24) and `ProjectManager.tsx` (line 16-19) to use the canonical emojis: 🐢, 🦈, 🛰️, 🚀.

Additionally, eliminate these local emoji arrays by importing from the single source of truth in `src/lib/controllableTheme.ts` (which already has the correct emojis). Add a utility export there so components can get the full list without redeclaring.

## Problem 2: Mission/Focus No Longer Fit the Hierarchy

The current hierarchy is: **Mission → Snapshot → Daily Check-In**

The new correct hierarchy is:
```text
Season (life arc)
  └── Projects (what you're building)
        └── Calendar Blocks (when you're doing it)
              └── Tasks (what specifically happens)
                    └── Actuals (body + behavior data)
```

"Mission" (a persistent direction/north star stored in `main_quests`) and "Focus" (the active Snapshot's journey title) are legacy concepts that predate Seasons/Projects. They need to be repositioned:

- **Mission** becomes the **Season's theme** — the Season name/theme IS the direction. Remove standalone Mission as a separate concept. The `main_quests` table stays for backward compat but the UI should show the Season name where it currently shows "Mission."
- **Focus** (Snapshot journey) stays as the **weekly pulse within a Project** — unchanged in function, but the hierarchy explainer needs updating.

### Changes

**Files to modify:**

| File | Change |
|---|---|
| `src/lib/controllableTheme.ts` | Export `CONTROLLABLE_LIST` array with type/emoji/label for reuse |
| `src/components/dashboard/SeasonSetup.tsx` | Import from controllableTheme, fix emojis |
| `src/components/dashboard/ProjectManager.tsx` | Import from controllableTheme, fix emojis |
| `src/components/dashboard/HierarchyExplainer.tsx` | Replace 3-level Mission/Snapshot/Daily with 5-level Season/Project/Calendar/Task/Actuals |
| `src/components/dashboard/GreetingBanner.tsx` | Replace "Mission" indicator with Season name; keep "Focus" as Snapshot |
| `src/components/dashboard/MainQuestModule.tsx` | Repurpose: if user has an active Season, hide the standalone Mission creator; show Season name as direction instead |
| `src/components/DashboardManualSection.tsx` | Update HIERARCHY_ITEMS from Mission/Snapshot/Daily to the new 5-level structure |
| `src/components/onboarding/OnboardingMissionReveal.tsx` | Rename from "Mission" to "Season Direction" — show Season theme as the north star |
| `src/pages/Home.tsx` | Wire Season name into GreetingBanner's direction indicator instead of `activeQuest?.title`; keep Quest as fallback for users without a Season |

### Hierarchy Explainer New Levels

```text
Season     → "Your life chapter. The big picture arc."
Project    → "What you're building within this season."
Calendar   → "When you're doing it. Blocks of time."
Task       → "What specifically happens in each block."
Actuals    → "What your body and behavior recorded."
```

### Backward Compatibility
- Users without a Season still see Mission/Quest as before (fallback)
- The `main_quests` table and hooks remain; UI just prefers Season when one exists
- Snapshots remain the weekly pulse, unchanged

