-- Add onboarding flow tracking columns
ALTER TABLE public.user_onboarding 
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'build_assessment',
ADD COLUMN IF NOT EXISTS build_assessment_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS build_assessment_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS journey_controllable TEXT,
ADD COLUMN IF NOT EXISTS journey_selected_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for valid onboarding steps
ALTER TABLE public.user_onboarding
ADD CONSTRAINT valid_onboarding_step CHECK (
  onboarding_step IS NULL OR 
  onboarding_step IN ('build_assessment', 'archetype_result', 'journey_selection', 'completed')
);

-- Add constraint for valid journey controllable
ALTER TABLE public.user_onboarding
ADD CONSTRAINT valid_journey_controllable CHECK (
  journey_controllable IS NULL OR 
  journey_controllable IN ('awareness', 'perspective', 'habit', 'wellness', 'environment')
);