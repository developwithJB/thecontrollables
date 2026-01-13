-- Main Quests table (user's primary goal)
CREATE TABLE public.main_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 7,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.main_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests" ON public.main_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own quests" ON public.main_quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quests" ON public.main_quests FOR UPDATE USING (auth.uid() = user_id);

-- XP & Momentum tracking
CREATE TABLE public.xp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP" ON public.xp_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can earn XP" ON public.xp_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Integrity tracking (promises made vs kept)
CREATE TABLE public.integrity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  promise_text TEXT NOT NULL,
  promised_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE,
  kept BOOLEAN DEFAULT NULL,
  kept_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integrity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrity" ON public.integrity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create promises" ON public.integrity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their promises" ON public.integrity_logs FOR UPDATE USING (auth.uid() = user_id);

-- Time Currency tracking (daily logs)
CREATE TABLE public.time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_invested_minutes INTEGER DEFAULT 0,
  time_wasted_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time logs" ON public.time_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create time logs" ON public.time_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update time logs" ON public.time_logs FOR UPDATE USING (auth.uid() = user_id);

-- User builds (customizable modifiers)
CREATE TABLE public.user_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Base stats (fixed, self-assessed 1-10)
  awareness_base INTEGER DEFAULT 5,
  perspective_base INTEGER DEFAULT 5,
  habit_base INTEGER DEFAULT 5,
  wellness_base INTEGER DEFAULT 5,
  environment_base INTEGER DEFAULT 5,
  -- Build modifiers (customizable, -5 to +5)
  sleep_modifier INTEGER DEFAULT 0,
  movement_modifier INTEGER DEFAULT 0,
  inputs_modifier INTEGER DEFAULT 0,
  environment_modifier INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own build" ON public.user_builds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their build" ON public.user_builds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their build" ON public.user_builds FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_builds_updated_at
BEFORE UPDATE ON public.user_builds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- AI Guide conversation sessions
CREATE TABLE public.guide_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  context TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guide_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their guide sessions" ON public.guide_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create guide sessions" ON public.guide_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update guide sessions" ON public.guide_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_guide_sessions_updated_at
BEFORE UPDATE ON public.guide_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();