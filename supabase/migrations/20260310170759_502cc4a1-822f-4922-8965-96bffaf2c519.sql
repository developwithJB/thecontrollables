ALTER TABLE public.health_sync_data
ADD COLUMN IF NOT EXISTS recovery_score numeric,
ADD COLUMN IF NOT EXISTS hrv_ms numeric,
ADD COLUMN IF NOT EXISTS strain_score numeric;