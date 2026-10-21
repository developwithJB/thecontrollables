-- Existing balances and historical records are retained. New personal activity
-- rewards are server-owned (10 planner,15 personal/movement,40 daily mission),
-- capped at100 activity XP/UTC day. These are self-reports, never strict75 credit.
ALTER TABLE public.completed_actions ADD COLUMN IF NOT EXISTS award_kind text NOT NULL DEFAULT 'personal';
REVOKE ALL ON public.completed_actions,public.xp_logs,public.daily_resets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.completed_actions,public.xp_logs,public.daily_resets TO authenticated;
DROP POLICY IF EXISTS "Users can insert their own completed actions" ON public.completed_actions;
DROP POLICY IF EXISTS "Users can earn XP" ON public.xp_logs;
DROP POLICY IF EXISTS "Users can create their own daily resets" ON public.daily_resets;
DROP POLICY IF EXISTS "Users can update their own daily resets" ON public.daily_resets;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.completed_actions,public.xp_logs,public.daily_resets TO service_role;

CREATE OR REPLACE FUNCTION public.record_personal_action(p_action_text text,p_controllable text DEFAULT NULL,p_kind text DEFAULT 'personal') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); bucket timestamptz:=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 existing public.completed_actions%ROWTYPE; saved public.completed_actions%ROWTYPE; used bigint; award integer; trust_award integer:=0; source_name text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF p_action_text IS NULL OR length(btrim(p_action_text)) NOT BETWEEN 1 AND 1000 OR p_kind NOT IN('planner','personal','movement','mission') OR (p_controllable IS NOT NULL AND p_controllable NOT IN('awareness','perspective','habit','wellness','environment')) THEN RAISE EXCEPTION 'invalid_action'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':personal-xp',0));
 SELECT * INTO existing FROM public.completed_actions WHERE user_id=actor AND completed_at>=bucket AND completed_at<bucket+interval '1 day' AND (action_text=btrim(p_action_text) OR (p_kind='mission' AND award_kind='mission')) ORDER BY completed_at LIMIT 1;
 IF existing.id IS NOT NULL THEN RETURN jsonb_build_object('id',existing.id,'xpAwarded',0,'selfTrustAwarded',0,'alreadyCompleted',true); END IF;
 SELECT coalesce(sum(greatest(x.amount,0)),0) INTO used FROM public.xp_logs x WHERE x.user_id=actor AND x.created_at>=bucket AND x.created_at<bucket+interval '1 day' AND x.source IN('planner_task','action_completed','mission_of_the_day','mission_self_trust','quest_complete','integrity_rep','time_log');
 award:=least(CASE p_kind WHEN 'planner' THEN 10 WHEN 'mission' THEN 40 ELSE 15 END,greatest(100-used,0));
 IF p_kind='mission' THEN trust_award:=least(10,greatest(100-used-award,0)); END IF;
 source_name:=CASE p_kind WHEN 'planner' THEN 'planner_task' WHEN 'mission' THEN 'mission_of_the_day' ELSE 'action_completed' END;
 INSERT INTO public.completed_actions(user_id,action_text,controllable,xp_awarded,completed_at,created_at,award_kind) VALUES(actor,btrim(p_action_text),p_controllable,award,now(),now(),p_kind) RETURNING * INTO saved;
 IF award>0 THEN INSERT INTO public.xp_logs(user_id,amount,source,description) VALUES(actor,award,source_name,left(p_action_text,1000)); END IF;
 IF trust_award>0 THEN INSERT INTO public.xp_logs(user_id,amount,source,description) VALUES(actor,trust_award,'mission_self_trust',left(p_action_text,1000)); END IF;
 RETURN jsonb_build_object('id',saved.id,'xpAwarded',award,'selfTrustAwarded',trust_award,'alreadyCompleted',false);
