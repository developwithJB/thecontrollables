
-- WHOOP Recovery data
CREATE TABLE public.whoop_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  whoop_id text NOT NULL,
  whoop_cycle_id text,
  recovery_score numeric,
  resting_heart_rate numeric,
  hrv_rmssd_milli numeric,
  spo2_percentage numeric,
  skin_temp_celsius numeric,
  recorded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, whoop_id)
);

-- WHOOP Sleep data
CREATE TABLE public.whoop_sleeps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  whoop_id text NOT NULL,
  sleep_performance_pct numeric,
  sleep_consistency_pct numeric,
  sleep_efficiency_pct numeric,
  respiratory_rate numeric,
  total_in_bed_ms bigint,
  total_awake_ms bigint,
  total_light_ms bigint,
  total_sws_ms bigint,
  total_rem_ms bigint,
  sleep_cycle_count integer,
  disturbance_count integer,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, whoop_id)
);

-- WHOOP Cycle data
CREATE TABLE public.whoop_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  whoop_id text NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  strain numeric,
  kilojoules numeric,
  avg_heart_rate numeric,
  max_heart_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, whoop_id)
);

-- WHOOP Workout data
CREATE TABLE public.whoop_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  whoop_id text NOT NULL,
  activity_type text,
  strain numeric,
  avg_heart_rate numeric,
  start_time timestamptz,
  end_time timestamptz,
  whoop_cycle_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, whoop_id)
);

-- WHOOP Webhook events for debugging
CREATE TABLE public.whoop_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text,
  whoop_user_id text,
  payload jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.whoop_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whoop_sleeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whoop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whoop_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whoop_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read own rows
CREATE POLICY "Users read own whoop_recoveries" ON public.whoop_recoveries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own whoop_sleeps" ON public.whoop_sleeps FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own whoop_cycles" ON public.whoop_cycles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own whoop_workouts" ON public.whoop_workouts FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Webhook events: service role only (no user access needed)
CREATE POLICY "No public access to webhook events" ON public.whoop_webhook_events FOR ALL TO authenticated USING (false);
