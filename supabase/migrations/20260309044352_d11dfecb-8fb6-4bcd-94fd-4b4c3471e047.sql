
-- Operator suggestions table with lifecycle tracking
CREATE TABLE public.operator_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suggestion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  rationale TEXT,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  alternate_actions JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC(3,2) DEFAULT 0.50,
  status TEXT NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ,
  generated_by TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, suggestion_date, mode)
);

-- Enable RLS
ALTER TABLE public.operator_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users manage their own rows
CREATE POLICY "Users can select own operator suggestions"
  ON public.operator_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own operator suggestions"
  ON public.operator_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own operator suggestions"
  ON public.operator_suggestions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own operator suggestions"
  ON public.operator_suggestions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
