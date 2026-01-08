-- Create a security definer function to check if user is participant in a challenge
CREATE OR REPLACE FUNCTION public.is_challenge_participant(_user_id uuid, _challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_participants
    WHERE user_id = _user_id
      AND challenge_id = _challenge_id
  )
$$;

-- Drop all existing SELECT policies on challenges to clean up
DROP POLICY IF EXISTS "Users can view challenges they participate in" ON public.challenges;
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Anyone can view challenges by invite code" ON public.challenges;

-- Create clean, non-recursive policies
-- 1. Creators can view their own challenges
CREATE POLICY "Creators can view their own challenges"
ON public.challenges
FOR SELECT
USING (auth.uid() = creator_id);

-- 2. Participants can view challenges using the security definer function
CREATE POLICY "Participants can view challenges"
ON public.challenges
FOR SELECT
USING (public.is_challenge_participant(auth.uid(), id));

-- 3. Anyone can view challenges by invite code (for joining)
CREATE POLICY "Anyone can view challenges with invite code"
ON public.challenges
FOR SELECT
USING (invite_code IS NOT NULL);