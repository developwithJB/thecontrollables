-- Lightweight Daily Operator onboarding answers and completion state.

ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS operator_onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operator_onboarding_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS operator_onboarding_completed_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_onboarding_step'
      AND conrelid = 'public.user_onboarding'::regclass
  ) THEN
    ALTER TABLE public.user_onboarding DROP CONSTRAINT valid_onboarding_step;
  END IF;
END $$;

ALTER TABLE public.user_onboarding
ADD CONSTRAINT valid_onboarding_step CHECK (
  onboarding_step IS NULL OR
  onboarding_step IN (
    'welcome_integrations',
    'build_assessment',
    'archetype_result',
    'journey_selection',
    'completed'
  )
);

UPDATE public.user_onboarding
SET
  operator_onboarding_completed = true,
  operator_onboarding_completed_at = COALESCE(operator_onboarding_completed_at, now())
WHERE
  operator_onboarding_completed = false
  AND (
    simplified_mode_completed = true
    OR onboarding_step = 'completed'
    OR first_action_completed_at IS NOT NULL
  );

INSERT INTO public.user_onboarding (
  user_id,
  simplified_mode_completed,
  onboarding_step,
  operator_onboarding_completed,
  operator_onboarding_completed_at
)
SELECT
  id,
  true,
  'completed',
  true,
  now()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
