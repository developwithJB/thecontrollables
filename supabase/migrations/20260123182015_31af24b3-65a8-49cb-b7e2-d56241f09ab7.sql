-- Add user_id column to app_events table
ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON public.app_events(user_id);

COMMENT ON COLUMN public.app_events.user_id IS 'Optional user ID if the user was authenticated when the event occurred';

-- Add user_id column to page_views table
ALTER TABLE public.page_views 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id);

COMMENT ON COLUMN public.page_views.user_id IS 'Optional user ID if the user was authenticated during the page view';