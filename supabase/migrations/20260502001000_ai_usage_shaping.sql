-- AI usage shaping: cache responses, record generation events, and expose cost-control metadata.

ALTER TABLE public.ai_daily_plans
  ADD COLUMN IF NOT EXISTS ai_depth text NOT NULL DEFAULT 'quick'
    CHECK (ai_depth IN ('quick', 'balanced', 'deep')),
  ADD COLUMN IF NOT EXISTS model_tier text NOT NULL DEFAULT 'rules'
    CHECK (model_tier IN ('rules', 'cheap', 'standard', 'premium')),
  ADD COLUMN IF NOT EXISTS cache_key text;

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cache_key text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('daily_brief', 'adjust', 'weekly_plan')),
  ai_depth text NOT NULL CHECK (ai_depth IN ('quick', 'balanced', 'deep')),
  model_tier text NOT NULL CHECK (model_tier IN ('rules', 'cheap', 'standard', 'premium')),
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS ai_response_cache_user_expires_idx
ON public.ai_response_cache (user_id, expires_at DESC);

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI response cache"
ON public.ai_response_cache FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  surface text NOT NULL DEFAULT 'daily_operator',
  mode text NOT NULL CHECK (mode IN ('daily_brief', 'adjust', 'weekly_plan')),
  ai_depth text NOT NULL CHECK (ai_depth IN ('quick', 'balanced', 'deep')),
  model_tier text NOT NULL CHECK (model_tier IN ('rules', 'cheap', 'standard', 'premium')),
  provider text NOT NULL DEFAULT 'rules',
  model text,
  prompt_hash text,
  cache_hit boolean NOT NULL DEFAULT false,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
ON public.ai_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_mode_created_idx
ON public.ai_usage_events (user_id, mode, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage events"
ON public.ai_usage_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);
