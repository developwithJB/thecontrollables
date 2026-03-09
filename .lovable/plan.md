

# Upgrade 5 Rings Into Real Problem-Solving Tools

## Summary

Replace each ring's simple text prompt with a purpose-built interactive tool. Add 5 new tables for rich data storage. Keep `daily_rings` as the completion anchor. Each ring tool saves structured data to its own table AND marks the ring complete.

## Phase 1 Scope (This Implementation)

### Database: 5 New Tables

```sql
-- 1. Circuit Check entries (Notice ring)
CREATE TABLE public.notice_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  mood text NOT NULL,          -- 'calm','anxious','frustrated','energized','flat','overwhelmed'
  energy_level integer NOT NULL, -- 1-5
  stress_level integer NOT NULL, -- 1-5
  dominant_emotion text,
  note text,
  interpretation text,         -- AI or rule-based reading
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Reframe entries (Choose ring)
CREATE TABLE public.reframe_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  situation text NOT NULL,
  fear_story text NOT NULL,
  reframe_what_else text,
  reframe_teaching text,
  reframe_best_self text,
  reframe_love_response text,
  scenario_tag text,           -- 'work_conflict','feeling_behind','relationship','setback','self_doubt','other'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Proof actions (Prove ring)
CREATE TABLE public.proof_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  proof_action text NOT NULL,
  category text,               -- 'work','fitness','relationships','recovery','discipline'
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Recharge logs (Charge ring)
CREATE TABLE public.recharge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  recharge_type text NOT NULL,  -- 'movement','hydration','sleep','nutrition','sunlight','breathwork','recovery'
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Environment resets (Align ring)
CREATE TABLE public.environment_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reset_date date NOT NULL DEFAULT CURRENT_DATE,
  action_type text NOT NULL,    -- 'clean_space','reduce_distraction','set_boundary','reconnect_person','remove_drain'
  category text NOT NULL,       -- 'physical_space','people','digital','schedule','boundaries'
  note text,
  energizing text,              -- "What is energizing you?"
  draining text,                -- "What is draining you?"
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Each table gets RLS: users can INSERT, SELECT, UPDATE their own rows.

### New Components (5 Ring Tools)

| Component | Ring | What it does |
|-----------|------|-------------|
| `NoticeCheckInCard.tsx` | Notice | Mood selector (6 emoji options), energy slider (1-5), stress slider (1-5), dominant emotion text, optional note. On submit: rule-based interpretation shown ("You may be running on fear" / "You look steady and grounded" / "Low energy detected" / "Mental overload may be building"). Saves to `notice_entries`, completes ring. |
| `ReframeStudioCard.tsx` | Choose | Step 1: "What happened?" + "What story are you telling yourself?". Step 2: 4 guided reframe fields. Scenario tag selector. Before/after mini-view on completion. Saves to `reframe_entries`, completes ring. |
| `ProofActionCard.tsx` | Prove | Set one proof action ("What is one action that proves who you are becoming today?"). Category tag. Mark complete with optional reflection. Identity reinforcement copy on completion. Saves to `proof_actions`, completes ring. |
| `RechargeEngineCard.tsx` | Charge | Grid of 7 recharge action chips (movement, hydration, sleep, nutrition, sunlight, breathwork, recovery). Tap one+ to log. Ring fills on first selection. Saves each to `recharge_logs`, completes ring. If Notice logged low energy, show nudge copy. |
| `EnvironmentResetCard.tsx` | Align | Action type selector (5 options). Category selector (5 options). Optional note. "What is energizing you?" / "What is draining you?" fields. Saves to `environment_resets`, completes ring. |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/NoticeCheckInCard.tsx` | Circuit Check tool |
| `src/components/dashboard/ReframeStudioCard.tsx` | Reframe Studio tool |
| `src/components/dashboard/ProofActionCard.tsx` | Proof of Self tool |
| `src/components/dashboard/RechargeEngineCard.tsx` | Recharge Engine tool |
| `src/components/dashboard/EnvironmentResetCard.tsx` | Environment Reset tool |

### Files to Edit

| File | Change |
|------|--------|
| `src/components/dashboard/RingActionCard.tsx` | Replace inline forms with new tool components. `getEmbeddedTracker` routes each ring key to its dedicated tool component. Remove old `InlineWellnessForm`, `InlineTimeLogForm`, `InlinePromiseReview`, `InlineScreenTimeForm`. |
| `src/components/dashboard/DailyRings.tsx` | Pass `noticeData` (today's notice entry if exists) to Charge card for low-energy nudge. |
| `src/hooks/useDailyRings.ts` | Update `RING_DEFINITIONS` prompts/meanings to match new tool language. |
| `src/components/dashboard/CommandModeView.tsx` | No structural changes needed — rings already handle everything. |
| DB migration | Create 5 tables + RLS policies. |

### Interpretation Logic (Notice — rule-based, no AI needed)

```
if stress >= 4 → "Mental overload may be building"
if energy <= 2 → "Low energy detected — consider recharging"
if mood in ['anxious','frustrated','overwhelmed'] → "You may be running on fear"
else → "You look steady and grounded"
```

### Ring Definition Updates

| Ring | New meaning | New prompt |
|------|-------------|-----------|
| Notice | "Scan your internal system — catch fear circuits before they take over." | "Run a Circuit Check" |
| Choose | "Reframe the story. Move from fear to love." | "Open the Reframe Studio" |
| Prove | "One action that proves who you're becoming." | "Set your Proof Action" |
| Charge | "Recharge your system with one physical win." | "Open the Recharge Engine" |
| Align | "Shape your environment to support growth." | "Run an Environment Reset" |

### What Stays Unchanged

- `daily_rings` table and `useDailyRings` hook logic (completion tracking)
- `DailyRecapCard`, `WeeklyRecapCard` (they read from `daily_rings`)
- `CommandModeView` structure
- All existing tables (`wellness_logs`, `time_logs`, `completed_actions`, etc.)
- Control Mode, Experience tab, all other pages

### Copy Direction

All component copy uses Controllables language: "fear circuits," "love circuits," "Fully Charged," "proof, not theory," "edge out the Ego." Applied sparingly — one phrase per completion, not plastered everywhere.