END $$;
REVOKE ALL ON FUNCTION public.record_personal_action(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_personal_action(text,text,text) TO authenticated;

-- Client-created reset attempts may schedule a start, but cannot prefill progress
-- or move their clock after starting. Trusted server closeout writes remain valid.
CREATE OR REPLACE FUNCTION public.guard_personal_reset_session() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE zone text; today date;
BEGIN
 IF current_user NOT IN('anon','authenticated') THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  zone:=coalesce(NEW.timezone,'UTC'); IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'invalid_timezone'; END IF;
  today:=(now() AT TIME ZONE zone)::date;
  IF NEW.start_date<today THEN RAISE EXCEPTION 'reset_start_cannot_be_backdated'; END IF;
  NEW.timezone:=zone; NEW.current_day:=1; NEW.status:='active'; NEW.completed_at:=NULL; NEW.created_at:=now();
 ELSE
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.timezone IS DISTINCT FROM OLD.timezone OR NEW.current_day IS DISTINCT FROM OLD.current_day OR NEW.completed_at IS DISTINCT FROM OLD.completed_at OR (NEW.status='completed' AND OLD.status<>'completed') THEN RAISE EXCEPTION 'server_reset_progress_required'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_personal_reset_session ON public.reset_sessions;
CREATE TRIGGER guard_personal_reset_session BEFORE INSERT OR UPDATE ON public.reset_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_personal_reset_session();

CREATE OR REPLACE FUNCTION public.complete_legacy_reset_day(p_session_id uuid,p_reflection text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); session public.reset_sessions%ROWTYPE; saved public.daily_resets%ROWTYPE; zone text; day_num integer; complete_count integer; reward integer; bucket timestamptz:=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF length(coalesce(p_reflection,''))>4000 THEN RAISE EXCEPTION 'reflection_too_long'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':reset-reward',0));
 SELECT * INTO session FROM public.reset_sessions WHERE id=p_session_id AND user_id=actor FOR UPDATE;
 IF session.id IS NULL THEN RAISE EXCEPTION 'reset_not_found'; END IF;
 zone:=coalesce(session.timezone,'UTC'); IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'invalid_timezone'; END IF;
 day_num:=(now() AT TIME ZONE zone)::date-session.start_date+1;
 IF day_num NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'reset_outside_active_dates'; END IF;
 SELECT * INTO saved FROM public.daily_resets WHERE session_id=p_session_id AND user_id=actor AND day_number=day_num;
 IF saved.id IS NOT NULL THEN RETURN to_jsonb(saved); END IF;
 IF session.status<>'active' OR NOT coalesce(session.covenant_accepted,false) THEN RAISE EXCEPTION 'active_accepted_reset_required'; END IF;
 INSERT INTO public.daily_resets(session_id,user_id,day_number,reflection,completed_at,created_at) VALUES(p_session_id,actor,day_num,p_reflection,now(),now()) RETURNING * INTO saved;
 -- Restarting several attempts cannot farm multiple reset bonuses on one day.
 IF NOT EXISTS(SELECT 1 FROM public.xp_logs WHERE user_id=actor AND source='reset_day_complete' AND created_at>=bucket) THEN
  reward:=CASE day_num WHEN 7 THEN 50 ELSE 25 END;
  INSERT INTO public.xp_logs(user_id,amount,source,description) VALUES(actor,reward,'reset_day_complete',format('Completed Day %s of 7-Day Snapshot',day_num));
 END IF;
 SELECT count(DISTINCT day_number) INTO complete_count FROM public.daily_resets WHERE session_id=p_session_id AND user_id=actor AND day_number BETWEEN 1 AND 7;
 UPDATE public.reset_sessions SET current_day=least(day_num+1,7),status=CASE WHEN complete_count=7 THEN 'completed' ELSE 'active' END,completed_at=CASE WHEN complete_count=7 THEN now() ELSE NULL END WHERE id=p_session_id;
 RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.complete_legacy_reset_day(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_legacy_reset_day(uuid,text) TO authenticated;

-- Wellness entries remain private self-reports. Preserve their original server
-- timestamp so backfilled/imported rows cannot fabricate time-based XP milestones.
CREATE OR REPLACE FUNCTION public.guard_wellness_record_timestamp() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF current_user IN('anon','authenticated') THEN
  IF TG_OP='INSERT' THEN NEW.created_at:=now(); ELSE NEW.created_at:=OLD.created_at; NEW.user_id:=OLD.user_id; END IF;
 END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_wellness_record_timestamp ON public.wellness_logs;
CREATE TRIGGER guard_wellness_record_timestamp BEFORE INSERT OR UPDATE ON public.wellness_logs FOR EACH ROW EXECUTE FUNCTION public.guard_wellness_record_timestamp();
CREATE OR REPLACE FUNCTION public.award_wellness_milestone() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); today date:=(now() AT TIME ZONE 'UTC')::date; day date:=today; streak integer:=0; amount integer; label text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':wellness-reward',0));
 WHILE EXISTS(SELECT 1 FROM public.wellness_logs w WHERE w.user_id=actor AND w.log_date=day AND (w.created_at AT TIME ZONE 'UTC')::date=day) LOOP streak:=streak+1;day:=day-1;IF streak>3650 THEN EXIT;END IF;END LOOP;
 amount:=CASE streak WHEN 3 THEN 25 WHEN 7 THEN 50 WHEN 14 THEN 100 WHEN 30 THEN 200 ELSE 0 END;
 label:=format('wellness_milestone:%s:%s',today,streak);
 IF amount=0 OR EXISTS(SELECT 1 FROM public.xp_logs WHERE user_id=actor AND source='wellness_streak' AND description=label) THEN RETURN jsonb_build_object('amount',0,'streak',streak); END IF;
 INSERT INTO public.xp_logs(user_id,amount,source,description) VALUES(actor,amount,'wellness_streak',label);
 RETURN jsonb_build_object('amount',amount,'streak',streak);
