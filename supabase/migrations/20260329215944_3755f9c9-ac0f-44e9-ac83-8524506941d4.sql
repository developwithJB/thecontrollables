
-- Weekly tracking table for auto-repeating Sunday-to-Sunday cycles
CREATE TABLE public.weekly_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL, -- always a Sunday
  week_end date NOT NULL,   -- always the following Saturday
  -- Scoring: all systems equally weighted
  rings_score numeric(5,2) DEFAULT 0,
  wearable_score numeric(5,2) DEFAULT 0,
  planner_score numeric(5,2) DEFAULT 0,
  nutrition_score numeric(5,2) DEFAULT 0,
  money_score numeric(5,2) DEFAULT 0,
  overall_score numeric(5,2) DEFAULT 0,
  -- Metadata
  total_xp_earned integer DEFAULT 0,
  days_active integer DEFAULT 0,
  recap_generated boolean DEFAULT false,
  recap_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly tracking"
  ON public.weekly_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly tracking"
  ON public.weekly_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly tracking"
  ON public.weekly_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
