

# Expand Build Archetype Mapping

## Problem

The database function that computes archetypes only handles 4 specific max/min controllable combinations:

| Max | Min | Archetype |
|-----|-----|-----------|
| all >= 3.0 | — | stable_build |
| habit | wellness | driven_but_depleting |
| awareness | environment | clear_but_fighting_friction |
| wellness | habit | capable_but_inconsistent |
| **everything else** | — | **custom_build (unmapped)** |

There are 20 possible max/min pairings (5 controllables x 4 remaining). Only 3 are mapped, so **most users hit the fallback** and see "Unmapped Pattern" — which feels directionless and discouraging.

Meanwhile, the frontend already defines 12 archetypes that are never assigned:
- strong_foundation, momentum_rebooting, scattered_focus, low_battery_mode, tunnel_vision, overclocked, high_friction_zone, grind_mode

## Solution

### 1. Expand the SQL archetype logic (database migration)

Replace the 4-rule `IF/ELSIF` block with comprehensive coverage of all 20 max/min combos, plus score-range rules for edge cases (e.g., all scores low, all scores mid-range).

**New mapping (all 20 combos covered):**

| Max | Min | Archetype | Rationale |
|-----|-----|-----------|-----------|
| all >= 3.0 | — | stable_build | Everything strong |
| all <= 1.5 | — | momentum_rebooting | Everything low, restart mode |
| habit | wellness | driven_but_depleting | Executing but running empty |
| habit | awareness | grind_mode | Doing reps but not reflecting |
| habit | perspective | tunnel_vision | Heads-down, no zoom-out |
| habit | environment | high_friction_zone | Good habits, bad setup |
| awareness | wellness | low_battery_mode | Sees clearly but drained |
| awareness | habit | scattered_focus | Aware but not executing |
| awareness | perspective | tunnel_vision | Noticing but not reframing |
| awareness | environment | clear_but_fighting_friction | Clear-eyed, messy space |
| perspective | wellness | low_battery_mode | Good mindset, low energy |
| perspective | habit | capable_but_inconsistent | Sees the path, doesn't walk it |
| perspective | awareness | strong_foundation | Grounded but autopilot |
| perspective | environment | clear_but_fighting_friction | Right frame, wrong room |
| wellness | habit | capable_but_inconsistent | Healthy but undisciplined |
| wellness | awareness | strong_foundation | Body good, mind on autopilot |
| wellness | perspective | strong_foundation | Solid base, needs reframing |
| wellness | environment | overclocked | Energy high, space chaotic |
| environment | habit | scattered_focus | Clean space, no reps |
| environment | awareness | grind_mode | Optimized space, no reflection |
| environment | perspective | grind_mode | Structured but no vision |
| environment | wellness | driven_but_depleting | Dialed-in setup, burning out |

### 2. Improve the fallback archetype in frontend

Rename the fallback from "Unmapped Pattern" to something encouraging. Change `unmapped_pattern` to use friendlier copy:

- **Label**: "Unique Pattern" (instead of "Unmapped Pattern")
- **Emoji**: keep compass
- **Description**: "Your build is uniquely balanced. Focus on the area that feels most important to you right now."
- **Theme**: keep neutral

This way even if someone somehow hits the fallback, it feels intentional rather than broken.

### 3. Add any missing archetype entries to frontend

All archetype keys used in the new SQL mapping already exist in `ARCHETYPE_LABELS` -- no new frontend entries needed, just the fallback rename.

---

## Files

| File | Action |
|------|--------|
| Database migration (new SQL) | Replace `compute_build_scores` function with expanded archetype logic |
| `src/lib/build.ts` | Rename `unmapped_pattern` label/description to "Unique Pattern" with encouraging copy |

## Technical Details

### SQL Migration

```sql
CREATE OR REPLACE FUNCTION public.compute_build_scores(p_assessment_id uuid)
...
  -- Assign archetype based on rules
  IF v_awareness >= 3.0 AND v_perspective >= 3.0 AND v_habit >= 3.0 AND v_wellness >= 3.0 AND v_environment >= 3.0 THEN
    v_archetype := 'stable_build';
  ELSIF v_overall <= 1.5 THEN
    v_archetype := 'momentum_rebooting';
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'wellness' THEN
    v_archetype := 'driven_but_depleting';
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'awareness' THEN
    v_archetype := 'grind_mode';
  -- ... (all 20 combos)
  ELSE
    v_archetype := 'unmapped_pattern';
  END IF;
```

### Frontend change

Update the `unmapped_pattern` entry in `ARCHETYPE_LABELS`:
- label: "Unique Pattern"
- description: "Your build is uniquely balanced. Focus on the area that feels most important to you right now."

### Existing users

Users who already have `custom_build` or `unmapped_pattern` stored will get re-mapped the next time they take the assessment. No data migration needed -- existing scores stay as-is, but the frontend fallback will now show "Unique Pattern" instead of "Unmapped Pattern" immediately.
