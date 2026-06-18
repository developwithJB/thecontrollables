-- Reset onboarding state for the June 18, 2026 Controllables relaunch.
-- This intentionally does not delete accounts, reflections, wellness data, money,
-- calendar data, AI memories, mission history, proof, XP, badges, or certificates.

INSERT INTO public.user_onboarding (
  user_id,
  simplified_mode_completed,
  onboarding_step,
  build_assessment_completed,
  operator_onboarding_completed,
  operator_onboarding_answers
)
SELECT
  id,
  false,
  'welcome_integrations',
  false,
  false,
  '{}'::jsonb
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.user_onboarding
SET
  simplified_mode_completed = false,
  first_action_type = null,
  first_action_completed_at = null,
  onboarding_step = 'welcome_integrations',
  build_assessment_completed = false,
  build_assessment_completed_at = null,
  journey_controllable = null,
  journey_selected_at = null,
  operator_onboarding_completed = false,
  operator_onboarding_completed_at = null
WHERE true;
