-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Service role can insert nudge logs" ON public.email_nudge_logs;

-- The edge function uses service_role key which bypasses RLS entirely,
-- so we don't need an INSERT policy for authenticated users.
-- Only the service role (edge function) will insert records.