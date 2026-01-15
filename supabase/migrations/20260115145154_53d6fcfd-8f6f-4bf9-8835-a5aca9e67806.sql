-- Create certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reset_session_id uuid NOT NULL UNIQUE REFERENCES public.reset_sessions(id),
  display_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  certificate_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certificates"
  ON public.certificates FOR UPDATE
  USING (auth.uid() = user_id);