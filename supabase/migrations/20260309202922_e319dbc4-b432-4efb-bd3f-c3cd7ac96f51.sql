
CREATE TABLE public.daily_rings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ring_date date NOT NULL DEFAULT CURRENT_DATE,
  notice_completed boolean NOT NULL DEFAULT false,
  notice_response text,
  choose_completed boolean NOT NULL DEFAULT false,
  choose_response text,
  prove_completed boolean NOT NULL DEFAULT false,
  prove_response text,
  charge_completed boolean NOT NULL DEFAULT false,
  charge_response text,
  align_completed boolean NOT NULL DEFAULT false,
  align_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ring_date)
);

ALTER TABLE public.daily_rings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rings"
  ON public.daily_rings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rings"
  ON public.daily_rings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rings"
  ON public.daily_rings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
