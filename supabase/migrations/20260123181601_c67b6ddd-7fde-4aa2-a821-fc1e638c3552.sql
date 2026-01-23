-- Add user_id column to app_errors table to track which user triggered the error
ALTER TABLE public.app_errors 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON public.app_errors(user_id);

-- Comment for documentation
COMMENT ON COLUMN public.app_errors.user_id IS 'Optional user ID if the user was authenticated when the error occurred';