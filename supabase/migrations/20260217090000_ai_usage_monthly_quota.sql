-- Migrate AI usage logs from daily message counts to monthly query/token counters.
ALTER TABLE public.ai_usage_logs
  RENAME COLUMN usage_date TO month;

ALTER TABLE public.ai_usage_logs
  RENAME COLUMN message_count TO query_count;

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS token_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.ai_usage_logs
SET month = date_trunc('month', month)::date;

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_user_id_usage_date_key;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_user_id_month_key UNIQUE (user_id, month);

DROP INDEX IF EXISTS idx_ai_usage_logs_user_date;
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_month ON public.ai_usage_logs(user_id, month);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_plan_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_tier_check
      CHECK (plan_tier IN ('free', 'plus', 'pro'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.increment_ai_token_count(usage_log_id UUID, token_delta INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_usage_logs
  SET token_count = GREATEST(0, token_count + GREATEST(0, token_delta))
  WHERE id = usage_log_id;
END;
$$;
