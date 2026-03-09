
-- 1. Circuit Check entries (Notice ring)
CREATE TABLE public.notice_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  mood text NOT NULL,
  energy_level integer NOT NULL,
  stress_level integer NOT NULL,
  dominant_emotion text,
  note text,
  interpretation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notice_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own notice entries" ON public.notice_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own notice entries" ON public.notice_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notice entries" ON public.notice_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);

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
  scenario_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reframe_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reframe entries" ON public.reframe_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own reframe entries" ON public.reframe_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own reframe entries" ON public.reframe_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Proof actions (Prove ring)
CREATE TABLE public.proof_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  proof_action text NOT NULL,
  category text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proof_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own proof actions" ON public.proof_actions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own proof actions" ON public.proof_actions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own proof actions" ON public.proof_actions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. Recharge logs (Charge ring)
CREATE TABLE public.recharge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  recharge_type text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recharge_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own recharge logs" ON public.recharge_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own recharge logs" ON public.recharge_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Environment resets (Align ring)
CREATE TABLE public.environment_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reset_date date NOT NULL DEFAULT CURRENT_DATE,
  action_type text NOT NULL,
  category text NOT NULL,
  note text,
  energizing text,
  draining text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.environment_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own environment resets" ON public.environment_resets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own environment resets" ON public.environment_resets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own environment resets" ON public.environment_resets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
