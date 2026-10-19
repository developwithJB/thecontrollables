-- Local disposable Supabase only. Requires profiles, book-loop and enrollment migrations.
BEGIN;
CREATE TRIGGER dashboard_local_enrollment AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('20000000-0000-0000-0000-000000000001','enrollment@example.invalid','{"formation_track":"fully_charged_75","formation_email_enabled":true,"formation_timezone":"America/Los_Angeles"}'),
('20000000-0000-0000-0000-000000000002','no-path@example.invalid','{"formation_email_enabled":true}');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id='20000000-0000-0000-0000-000000000001' AND formation_track='fully_charged_75' AND email_nudge_enabled AND formation_email_opt_in_at IS NOT NULL AND plan_tier='free') THEN RAISE EXCEPTION 'signup enrollment failed'; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id='20000000-0000-0000-0000-000000000002' AND email_nudge_enabled) THEN RAISE EXCEPTION 'email enabled without path'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
SELECT public.activate_formation_path('read_along');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE formation_track='read_along' AND email_nudge_enabled AND formation_email_opt_in_at IS NOT NULL) THEN RAISE EXCEPTION 'path change lost consent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.controllables_book_records WHERE kind='track' AND payload='"read_along"'::jsonb AND revision>1) THEN RAISE EXCEPTION 'path mirror failed'; END IF;
 IF (SELECT count(*) FROM public.profiles)<>1 THEN RAISE EXCEPTION 'profile isolation failed'; END IF;
 BEGIN
  PERFORM public.activate_formation_path('charge_40');
  RAISE EXCEPTION 'closed path allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.activate_formation_path(NULL);
  RAISE EXCEPTION 'null path allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  UPDATE public.profiles SET plan_tier='pro' WHERE id=auth.uid();
  RAISE EXCEPTION 'billing escalation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.activate_formation_path('fully_charged_75',false);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE email_nudge_enabled OR formation_email_opt_in_at IS NOT NULL) THEN RAISE EXCEPTION 'opt-out failed'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.activate_formation_path('read_along',true);
  RAISE EXCEPTION 'anonymous enrollment allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