END $$;
REVOKE ALL ON FUNCTION public.award_wellness_milestone() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.award_wellness_milestone() TO authenticated;

-- Legacy covenant milestones are self-reported history, separate from reviewed
-- Fully Charged attempts. Completion is derived from75 real dated check-ins.
ALTER TABLE public.covenant_challenges ADD COLUMN IF NOT EXISTS timezone text;
UPDATE public.covenant_challenges c SET timezone=p.timezone FROM public.profiles p WHERE c.user_id=p.id AND c.timezone IS NULL AND p.timezone IN(SELECT name FROM pg_timezone_names);
UPDATE public.covenant_challenges SET timezone='UTC' WHERE timezone IS NULL;
ALTER TABLE public.covenant_challenges ALTER COLUMN timezone SET DEFAULT 'UTC';
ALTER TABLE public.covenant_challenges ALTER COLUMN timezone SET NOT NULL;
REVOKE TRUNCATE,REFERENCES,TRIGGER ON public.reset_sessions,public.covenant_challenges,public.covenant_daily_checkins,public.wellness_logs FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.guard_legacy_covenant_challenge() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE today date; kept integer;
BEGIN
 IF current_user NOT IN('anon','authenticated') THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.timezone) THEN RAISE EXCEPTION 'invalid_timezone'; END IF;
 today:=(now() AT TIME ZONE NEW.timezone)::date;
 IF TG_OP='INSERT' THEN
  IF NEW.started_on<today THEN RAISE EXCEPTION 'covenant_start_cannot_be_backdated'; END IF;
  NEW.duration_days:=75;NEW.ends_on:=NEW.started_on+74;NEW.status:='active';NEW.completed_at:=NULL;NEW.created_at:=now();
 ELSE
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.started_on IS DISTINCT FROM OLD.started_on OR NEW.ends_on IS DISTINCT FROM OLD.ends_on OR NEW.duration_days IS DISTINCT FROM OLD.duration_days OR NEW.timezone IS DISTINCT FROM OLD.timezone THEN RAISE EXCEPTION 'attempt_dates_are_locked'; END IF;
  IF NEW.rules IS DISTINCT FROM OLD.rules AND EXISTS(SELECT 1 FROM public.covenant_daily_checkins WHERE challenge_id=OLD.id) THEN RAISE EXCEPTION 'attempt_rules_are_locked'; END IF;
  IF NEW.status='completed' AND OLD.status<>'completed' THEN
   SELECT count(DISTINCT checkin_date) INTO kept FROM public.covenant_daily_checkins WHERE challenge_id=NEW.id AND user_id=NEW.user_id AND day_complete AND checkin_date BETWEEN NEW.started_on AND NEW.started_on+74;
   IF NEW.duration_days<>75 OR today<NEW.started_on+74 OR kept<>75 THEN RAISE EXCEPTION 'seventy_five_recorded_days_required'; END IF;
   NEW.completed_at:=now();
  ELSIF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN RAISE EXCEPTION 'completion_timestamp_is_server_owned'; END IF;
 END IF;
 IF jsonb_typeof(NEW.rules)<>'array' OR jsonb_array_length(NEW.rules)=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(NEW.rules) AS r(value) WHERE r.value NOT IN('jesus_first','bible_read','alcohol_free','workout','nutrition','water','service')) THEN RAISE EXCEPTION 'invalid_covenant_rules'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_legacy_covenant_challenge ON public.covenant_challenges;
