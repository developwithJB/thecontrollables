-- Add email nudge columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_nudge_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_nudge_time TEXT DEFAULT 'morning',
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Create index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_profiles_nudge_enabled 
ON public.profiles(email_nudge_enabled) 
WHERE email_nudge_enabled = true;

-- Create tracking table to prevent duplicate sends
CREATE TABLE IF NOT EXISTS public.email_nudge_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nudge_date DATE NOT NULL,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nudge_date)
);

-- Enable RLS on email_nudge_logs
ALTER TABLE public.email_nudge_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their own nudge history
CREATE POLICY "Users can view own nudge logs" ON public.email_nudge_logs
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policy: Service role can insert (edge function uses service role)
CREATE POLICY "Service role can insert nudge logs" ON public.email_nudge_logs
  FOR INSERT WITH CHECK (true);