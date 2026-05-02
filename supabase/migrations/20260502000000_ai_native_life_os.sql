-- AI-native Life OS primitives: consent, memory, daily plans, action proposals, feedback.

CREATE TABLE IF NOT EXISTS public.ai_consents (
  user_id uuid PRIMARY KEY,
  calendar_context boolean NOT NULL DEFAULT false,
  body_context boolean NOT NULL DEFAULT false,
  money_context boolean NOT NULL DEFAULT false,
  email_summary_context boolean NOT NULL DEFAULT false,
  memory_enabled boolean NOT NULL DEFAULT false,
  push_nudges_enabled boolean NOT NULL DEFAULT false,
  email_nudges_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI consents"
ON public.ai_consents FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI consents"
ON public.ai_consents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI consents"
ON public.ai_consents FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL CHECK (domain IN ('planner', 'body', 'money', 'growth', 'communication', 'general')),
  content text NOT NULL,
  source text NOT NULL DEFAULT 'user_confirmed',
  confidence numeric NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_memories_user_active_idx
ON public.ai_memories (user_id, domain, created_at DESC)
WHERE archived_at IS NULL;

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI memories"
ON public.ai_memories FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_digest jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'completed', 'archived')),
  generated_by text NOT NULL DEFAULT 'rules',
  provider text NOT NULL DEFAULT 'rules',
  model text,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS ai_daily_plans_user_date_idx
ON public.ai_daily_plans (user_id, plan_date DESC);

ALTER TABLE public.ai_daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI daily plans"
ON public.ai_daily_plans FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_action_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_plan_id uuid REFERENCES public.ai_daily_plans(id) ON DELETE CASCADE,
  proposal_type text NOT NULL CHECK (proposal_type IN (
    'planner_create_item',
    'planner_reschedule_item',
    'planner_simplify_day',
    'meal_plan_generate',
    'money_attention_item',
    'daily_checkin_prompt',
    'weekly_plan_generate',
    'nudge_schedule'
  )),
  title text NOT NULL,
  rationale text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed', 'archived')),
  confirmation_required boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  approved_at timestamptz,
  rejected_at timestamptz,
  executed_at timestamptz,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_action_proposals_user_status_idx
ON public.ai_action_proposals (user_id, status, created_at DESC);

ALTER TABLE public.ai_action_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI action proposals"
ON public.ai_action_proposals FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_plan_id uuid REFERENCES public.ai_daily_plans(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.ai_action_proposals(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'not_useful', 'too_much', 'do_more', 'approved', 'rejected', 'memory_created', 'memory_archived')),
  feedback_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_feedback_events_user_created_idx
ON public.ai_feedback_events (user_id, created_at DESC);

ALTER TABLE public.ai_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI feedback"
ON public.ai_feedback_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI feedback"
ON public.ai_feedback_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
