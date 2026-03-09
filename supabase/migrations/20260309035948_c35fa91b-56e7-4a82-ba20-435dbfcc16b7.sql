CREATE TABLE IF NOT EXISTS public.daily_os_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  interactions JSONB NOT NULL DEFAULT '{}'::jsonb,
  refresh_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_os_plans_user_date_unique UNIQUE (user_id, plan_date),
  CONSTRAINT daily_os_plans_refresh_count_non_negative CHECK (refresh_count >= 0)
);

ALTER TABLE public.daily_os_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own daily os plans" ON public.daily_os_plans;
CREATE POLICY "Users can select own daily os plans"
ON public.daily_os_plans
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily os plans" ON public.daily_os_plans;
CREATE POLICY "Users can insert own daily os plans"
ON public.daily_os_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily os plans" ON public.daily_os_plans;
CREATE POLICY "Users can update own daily os plans"
ON public.daily_os_plans
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily os plans" ON public.daily_os_plans;
CREATE POLICY "Users can delete own daily os plans"
ON public.daily_os_plans
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_daily_os_plans_updated_at ON public.daily_os_plans;
CREATE TRIGGER update_daily_os_plans_updated_at
BEFORE UPDATE ON public.daily_os_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_daily_os_plans_user_date ON public.daily_os_plans(user_id, plan_date);