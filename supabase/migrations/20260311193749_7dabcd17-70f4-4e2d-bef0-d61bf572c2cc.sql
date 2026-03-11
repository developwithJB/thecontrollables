
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS certificate_type text DEFAULT 'snapshot';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS reflection_text text;
ALTER TABLE public.certificates ALTER COLUMN reset_session_id DROP NOT NULL;
