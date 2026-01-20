-- Fix RLS policies that expose data to anyone with invite code
-- Issue 1: challenges table - "Anyone can view challenges with invite code" exposes challenge details
-- Issue 2: reset_sessions table - "Anyone can view sessions with invite code" exposes session details

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view challenges with invite code" ON public.challenges;
DROP POLICY IF EXISTS "Anyone can view sessions with invite code" ON public.reset_sessions;

-- Create a new secure policy for challenges:
-- Only authenticated users can look up challenges by invite code (for joining)
-- This allows the join flow while preventing anonymous enumeration
CREATE POLICY "Authenticated users can view challenges by invite code"
ON public.challenges
FOR SELECT
TO authenticated
USING (invite_code IS NOT NULL);

-- Create a new secure policy for reset_sessions:
-- Only the session owner can view their sessions
-- The existing "Users can view their own reset sessions" policy already handles owner access
-- No need for public invite_code access on sessions - they are personal