ALTER TABLE public.user_entitlements
ADD COLUMN IF NOT EXISTS plan_tier text CHECK (plan_tier IN ('plus', 'pro', 'lifetime'));

CREATE INDEX IF NOT EXISTS idx_user_entitlements_plan_tier ON public.user_entitlements(plan_tier);
