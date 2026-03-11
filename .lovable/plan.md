

# Assessment Repositioning + First Dashboard Banner

## Two changes

### 1. Assessment intro copy change
In `OnboardingAssessment.tsx`, the assessment currently opens without context about integrations being done. Add a brief intro header before the questions begin: **"One last thing — let's see where to focus first"** as a subtitle. This is a copy-only change to the component's header area.

### 2. First Dashboard Load Banner
Create a dismissible banner component shown at the top of the Plan vs. Actual section on `Home.tsx` for the first 3 dashboard visits.

**Component**: `src/components/dashboard/FirstDashboardBanner.tsx`
- Props: `calendarConnected: boolean`, `wearableConnected: boolean`
- If calendar connected + wearable skipped: "We've pulled in your week from Google Calendar. Add your wearable in Settings to see the full Plan vs. Actual picture."
- If calendar connected + wearable connected: "Your first wearable sync will arrive tomorrow morning. Come back then to see your Plan vs. Actual."
- If neither connected: "Connect your calendar and wearable in Settings to unlock Plan vs. Actual."
- Tappable to dismiss; auto-dismissed after 3 dashboard visits
- Dismissal stored in `localStorage` key `first_dashboard_banner_dismissed`

**Integration in `Home.tsx`**:
- Use existing `useDashboardVisitCount()` hook (already imported)
- Check `localStorage` for dismissal flag
- Render banner above the `PlanVsActualView` section when not dismissed and visit count <= 3
- Determine connection state from existing `wearableConnected` variable and check integrations for calendar

## Files to change

| File | Change |
|------|--------|
| `src/components/onboarding/OnboardingAssessment.tsx` | Add "One last thing" intro header |
| `src/components/dashboard/FirstDashboardBanner.tsx` | New — dismissible contextual banner |
| `src/pages/Home.tsx` | Render FirstDashboardBanner above PvA view |

