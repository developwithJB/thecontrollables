
CREATE TABLE public.health_sync_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sync_date date NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  steps integer,
  sleep_minutes integer,
  active_minutes integer,
  heart_rate_avg integer,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_sync_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own health sync data"
  ON public.health_sync_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own health sync data"
  ON public.health_sync_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own health sync data"
  ON public.health_sync_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX health_sync_data_user_date_source ON public.health_sync_data (user_id, sync_date, source);
