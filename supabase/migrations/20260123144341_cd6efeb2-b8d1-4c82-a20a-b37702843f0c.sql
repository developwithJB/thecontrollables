-- Add journey tracking to reset_sessions
ALTER TABLE public.reset_sessions 
ADD COLUMN IF NOT EXISTS journey_id TEXT,
ADD COLUMN IF NOT EXISTS journey_changed_at TIMESTAMP WITH TIME ZONE;

-- Create journey_changes log table for tracking course changes during a reset
CREATE TABLE IF NOT EXISTS public.journey_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.reset_sessions(id) ON DELETE CASCADE,
  previous_journey_id TEXT,
  new_journey_id TEXT NOT NULL,
  changed_on_day INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journey_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies for journey_changes
CREATE POLICY "Users can create their own journey changes" 
ON public.journey_changes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own journey changes" 
ON public.journey_changes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journey_changes_session ON public.journey_changes(session_id);
CREATE INDEX IF NOT EXISTS idx_journey_changes_user ON public.journey_changes(user_id);