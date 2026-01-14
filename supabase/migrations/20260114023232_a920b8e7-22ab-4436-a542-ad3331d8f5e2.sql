-- Create table for tracking completed AI-suggested actions
CREATE TABLE public.completed_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_text TEXT NOT NULL,
  controllable TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 10,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.completed_actions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own completed actions
CREATE POLICY "Users can view their own completed actions"
ON public.completed_actions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completed actions
CREATE POLICY "Users can insert their own completed actions"
ON public.completed_actions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_completed_actions_user_id ON public.completed_actions(user_id);
CREATE INDEX idx_completed_actions_completed_at ON public.completed_actions(completed_at DESC);