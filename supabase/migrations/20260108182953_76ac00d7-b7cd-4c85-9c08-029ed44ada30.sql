-- Fix infinite recursion in challenges RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view challenges they participate in" ON public.challenges;

-- Create a simpler policy that doesn't cause recursion
-- Users can view challenges where they are the creator OR where challenge_id matches their participation
CREATE POLICY "Users can view challenges they participate in"
ON public.challenges
FOR SELECT
USING (
  creator_id = auth.uid() OR
  id IN (SELECT challenge_id FROM challenge_participants WHERE user_id = auth.uid())
);