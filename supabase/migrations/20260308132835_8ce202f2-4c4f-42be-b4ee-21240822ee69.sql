
-- Add columns to challenges table for circle support
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS journey_id text;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 5;

-- Add display_name to challenge_participants for privacy-safe cross-user display
ALTER TABLE public.challenge_participants ADD COLUMN IF NOT EXISTS display_name text;

-- Update challenge_participants SELECT policy so all circle members can see each other
DROP POLICY IF EXISTS "Users can view participants of their challenges" ON public.challenge_participants;
CREATE POLICY "Circle members can view fellow participants"
  ON public.challenge_participants
  FOR SELECT
  USING (
    public.is_challenge_participant(auth.uid(), challenge_id)
    OR auth.uid() = user_id
  );

-- Enable realtime for challenge_progress so showed-up dots update live
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_progress;
