-- Add user_preferences_inferred table if not exists
CREATE TABLE IF NOT EXISTS public.user_preferences_inferred (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  source_observations JSONB DEFAULT '[]',
  first_derived_at TIMESTAMPTZ DEFAULT now(),
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

-- Add index if not exists
CREATE INDEX IF NOT EXISTS idx_user_preferences_inferred_user ON public.user_preferences_inferred(user_id);

-- Enable RLS
ALTER TABLE public.user_preferences_inferred ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences_inferred (drop if exist first)
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences_inferred;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences_inferred;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences_inferred;

CREATE POLICY "Users can view their own preferences" ON public.user_preferences_inferred
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences_inferred
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences_inferred
  FOR UPDATE USING (auth.uid() = user_id);