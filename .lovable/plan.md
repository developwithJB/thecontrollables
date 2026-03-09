

# Unified Daily Hub — Merge Everything Into One Flow

## Problem

The dashboard currently scatters daily actions across too many separate screens and modules: 5 Rings, wellness logging, time logging, screen time, meal planning, promise reviews, and reset check-ins all live in different places. The user has to mentally juggle multiple systems. It should feel like one clear daily flow with a single day summary and weekly review.

## Solution

Merge all daily tracking into a **single unified "Today" view** in Command Mode. The 5 Rings become the organizing framework — each ring can auto-fill from its corresponding daily action. Add an AI-powered **Daily Recap** (end of day) and **Weekly Review** (end of week) that analyzes everything together.

## Architecture

```text
Command Mode Layout (new):
┌─────────────────────────────┐
│  DailyRings (hero, as-is)   │
├─────────────────────────────┤
│  Ring Action Cards           │
│  (each ring expands inline   │
│   with its relevant tracker) │
│                              │
│  Notice → reflection prompt  │
│  Choose → perspective prompt │
│  Prove  → promise/habit log  │
│  Charge → wellness + meals   │
│  Align  → screen time + env  │
├─────────────────────────────┤
│  Daily Recap Card            │
│  (AI summary when 3+ done)   │
├─────────────────────────────┤
│  Weekly Review Card          │
│  (AI summary, visible Sun+)  │
└─────────────────────────────┘
```

## Detailed Changes

### 1. Enhance `RingActionCard.tsx` — Embed Relevant Trackers

Each ring card becomes the **single entry point** for its related daily action. Instead of separate screens:

| Ring | What gets embedded |
|------|--------------------|
| **Notice** | Existing reflection prompt (stays as-is) |
| **Choose** | Existing perspective prompt (stays as-is) |
| **Prove** | Inline promise review + habit log (move `InlinePromiseReview` here) |
| **Charge** | Inline wellness form (sleep/movement/nutrition) + quick meal log (move `InlineWellnessForm` here) |
| **Align** | Inline screen time form + environment prompt (move `InlineScreenTimeForm` here) |

When a user completes the embedded tracker, the ring auto-fills. One action = one ring filled.

### 2. Simplify `CommandModeView.tsx`

- Remove the separate `FocusedActionCard` queue — rings now handle all daily actions
- Remove standalone quick-action buttons for Eat, Screen, Health (moved into ring cards)
- Remove `ControllableHub` from Command Mode (it's operator/power-user — keep in Control Mode only)
- Keep only: DailyRings hero → Daily Recap → Weekly Review

### 3. New Component: `DailyRecapCard.tsx`

- Shows when 3+ rings completed OR at end of day
- Calls existing `generate-insights` edge function with today's data (rings, wellness, time, promises)
- Displays: "Today you noticed X, chose Y, proved Z. Your wellness battery was at 3.8/5. You invested 120 min and kept 2/2 promises."
- Uses `google/gemini-2.5-flash` for fast, cheap generation
- Stored in a new `daily_recaps` column on the existing `daily_rings` table (text, nullable)

### 4. New Component: `WeeklyRecapCard.tsx`

- Visible from Sunday onward (or when user has 5+ days of rings data in current week)
- Aggregates: rings completion rate, wellness averages, time totals, promise-keeping rate
- AI generates a 2-3 sentence weekly reflection
- Uses the existing `WeeklyWellnessReport` data + rings data
- Stored per-week (can use existing patterns or a simple localStorage cache)

### 5. Update `useDailyRings.ts` — Wire to Existing Systems

- When `charge` ring is completed via the wellness form, also call `logWellness()` so `wellness_logs` stays populated
- When `prove` ring is completed via promise review, also call `resolvePromise()` so `integrity_logs` stays populated
- When `align` ring is completed via screen time, also write to `health_sync_data`
- This ensures backward compatibility — all existing analytics, streaks, and reports continue working

### 6. DB Migration: Add `daily_recap` Column

```sql
ALTER TABLE public.daily_rings ADD COLUMN daily_recap text NULL;
```

No new table needed — the recap is per-day, per-user, which maps to the existing `daily_rings` row.

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/dashboard/DailyRecapCard.tsx` | AI daily summary card |
| `src/components/dashboard/WeeklyRecapCard.tsx` | AI weekly summary card |

## Files to Edit
| File | Change |
|------|--------|
| `src/components/dashboard/RingActionCard.tsx` | Embed wellness, time, promise, screen time forms per ring |
| `src/components/dashboard/CommandModeView.tsx` | Remove FocusedActionCard queue, ControllableHub, standalone quick actions; add Recap cards |
| `src/hooks/useDailyRings.ts` | Wire ring completions to existing data systems (wellness_logs, etc.) |
| `src/components/dashboard/DailyRings.tsx` | Pass through additional handlers for embedded forms |
| DB migration | Add `daily_recap` column |

## What Stays Unchanged
- Control Mode — untouched, all its cards remain
- `wellness_logs`, `time_logs`, `integrity_logs` tables — still written to via ring actions
- Experience tab — still reads from existing tables
- All existing hooks (`useWellness`, `useDashboardSummary`, etc.) — still work

## UX Result
- User opens Command Mode → sees 5 rings
- Taps "Charge" → sees wellness form embedded in ring card → fills it → ring fills + wellness logged
- Taps "Prove" → sees promise review → resolves promises → ring fills + integrity updated  
- Taps "Align" → logs screen time + environment note → ring fills
- After 3+ rings: Daily Recap appears with AI analysis
- On Sunday: Weekly Review shows aggregated insights
- One screen. One flow. Clear what to do.

