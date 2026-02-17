
-- Store Open Claw marketing campaign generations
CREATE TABLE public.open_claw_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by uuid NOT NULL,
  objective text NOT NULL DEFAULT 'full_funnel',
  channel text NOT NULL DEFAULT 'linkedin',
  audience text,
  offer text,
  tone text,
  budget_level text DEFAULT 'medium',
  variation_count integer DEFAULT 3,
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_raw boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE public.open_claw_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can access campaigns
CREATE POLICY "Admins can view all campaigns"
  ON public.open_claw_campaigns
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert campaigns"
  ON public.open_claw_campaigns
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete campaigns"
  ON public.open_claw_campaigns
  FOR DELETE
  USING (public.is_admin());

-- Index for quick history lookups
CREATE INDEX idx_open_claw_campaigns_created ON public.open_claw_campaigns (created_at DESC);
