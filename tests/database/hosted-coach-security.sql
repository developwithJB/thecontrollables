-- LOCAL ONLY. No provider calls, billing changes outside this rolled-back fixture, or real users.
BEGIN;
INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES
 ('60000000-0000-4000-8000-000000000001','authenticated','authenticated','hosted-free@example.test',now(),now()),
 ('60000000-0000-4000-8000-000000000002','authenticated','authenticated','hosted-plus@example.test',now(),now()),
 ('60000000-0000-4000-8000-000000000003','authenticated','authenticated','hosted-pro@example.test',now(),now());
INSERT INTO public.profiles (id,plan_tier) VALUES
 ('60000000-0000-4000-8000-000000000001','free'),('60000000-0000-4000-8000-000000000002','plus'),('60000000-0000-4000-8000-000000000003','pro')
ON CONFLICT (id) DO UPDATE SET plan_tier=excluded.plan_tier;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE hosted_coach_enabled) THEN RAISE EXCEPTION 'expected_hosted_default_off'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 BEGIN PERFORM public.select_hosted_coach(true); RAISE EXCEPTION 'flag_off_selection_allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.coach_provider_rollout SET hosted_coach_enabled=true,coach_providers_enabled=true WHERE id;
SET LOCAL ROLE authenticated;
DO $$ DECLARE owner_id text; BEGIN
 FOREACH owner_id IN ARRAY ARRAY['60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002'] LOOP
  PERFORM set_config('request.jwt.claim.sub',owner_id,true);
  IF public.get_hosted_coach_status()->>'entitled' <> 'false' THEN RAISE EXCEPTION 'non_pro_entitled'; END IF;
  BEGIN PERFORM public.select_hosted_coach(true); RAISE EXCEPTION 'non_pro_selected'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
END $$;
SELECT set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 PERFORM public.set_coach_api_key('openai_compatible','synthetic-hosted-key-1234','https://api.openai.com/v1','test-model');
 PERFORM public.select_hosted_coach(true);
 IF public.get_hosted_coach_status()->>'selected' <> 'true' THEN RAISE EXCEPTION 'pro_selection_failed'; END IF;
 IF (SELECT last4 FROM public.coach_provider_settings WHERE user_id=auth.uid()) <> '1234' THEN RAISE EXCEPTION 'hosted_destroyed_byo_key'; END IF;
 BEGIN UPDATE public.coach_provider_settings SET hosted_coach_selected=false; RAISE EXCEPTION 'client_can_bypass_selection_rpc'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.reserve_hosted_coach_usage(auth.uid()); RAISE EXCEPTION 'client_can_reserve'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE i integer; response jsonb; BEGIN
 BEGIN PERFORM public.reserve_hosted_coach_usage('60000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'free_hosted_reservation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 FOR i IN 1..25 LOOP
  response:=public.reserve_hosted_coach_usage('60000000-0000-4000-8000-000000000003');
  IF response->>'allowed'<>'true' THEN RAISE EXCEPTION 'pro_quota_failed'; END IF;
 END LOOP;
 response:=public.reserve_hosted_coach_usage('60000000-0000-4000-8000-000000000003');
 IF response->>'allowed'<>'false' THEN RAISE EXCEPTION 'pro_quota_cap_failed'; END IF;
END $$;
RESET ROLE;
-- Tampering with the old aggregate must not reset the new protected quota.
UPDATE public.ai_usage_logs SET message_count=0 WHERE user_id='60000000-0000-4000-8000-000000000003';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.reserve_hosted_coach_usage('60000000-0000-4000-8000-000000000003')->>'allowed'<>'false' THEN RAISE EXCEPTION 'legacy_log_can_reset_hosted_cap'; END IF;
END $$;
RESET ROLE;
-- Revoking paid access after selection must block subsequent reservations.
UPDATE public.profiles SET plan_tier='free' WHERE id='60000000-0000-4000-8000-000000000003';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN PERFORM public.reserve_hosted_coach_usage('60000000-0000-4000-8000-000000000003'); RAISE EXCEPTION 'downgrade_not_enforced'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 PERFORM public.select_hosted_coach(false);
 IF public.get_hosted_coach_status()->>'selected'<>'false' THEN RAISE EXCEPTION 'deselect_after_downgrade_failed'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET plan_tier='pro' WHERE id='60000000-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM public.select_hosted_coach(true);
 PERFORM public.set_coach_api_key('anthropic','synthetic-hosted-key-5678','https://api.anthropic.com','test-model');
 IF public.get_hosted_coach_status()->>'selected'<>'false' THEN RAISE EXCEPTION 'saving_byo_did_not_switch_back'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.get_hosted_coach_status(); RAISE EXCEPTION 'anon_hosted_status'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.select_hosted_coach(true); RAISE EXCEPTION 'anon_hosted_select'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'PASS: default off; free/Plus rejected; Pro selection retains key; no client mode write/reservation; 25/day cap; downgrade enforced; saving BYO switches back; anon denied'; END $$;
ROLLBACK;
