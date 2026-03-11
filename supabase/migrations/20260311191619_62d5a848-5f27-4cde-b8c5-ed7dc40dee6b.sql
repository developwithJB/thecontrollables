
ALTER TABLE public.health_sync_data ADD COLUMN IF NOT EXISTS attributed_project_ids text[] DEFAULT '{}';

ALTER TABLE public.daily_synthesis ADD COLUMN IF NOT EXISTS project_id uuid;

-- Drop existing unique constraint and add new one including project_id
ALTER TABLE public.daily_synthesis DROP CONSTRAINT IF EXISTS daily_synthesis_user_id_synthesis_date_key;
ALTER TABLE public.daily_synthesis ADD CONSTRAINT daily_synthesis_user_project_date_key UNIQUE (user_id, synthesis_date, project_id);
