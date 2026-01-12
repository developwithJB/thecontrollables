-- Create reset_sessions table for tracking 7-day resets
CREATE TABLE public.reset_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_day INTEGER NOT NULL DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 7),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_resets table for storing each day's completion
CREATE TABLE public.daily_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.reset_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  reflection TEXT,
  commitment TEXT,
  release TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_id, day_number)
);

-- Enable Row Level Security
ALTER TABLE public.reset_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_resets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reset_sessions
CREATE POLICY "Users can view their own reset sessions"
ON public.reset_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reset sessions"
ON public.reset_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reset sessions"
ON public.reset_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow viewing sessions by invite code (for group resets)
CREATE POLICY "Anyone can view sessions with invite code"
ON public.reset_sessions
FOR SELECT
USING (invite_code IS NOT NULL);

-- RLS Policies for daily_resets
CREATE POLICY "Users can view their own daily resets"
ON public.daily_resets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily resets"
ON public.daily_resets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily resets"
ON public.daily_resets
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_reset_sessions_user_id ON public.reset_sessions(user_id);
CREATE INDEX idx_reset_sessions_invite_code ON public.reset_sessions(invite_code);
CREATE INDEX idx_daily_resets_session_id ON public.daily_resets(session_id);
CREATE INDEX idx_daily_resets_user_id ON public.daily_resets(user_id);