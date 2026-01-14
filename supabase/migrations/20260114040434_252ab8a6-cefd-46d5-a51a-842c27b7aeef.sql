-- Create user_badges table for storing earned badges
CREATE TABLE public.user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz DEFAULT now() NOT NULL,
  trigger_context jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_key)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY "Users can view their own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Users can earn badges (insert)
CREATE POLICY "Users can earn badges" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user_onboarding table for first-session mode
CREATE TABLE public.user_onboarding (
  user_id uuid PRIMARY KEY,
  simplified_mode_completed boolean DEFAULT false NOT NULL,
  first_action_type text,
  first_action_completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can view their onboarding status
CREATE POLICY "Users can view their onboarding" ON public.user_onboarding
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their onboarding status
CREATE POLICY "Users can update their onboarding" ON public.user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can create their onboarding record
CREATE POLICY "Users can create their onboarding" ON public.user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);