

# Declutter Home Page — Restore Focus Section with Compact Rings

## Problem

After Today's Actions, the Home page dumps a grid of cards (PlannerCard, MoneyCard, ControllableLevelsTeaser, BuildEntryPoint), DailyAlignmentPromo, SeasonBanner, ResetProgressModule, CircleCard, OperatorConsole, and simplified mode blocks. This creates chaos on what should be a clarity-first command center.

## Solution

After Today's Actions, replace all that clutter with a **Focus section** that includes:

1. **Compact 5-ring indicator** — a small inline version of the daily rings (similar to how mission/focus chips appear in the GreetingBanner). Shows ring completion status at a glance without the full interactive ring UI.
2. **Focus action** — the current focused controllable and its suggested action (from `useFocusMode`), with a single CTA.
3. **Operator Console** stays — it's the AI interaction point and belongs on Home.

Everything else gets removed from Home (those domains already have their own pages: `/wellness`, `/growth`, `/planner`, `/money`).

## What gets removed from Home (lines 512–604)

- `PlannerCard` — already on `/planner`
- `MoneyCard` — already on `/money`
- `ControllableLevelsTeaser` — already on `/growth`
- `BuildEntryPoint` — already on `/growth`
- `DailyAlignmentPromo` — move into settings or keep only in greeting banner
- `SeasonBanner` — move to `/growth`
- `ResetProgressModule` — move to `/growth`
- `CircleCard` — move to `/growth`
- Simplified mode build/XP grid — no longer needed on Home
- `DomainSummaryCards` — redundant with the bottom nav

## What stays after Today's Actions

1. **Compact Rings Row** — small horizontal display of 5 rings with fill status
2. **Focus Section** — powered by `useFocusMode`, shows the current focus controllable + today's plan
3. **Operator Console** — AI chat stays

## Files to change

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Remove clutter blocks (lines 447, 512–604). Add compact rings + focus section after TodayActions. Keep OperatorConsole and dialogs. |
| `src/components/dashboard/CompactRingsRow.tsx` | **New** — small horizontal 5-ring status display (colored dots/mini-rings showing completion) |
| `src/pages/Growth.tsx` | Absorb `ResetProgressModule`, `CircleCard`, `SeasonBanner` that were removed from Home |

