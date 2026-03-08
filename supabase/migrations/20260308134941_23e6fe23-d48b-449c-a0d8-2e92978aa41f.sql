
CREATE TABLE public.daily_briefings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  controllable text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, briefing_date)
);

ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own briefings"
  ON public.daily_briefings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own briefings"
  ON public.daily_briefings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