CREATE TRIGGER guard_legacy_covenant_challenge BEFORE INSERT OR UPDATE ON public.covenant_challenges FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_covenant_challenge();

CREATE OR REPLACE FUNCTION public.guard_legacy_covenant_checkin() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE challenge public.covenant_challenges%ROWTYPE; today date; complete boolean;
BEGIN
 IF current_user NOT IN('anon','authenticated') THEN RETURN NEW; END IF;
 SELECT * INTO challenge FROM public.covenant_challenges WHERE id=NEW.challenge_id AND user_id=auth.uid() FOR SHARE;
 IF challenge.id IS NULL OR NEW.user_id<>auth.uid() THEN RAISE EXCEPTION 'challenge_owner_required'; END IF;
 today:=(now() AT TIME ZONE challenge.timezone)::date;
 IF TG_OP='INSERT' THEN
  IF NEW.checkin_date<>today OR today NOT BETWEEN challenge.started_on AND challenge.started_on+74 THEN RAISE EXCEPTION 'current_covenant_day_required'; END IF;
  NEW.created_at:=now();
 ELSE
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.challenge_id IS DISTINCT FROM OLD.challenge_id OR NEW.checkin_date IS DISTINCT FROM OLD.checkin_date THEN RAISE EXCEPTION 'checkin_identity_is_locked'; END IF;
  NEW.created_at:=OLD.created_at;
 END IF;
 SELECT bool_and(CASE r.value WHEN 'jesus_first' THEN NEW.jesus_first WHEN 'bible_read' THEN NEW.bible_read WHEN 'alcohol_free' THEN NEW.alcohol_free WHEN 'workout' THEN NEW.workout_count>0 WHEN 'nutrition' THEN NEW.nutrition_kept WHEN 'water' THEN NEW.water_goal WHEN 'service' THEN NEW.service_count>0 ELSE false END) INTO complete FROM jsonb_array_elements_text(challenge.rules) AS r(value);
 NEW.day_complete:=coalesce(complete,false);
 IF TG_OP='UPDATE' AND NEW.checkin_date<>today AND NEW.day_complete AND NOT OLD.day_complete THEN RAISE EXCEPTION 'past_completion_cannot_be_backfilled'; END IF;
 NEW.completed_at:=CASE WHEN NEW.day_complete THEN coalesce(CASE WHEN TG_OP='UPDATE' THEN OLD.completed_at END,now()) ELSE NULL END;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_legacy_covenant_checkin ON public.covenant_daily_checkins;
CREATE TRIGGER guard_legacy_covenant_checkin BEFORE INSERT OR UPDATE ON public.covenant_daily_checkins FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_covenant_checkin();
CREATE OR REPLACE FUNCTION public.invalidate_corrected_covenant_completion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.day_complete AND NOT NEW.day_complete THEN UPDATE public.covenant_challenges SET status='ended',completed_at=NULL WHERE id=NEW.challenge_id AND user_id=NEW.user_id AND status='completed'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS invalidate_corrected_covenant_completion ON public.covenant_daily_checkins;
CREATE TRIGGER invalidate_corrected_covenant_completion AFTER UPDATE ON public.covenant_daily_checkins FOR EACH ROW EXECUTE FUNCTION public.invalidate_corrected_covenant_completion();

-- Trigger helpers are not public RPC entry points.
REVOKE ALL ON FUNCTION public.guard_personal_reset_session(),public.guard_wellness_record_timestamp(),public.guard_legacy_covenant_challenge(),public.guard_legacy_covenant_checkin(),public.invalidate_corrected_covenant_completion() FROM PUBLIC,anon,authenticated;

