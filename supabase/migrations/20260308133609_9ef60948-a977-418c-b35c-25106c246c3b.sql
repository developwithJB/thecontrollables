
-- Create seasons table
CREATE TABLE public.seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- RLS policies: user owns their rows
CREATE POLICY "Users can view their own seasons" ON public.seasons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seasons" ON public.seasons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seasons" ON public.seasons
  FOR UPDATE USING (auth.uid() = user_id);

-- Add season_id to reset_sessions
ALTER TABLE public.reset_sessions ADD COLUMN season_id uuid REFERENCES public.seasons(id);
