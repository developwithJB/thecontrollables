

## Plan: Remove Weekly Wellness Report from Dashboard

The `WeeklyWellnessReport` component is currently rendered on the main Dashboard tab. It should be removed from there and kept only in the Experience/Weekly Patterns area.

### Change

**Edit: `src/pages/Dashboard.tsx`**
- Remove lines 1120-1123 (the `WeeklyWellnessReport` rendering block)
- The import on line 65 can also be removed if it's not used elsewhere in the file

One file, one edit. No other changes needed.

