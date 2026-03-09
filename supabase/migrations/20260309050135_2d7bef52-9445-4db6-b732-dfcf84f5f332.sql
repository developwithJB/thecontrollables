-- =============================================
-- Predictive Intelligence: user_predictions
-- =============================================
CREATE TABLE public.user_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  forecast TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  reasons JSONB NOT NULL DEFAULT '[]',
  recommended_intervention TEXT,
  intervention_deep_link TEXT,
  urgency TEXT NOT NULL DEFAULT 'low',
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  explanation TEXT,
  intervention_taken BOOLEAN,
  intervention_taken_at TIMESTAMPTZ,
  prediction_accurate BOOLEAN,
  accuracy_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, prediction_type, prediction_date)
);

CREATE INDEX idx_user_predictions_user_date ON public.user_predictions(user_id, prediction_date);
CREATE INDEX idx_user_predictions_active ON public.user_predictions(user_id, prediction_date, urgency);

ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own predictions" ON public.user_predictions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own predictions" ON public.user_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own predictions" ON public.user_predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- Adaptive Modes: user_modes
-- =============================================
CREATE TABLE public.user_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  active_mode TEXT NOT NULL DEFAULT 'maintenance',
  source TEXT NOT NULL DEFAULT 'system',
  reasons JSONB NOT NULL DEFAULT '[]',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  previous_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mode" ON public.user_modes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mode" ON public.user_modes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mode" ON public.user_modes
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- One-Tap Automations: automation_runs + steps
-- =============================================
CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  inputs JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_runs_user ON public.automation_runs(user_id, created_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automation runs" ON public.automation_runs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own automation runs" ON public.automation_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own automation runs" ON public.automation_runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.automation_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  affected_system TEXT NOT NULL,
  result JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_automation_steps_run ON public.automation_run_steps(run_id);

ALTER TABLE public.automation_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their automation steps" ON public.automation_run_steps
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.automation_runs ar WHERE ar.id = run_id AND ar.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert their automation steps" ON public.automation_run_steps
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.automation_runs ar WHERE ar.id = run_id AND ar.user_id = auth.uid()
  ));