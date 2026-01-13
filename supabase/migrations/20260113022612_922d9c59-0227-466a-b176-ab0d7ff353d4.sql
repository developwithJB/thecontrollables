-- Add covenant tracking and date-anchored progress columns

-- Update challenge_participants table
ALTER TABLE public.challenge_participants
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS covenant_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS covenant_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS certificate_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS certificate_storage_path text;

-- Add unique constraint for challenge_id + user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_participants_challenge_user_unique'
  ) THEN
    ALTER TABLE public.challenge_participants
      ADD CONSTRAINT challenge_participants_challenge_user_unique UNIQUE (challenge_id, user_id);
  END IF;
END $$;

-- Create index for active participants lookup
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_active
  ON public.challenge_participants (user_id, covenant_accepted, completed_at);

-- Update challenge_progress table with log_date
ALTER TABLE public.challenge_progress
  ADD COLUMN IF NOT EXISTS log_date date;

-- Add unique constraint for day per user per challenge
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_progress_unique_day_per_user'
  ) THEN
    ALTER TABLE public.challenge_progress
      ADD CONSTRAINT challenge_progress_unique_day_per_user UNIQUE (challenge_id, user_id, day_number);
  END IF;
END $$;

-- Create indexes for progress lookups
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user_challenge
  ON public.challenge_progress (user_id, challenge_id);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_log_date
  ON public.challenge_progress (log_date);

-- Update challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS duration_days int NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS covenant_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_evergreen boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_challenges_evergreen
  ON public.challenges (is_evergreen);

-- Create completion_certificates table
CREATE TABLE IF NOT EXISTS public.completion_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  timezone text,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on completion_certificates
ALTER TABLE public.completion_certificates ENABLE ROW LEVEL SECURITY;

-- RLS policies for completion_certificates
CREATE POLICY "Users can view their own certificates"
  ON public.completion_certificates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates"
  ON public.completion_certificates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for certificate lookups
CREATE INDEX IF NOT EXISTS idx_completion_certificates_user
  ON public.completion_certificates (user_id, created_at DESC);

-- Add unique constraint for one certificate per user per challenge
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'completion_certificates_user_challenge_unique'
  ) THEN
    ALTER TABLE public.completion_certificates
      ADD CONSTRAINT completion_certificates_user_challenge_unique UNIQUE (user_id, challenge_id);
  END IF;
END $$;

-- Also update reset_sessions with covenant fields
ALTER TABLE public.reset_sessions
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS covenant_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS covenant_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;