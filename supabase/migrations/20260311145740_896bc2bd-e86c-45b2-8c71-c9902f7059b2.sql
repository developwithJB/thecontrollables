CREATE TABLE public.daily_synthesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  synthesis_date date NOT NULL,
  synthesis_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, synthesis_date)
);
ALTER TABLE public.daily_synthesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own synthesis" ON public.daily_synthesis FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own synthesis" ON public.daily_synthesis FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);