-- Other legacy personal events use fixed server rates and the same100 activity
-- XP pool. A receipt prevents reward farming by toggling a completed record.
CREATE TABLE IF NOT EXISTS public.personal_reward_receipts(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 source text NOT NULL CHECK(source IN('quest_complete','integrity_rep','time_log')),
 record_id uuid NOT NULL, amount integer NOT NULL CHECK(amount BETWEEN 0 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,source,record_id)
);
ALTER TABLE public.personal_reward_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.personal_reward_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.personal_reward_receipts TO service_role;
CREATE OR REPLACE FUNCTION public.award_legacy_personal_event(p_source text,p_record_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); valid boolean:=false; requested integer; used bigint; amount integer; bucket timestamptz:=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':personal-xp',0));
 IF EXISTS(SELECT 1 FROM public.personal_reward_receipts WHERE user_id=actor AND source=p_source AND record_id=p_record_id) THEN RETURN jsonb_build_object('amount',0,'alreadyAwarded',true); END IF;
 CASE p_source
  WHEN 'quest_complete' THEN SELECT EXISTS(SELECT 1 FROM public.main_quests WHERE id=p_record_id AND user_id=actor AND status='completed' AND completed_at>=bucket) INTO valid; requested:=500;
  WHEN 'integrity_rep' THEN SELECT EXISTS(SELECT 1 FROM public.integrity_logs WHERE id=p_record_id AND user_id=actor AND kept AND kept_at>=bucket) INTO valid; requested:=30;
  WHEN 'time_log' THEN SELECT EXISTS(SELECT 1 FROM public.time_logs WHERE id=p_record_id AND user_id=actor AND log_date BETWEEN (now() AT TIME ZONE 'UTC')::date-1 AND (now() AT TIME ZONE 'UTC')::date+1) INTO valid; requested:=10;
  ELSE RAISE EXCEPTION 'unregistered_reward_source';
 END CASE;
 IF NOT valid THEN RAISE EXCEPTION 'owned_completed_record_required'; END IF;
 SELECT coalesce(sum(greatest(x.amount,0)),0) INTO used FROM public.xp_logs x WHERE x.user_id=actor AND x.created_at>=bucket AND x.created_at<bucket+interval '1 day' AND x.source IN('planner_task','action_completed','mission_of_the_day','mission_self_trust','quest_complete','integrity_rep','time_log');
 amount:=least(requested,greatest(100-used,0));
 INSERT INTO public.personal_reward_receipts(user_id,source,record_id,amount) VALUES(actor,p_source,p_record_id,amount);
 IF amount>0 THEN INSERT INTO public.xp_logs(user_id,amount,source,description) VALUES(actor,amount,p_source,format('legacy_event:%s:%s',p_source,p_record_id)); END IF;
 RETURN jsonb_build_object('amount',amount,'alreadyAwarded',false);
END $$;
REVOKE ALL ON FUNCTION public.award_legacy_personal_event(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.award_legacy_personal_event(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_personal_event_timestamp() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF current_user IN('anon','authenticated') THEN
  IF TG_TABLE_NAME='main_quests' THEN
   IF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN NEW.completed_at:=now();
   ELSIF TG_OP='UPDATE' THEN NEW.completed_at:=OLD.completed_at;ELSE NEW.completed_at:=NULL;END IF;
  ELSIF TG_TABLE_NAME='integrity_logs' THEN
   IF NEW.kept AND (TG_OP='INSERT' OR OLD.kept IS DISTINCT FROM true) THEN NEW.kept_at:=now();
   ELSIF TG_OP='UPDATE' THEN NEW.kept_at:=OLD.kept_at;ELSE NEW.kept_at:=NULL;END IF;
  END IF;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_personal_event_timestamp ON public.main_quests;
CREATE TRIGGER guard_personal_event_timestamp BEFORE INSERT OR UPDATE ON public.main_quests FOR EACH ROW EXECUTE FUNCTION public.guard_personal_event_timestamp();
DROP TRIGGER IF EXISTS guard_personal_event_timestamp ON public.integrity_logs;
CREATE TRIGGER guard_personal_event_timestamp BEFORE INSERT OR UPDATE ON public.integrity_logs FOR EACH ROW EXECUTE FUNCTION public.guard_personal_event_timestamp();
REVOKE ALL ON FUNCTION public.guard_personal_event_timestamp() FROM PUBLIC,anon,authenticated;
