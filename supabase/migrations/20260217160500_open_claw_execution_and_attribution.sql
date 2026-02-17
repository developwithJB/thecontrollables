-- Open Claw: execution lifecycle, spend tracking, and channel API connection state

ALTER TABLE public.open_claw_campaigns
  ADD COLUMN execution_status text NOT NULL DEFAULT 'generated',
  ADD COLUMN execution_status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid,
  ADD COLUMN launched_at timestamptz,
  ADD COLUMN launched_by uuid,
  ADD COLUMN spend_amount_usd numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN attributed_signups integer NOT NULL DEFAULT 0,
  ADD COLUMN attributed_paid_conversions integer NOT NULL DEFAULT 0,
  ADD COLUMN attributed_revenue_usd numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN payment_attribution_model text NOT NULL DEFAULT 'manual',
  ADD COLUMN payment_attribution_notes text,
  ADD COLUMN attribution_updated_at timestamptz;

ALTER TABLE public.open_claw_campaigns
  ADD CONSTRAINT open_claw_campaigns_execution_status_check
    CHECK (execution_status IN ('draft', 'generated', 'approved', 'launched'));

ALTER TABLE public.open_claw_campaigns
  ADD CONSTRAINT open_claw_campaigns_attribution_model_check
    CHECK (payment_attribution_model IN ('manual', 'last_click', 'first_touch', 'assisted', 'channel_reported'));

CREATE INDEX idx_open_claw_campaigns_status_created
  ON public.open_claw_campaigns (execution_status, created_at DESC);

CREATE TABLE public.open_claw_channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'manual',
  connection_status text NOT NULL DEFAULT 'disconnected',
  api_account_id text,
  display_name text,
  last_checked_at timestamptz,
  last_sync_at timestamptz,
  spend_sync_supported boolean NOT NULL DEFAULT false,
  attribution_supported boolean NOT NULL DEFAULT false,
  payment_attribution_model text NOT NULL DEFAULT 'manual',
  health_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.open_claw_channel_connections
  ADD CONSTRAINT open_claw_channel_connections_channel_check
    CHECK (channel IN ('x', 'linkedin', 'email', 'facebook_ads', 'google_ads', 'reddit', 'instagram', 'youtube', 'tiktok', 'landing_page'));

ALTER TABLE public.open_claw_channel_connections
  ADD CONSTRAINT open_claw_channel_connections_status_check
    CHECK (connection_status IN ('connected', 'disconnected', 'error'));

ALTER TABLE public.open_claw_channel_connections
  ADD CONSTRAINT open_claw_channel_connections_attribution_model_check
    CHECK (payment_attribution_model IN ('manual', 'last_click', 'first_touch', 'assisted', 'channel_reported'));

ALTER TABLE public.open_claw_channel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view channel connections"
  ON public.open_claw_channel_connections
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert channel connections"
  ON public.open_claw_channel_connections
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update channel connections"
  ON public.open_claw_channel_connections
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete channel connections"
  ON public.open_claw_channel_connections
  FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER update_open_claw_channel_connections_updated_at
  BEFORE UPDATE ON public.open_claw_channel_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.open_claw_channel_connections (channel)
VALUES
  ('x'),
  ('linkedin'),
  ('email'),
  ('facebook_ads'),
  ('google_ads'),
  ('reddit'),
  ('instagram'),
  ('youtube'),
  ('tiktok'),
  ('landing_page')
ON CONFLICT (channel) DO NOTHING;
