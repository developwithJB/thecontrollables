-- Allow authenticated app users to exercise the owner-scoped RLS policies
-- created by the Covenant schema migration. Service-role access is required
-- by send-daily-nudge when it composes identity-first daily emails.

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.covenant_challenges
  TO authenticated;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.covenant_daily_checkins
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.grace_evidence_entries
  TO authenticated;

GRANT ALL PRIVILEGES
  ON TABLE public.covenant_challenges,
           public.covenant_daily_checkins,
           public.grace_evidence_entries
  TO service_role;