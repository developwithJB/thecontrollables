-- Stripe-backed entitlement durability and AI-native plan readiness.

ALTER TABLE public.user_entitlements
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_entitlements
  DROP CONSTRAINT IF EXISTS user_entitlements_source_check;

ALTER TABLE public.user_entitlements
  ADD CONSTRAINT user_entitlements_source_check
  CHECK (source IN ('stripe', 'stripe_subscription', 'manual', 'promo', 'webhook'));

ALTER TABLE public.user_entitlements
  DROP CONSTRAINT IF EXISTS user_entitlements_plan_tier_check;

ALTER TABLE public.user_entitlements
  ADD CONSTRAINT user_entitlements_plan_tier_check
  CHECK (plan_tier IN ('plus', 'pro', 'premium', 'lifetime'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_tier_check
  CHECK (plan_tier IN ('free', 'plus', 'pro', 'premium'));

CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_customer_id
ON public.user_entitlements(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_subscription_id
ON public.user_entitlements(stripe_subscription_id);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access to stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "No public access to stripe webhook events"
ON public.stripe_webhook_events FOR ALL TO authenticated
USING (false);
