

# UI Simplification & Page Cleanup Pass

## TODAY (Home.tsx) — ~746 lines → streamlined synthesis page

**New top-to-bottom order:**
1. `GreetingBanner` (keep as-is)
2. `DailyBriefingCard` — rename/repurpose `DailyAlignmentSpotlight` as the morning AI brief, or add a new `DailyBriefingCard` import if one exists. Currently `DailyAlignmentSpotlight` renders near the top as a promo — convert it to the single morning brief.
3. `TodayActions` carousel (move up, right after briefing)
4. `PlanVsActualView` (keep, but remove `FirstDashboardBanner` wrapper — show a small "Connect calendar/wearable" inline prompt if data is missing instead of the large banner)
5. `CompactRingsRow` (keep)
6. `ForecastCard` (keep)
7. `AskDashboardBar` (move DOWN to after Forecast, before footer)
8. Footer

**Remove/stop rendering on Today:**
- `ControllablePoweredBy` strip at top (line 494) — remove from Today render
- `WelcomeBackBanner` (line 496) — keep logic but move inside GreetingBanner or remove standalone render
- `DailyAlignmentSpotlight` as a promo card — either convert to DailyBriefing or remove
- `MainQuestModule` (line 532-543) — already conditionally hidden with season, but remove entirely from Today; it belongs on Growth if anywhere
- `SnapshotReviewCard` (line 546-554) — move to Growth
- `AIRecommendedActions` (line 622) — remove from Today (Forecast is sufficient; recommendations live on Growth)
- `FirstDashboardBanner` large connection prompt (line 611-615) — replace with a small inline "connect" nudge inside PvA section
- Mission Edit Dialog (line 718-737) — keep but simplify or move trigger to settings

**Net result:** Greeting → Brief → Actions → Plan vs Actual → Rings → Forecast → Ask → Footer. ~7 cards max.

## PLAN (Planner.tsx) — already clean, minor tweaks

**Changes:**
- Move `ControllablePoweredBy` strip below header or remove from visible render (line 299)
- If no calendar connected: `PlannerCalendarConnect` should render prominently at top instead of buried at bottom
- If calendar connected: show a small status bar with last sync time (derive from `connections` data)
- Add a lightweight CTA button "View Plan vs Actual on Today" that navigates to `/home#pva`
- Remove or hide `PlannerWellnessBanner` (line 300) — body context belongs on Today/Body, not duplicated here. Keep energy-aware nudge only if it's a single line, not a card.

## BODY (Wellness.tsx) — already close, minor reorder

**New order:**
1. Header (keep)
2. Remove `ControllablePoweredBy` strip from visible render (line 101)
3. `WearableSummaryCard` (keep at top — already there)
4. `WearableTrendsCard` (keep)
5. `BrainBodyTracker` — relabel as manual fallback, demote visually (smaller heading, collapsed by default if wearable connected)
6. `WellnessFuelSummary` (keep)
7. `WellnessGoalsCard` (keep)
8. Remove `DailyOSCard` (line 119-127) — Today owns this role
9. `WellnessStreakHistory` — wrap in a collapsible/expandable section instead of full card
10. Add small link: "See how your body data affects your day → Today"
11. Footer

## GROWTH (Growth.tsx) — absorb demoted modules

**Keep everything currently on Growth.** Additionally:
- Move `MainQuestModule` here (from Today) as a fallback for users without seasons
- Move `SnapshotReviewCard` here (from Today)
- Move `AIRecommendedActions` here (from Today) — this is where deeper AI reflection lives
- Keep `ControllablePoweredBy` on Growth (it's appropriate here)
- Keep `GameRulesSection` and `DashboardManualSection` (they belong on the self-leadership page)
- Keep `BuildOverviewModule`, `ControllableLevelsCard`, `CircleCard`, `SeasonBanner`, `ResetProgressModule`

## MONEY (Money.tsx) — simplify aggressively

**Changes:**
- Remove `ControllablePoweredBy` strip from visible render (line 39)
- Flatten tabs: remove the 3-tab layout. Show a single scrollable page:
  1. `FinancialControllables` summary (behavioral insight — keep)
  2. `MoneyOverview` (monthly status — keep)
  3. `BillsSubscriptions` (upcoming payments — keep, but render inline, not in a tab)
  4. `SavingsGoals` (keep, render inline after bills)
  5. Demote `AccountManager`, `BudgetManager`, `TransactionHistory`, `TransactionImporter` — wrap in an expandable "Manage Details" section or move to a secondary "details" toggle at the bottom
- The main view should show: insight → status → upcoming → goals. That's it.

## Files to modify

| File | Key changes |
|---|---|
| `src/pages/Home.tsx` | Reorder to Greeting→Brief→Actions→PvA→Rings→Forecast→Ask→Footer. Remove ControllablePoweredBy, MainQuestModule, SnapshotReviewCard, AIRecommendedActions, FirstDashboardBanner. Move AskDashboardBar down. |
| `src/pages/Wellness.tsx` | Remove DailyOSCard, remove ControllablePoweredBy. Wrap streak history in collapsible. Add "→ Today" link. |
| `src/pages/Planner.tsx` | Remove ControllablePoweredBy, remove/minimize PlannerWellnessBanner. Add "View Plan vs Actual" CTA. Promote calendar connect if disconnected. |
| `src/pages/Growth.tsx` | Add MainQuestModule, SnapshotReviewCard, AIRecommendedActions imports from Today. Keep existing. |
| `src/pages/Money.tsx` | Remove tabs. Render single-scroll: insight→overview→bills→goals. Wrap account/transaction tools in expandable section. Remove ControllablePoweredBy. |

## What does NOT change
- No component files deleted
- All hooks, data, and logic preserved
- Route paths unchanged
- Dialogs (SeasonSetup, SeasonComplete, SnapshotSelector, MissionEdit, ConfirmLastNight, ValidatePlan) stay on Home — they're modal overlays triggered by state
- Onboarding/WelcomeBack flows stay on Home

