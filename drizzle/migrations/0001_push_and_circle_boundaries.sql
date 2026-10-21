-- No credentials are created or scheduler scopes expanded. Existing server
-- runners can claim at most one push per opted-in account/local calendar date.
CREATE TABLE IF NOT EXISTS public.push_nudge_claims (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 local_date date NOT NULL, claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,local_date)
);
ALTER TABLE public.push_nudge_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_nudge_claims FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.push_nudge_claims TO service_role;
CREATE OR REPLACE FUNCTION public.claim_push_nudge(p_user_id uuid,p_local_date date) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE zone text; claimed uuid;
BEGIN
 SELECT coalesce(timezone,'UTC') INTO zone FROM public.profiles WHERE id=p_user_id AND push_nudges_enabled;
 IF zone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RETURN false; END IF;
 IF p_local_date IS DISTINCT FROM (now() AT TIME ZONE zone)::date THEN RETURN false; END IF;
 INSERT INTO public.push_nudge_claims(user_id,local_date) VALUES(p_user_id,p_local_date)
 ON CONFLICT DO NOTHING RETURNING user_id INTO claimed;
 RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_push_nudge(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_nudge(uuid,date) TO service_role;

-- Circle participation is derived from the owner's server-saved Snapshot day.
-- Clients choose neither the owner, completed flag, date, day number nor reward.
REVOKE ALL ON public.challenge_progress FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.challenge_progress TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.challenge_progress TO service_role;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.challenge_progress;
CREATE OR REPLACE FUNCTION public.record_circle_attendance(p_challenge_id uuid,p_reset_session_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); session public.reset_sessions%ROWTYPE; circle public.challenges%ROWTYPE;
 saved public.daily_resets%ROWTYPE; progress_id uuid; local_today date; utc_today date:=(now() AT TIME ZONE 'UTC')::date;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 SELECT * INTO circle FROM public.challenges WHERE id=p_challenge_id AND NOT is_solo;
 IF circle.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.challenge_participants WHERE challenge_id=p_challenge_id AND user_id=actor AND covenant_accepted) THEN RAISE EXCEPTION 'circle_membership_required'; END IF;
 SELECT * INTO session FROM public.reset_sessions WHERE id=p_reset_session_id AND user_id=actor AND covenant_accepted FOR SHARE;
 IF session.id IS NULL OR session.journey_id IS DISTINCT FROM circle.journey_id THEN RAISE EXCEPTION 'owned_matching_reset_required'; END IF;
 local_today:=(now() AT TIME ZONE coalesce(session.timezone,'UTC'))::date;
 SELECT * INTO saved FROM public.daily_resets WHERE session_id=session.id AND user_id=actor
 AND day_number=local_today-session.start_date+1 AND (completed_at AT TIME ZONE coalesce(session.timezone,'UTC'))::date=local_today;
 IF saved.id IS NULL THEN RETURN jsonb_build_object('recorded',false); END IF;
 INSERT INTO public.challenge_progress(challenge_id,user_id,day_number,completed,completed_at,log_date)
 VALUES(circle.id,actor,saved.day_number,true,saved.completed_at,utc_today)
 ON CONFLICT(challenge_id,user_id,day_number) DO NOTHING RETURNING id INTO progress_id;
 RETURN jsonb_build_object('recorded',true,'newRecord',progress_id IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.record_circle_attendance(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_circle_attendance(uuid,uuid) TO authenticated;
