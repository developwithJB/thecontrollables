

# 5-Ring Daily System — "Fill Your Rings"

This is a major feature that replaces the current scattered daily actions with a unified, visually compelling 5-ring system based on The Controllables framework. The rings become the hero of Command Mode.

## Database

**New table: `daily_rings`**
- `id` uuid PK
- `user_id` uuid NOT NULL
- `ring_date` date NOT NULL DEFAULT CURRENT_DATE
- `notice_completed` boolean DEFAULT false
- `notice_response` text NULL
- `choose_completed` boolean DEFAULT false
- `choose_response` text NULL
- `prove_completed` boolean DEFAULT false
- `prove_response` text NULL
- `charge_completed` boolean DEFAULT false
- `charge_response` text NULL
- `align_completed` boolean DEFAULT false
- `align_response` text NULL
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now()
- UNIQUE(user_id, ring_date)
- RLS: users can CRUD their own rows

No duplication — existing `wellness_logs`, `daily_checkins`, etc. stay untouched. The rings table is a new lightweight daily tracker. Completing a ring via the ring UI writes to this table. Later, we can wire existing actions (wellness log, promises) to auto-fill rings too.

## New Components

### 1. `DailyRings.tsx` — The hero visual
- 5 concentric SVG rings (like Apple Health) using the existing controllable CSS colors (`--awareness`, `--perspective`, `--habit`, `--wellness`, `--environment`)
- Each ring: stroke-dasharray animation from 0 to full when completed
- Center shows count (e.g. "3/5") and status label
- Status labels: 0 = "Just Getting Started", 1-2 = "Building Momentum", 3-4 = "Locked In", 5 = "Fully Charged ⚡"
- Tapping a ring opens its detail card

### 2. `RingActionCard.tsx` — Expandable card for each ring
- Shows: ring name, one-sentence meaning, today's prompt, text input (optional), complete button
- On complete: ring animates to full, confetti-like pulse, card collapses
- Ring definitions hardcoded for MVP:

| Ring | Controllable | Prompt |
|------|-------------|--------|
| Notice | Awareness | "What are you noticing about yourself right now?" |
| Choose | Perspective | "What's one thing you can choose to see differently today?" |
| Prove | Habit | "What's the one action that proves who you're becoming?" |
| Charge | Wellness | "What did you do to recharge today?" |
| Align | Environment | "What's one thing you aligned in your surroundings today?" |

### 3. `RingsSummaryBanner.tsx` — Top-level status
- Compact bar above rings: "3 of 5 rings filled · Locked In"
- Copy: "Fill your rings for today." when incomplete, "Fully Charged ⚡" when 5/5

## Hook

### `useDailyRings.ts`
- Fetches today's `daily_rings` row for current user (upserts on first access)
- Exposes: `rings` state, `completeRing(ringKey, response?)`, `completedCount`, `statusLabel`
- Optimistic UI updates with react-query invalidation

## Integration into Dashboard

### Command Mode (`CommandModeView.tsx`)
- Replace the `ControllableHub` at the top with the new `DailyRings` component as the hero
- Keep the `ControllableHub` (operator console) below the rings
- Keep existing `FocusedActionCard` queue below for non-ring actions (reset, promises, time log)

### Control Mode
- No changes — rings are a Command Mode feature

## Visual Design
- SVG rings with `stroke-linecap: round`, smooth `transition: stroke-dashoffset 0.8s ease`
- Each ring uses its controllable color from CSS vars
- Mobile-first: rings centered, ~200px diameter on mobile, ~260px on desktop
- Cards below rings with the existing card styling (rounded-lg, shadow-sm)
- Completion animation: ring fills + scale pulse + brief glow

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/dashboard/DailyRings.tsx` | 5-ring SVG visual + ring detail cards |
| `src/components/dashboard/RingActionCard.tsx` | Individual ring completion card |
| `src/hooks/useDailyRings.ts` | Data layer for daily_rings table |

## Files to Edit
| File | Change |
|------|--------|
| `src/components/dashboard/CommandModeView.tsx` | Add DailyRings above ControllableHub |
| DB migration | Create `daily_rings` table with RLS |

## Scalability Notes
The `daily_rings` table supports future streaks (query consecutive dates), partial progress (change boolean to numeric), team views (join on challenge_participants), and analytics (aggregate queries). The ring definitions are kept in a constants file for easy expansion.

