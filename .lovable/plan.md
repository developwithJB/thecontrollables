

## Plan: Move Controllable Levels into the Guide Tab

### What Changes

1. **Remove from main dashboard** (`src/pages/Dashboard.tsx` ~line 1077-1080): Delete the `ControllableLevelsCard` render from the main tab.

2. **Add to "guide" tab** (`src/pages/Dashboard.tsx` ~line 1370): Insert `ControllableLevelsCard` into the "guide" tab section, placed between the header and `GameRulesSection` — so users see their levels alongside the Controllables philosophy content.

### Files Changed

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Remove `ControllableLevelsCard` from main tab (~line 1077-1080), add it to guide tab before `GameRulesSection` (~line 1371) |

Single file change, no new components or DB changes needed.

