CREATE TABLE IF NOT EXISTS public.dated_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  title text NOT NULL,
  event_name text NOT NULL,
  event_date date NOT NULL,
  start_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Chicago',
  target_result text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS dated_goals_user_status_event_idx
  ON public.dated_goals (user_id, status, event_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dated_goals TO authenticated;
GRANT ALL ON public.dated_goals TO service_role;

ALTER TABLE public.dated_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own dated goals"
  ON public.dated_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own dated goals"
  ON public.dated_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_dated_goals_updated_at
  BEFORE UPDATE ON public.dated_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.dated_goal_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.dated_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('setup', 'rest', 'strength', 'quality', 'easy', 'long', 'recovery', 'race')),
  status text NOT NULL CHECK (status IN ('completed', 'modified', 'skipped')),
  actual_miles numeric(5,2),
  strength_completed boolean NOT NULL DEFAULT false,
  fueling_completed boolean,
  pain_affecting_stride boolean NOT NULL DEFAULT false,
  body_feel text CHECK (body_feel IS NULL OR body_feel IN ('good', 'normal', 'heavy', 'pain')),
  plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, log_date)
);

CREATE INDEX IF NOT EXISTS dated_goal_daily_logs_user_date_idx
  ON public.dated_goal_daily_logs (user_id, log_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dated_goal_daily_logs TO authenticated;
GRANT ALL ON public.dated_goal_daily_logs TO service_role;

ALTER TABLE public.dated_goal_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own dated goal logs"
  ON public.dated_goal_daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dated goal logs"
  ON public.dated_goal_daily_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dated_goals goal
      WHERE goal.id = goal_id AND goal.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own dated goal logs"
  ON public.dated_goal_daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dated_goals goal
      WHERE goal.id = goal_id AND goal.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own dated goal logs"
  ON public.dated_goal_daily_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_dated_goal_daily_logs_updated_at
  BEFORE UPDATE ON public.dated_goal_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();