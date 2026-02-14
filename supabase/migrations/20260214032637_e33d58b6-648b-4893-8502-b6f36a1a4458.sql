
-- Create daily_scriptures table
CREATE TABLE public.daily_scriptures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verse_reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  theme_tag TEXT NOT NULL,
  rotation_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_scriptures ENABLE ROW LEVEL SECURITY;

-- Public read-only access
CREATE POLICY "Anyone can view scriptures"
  ON public.daily_scriptures
  FOR SELECT
  USING (true);

-- Create daily_alignment_logs table
CREATE TABLE public.daily_alignment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scripture_id UUID NOT NULL REFERENCES public.daily_scriptures(id),
  nudge_date DATE NOT NULL,
  generated_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, nudge_date)
);

-- Enable RLS
ALTER TABLE public.daily_alignment_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own alignment logs
CREATE POLICY "Users can view their own alignment logs"
  ON public.daily_alignment_logs
  FOR SELECT
  USING (auth.uid() = user_id);
