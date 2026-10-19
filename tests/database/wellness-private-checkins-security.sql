-- Disposable local Supabase only. All fixture users and data roll back.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
('30000000-0000-0000-0000-000000000001','private-a@example.invalid'),
('30000000-0000-0000-0000-000000000002','private-b@example.invalid');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
SELECT public.save_private_wellness_checkin('30000000-0000-0000-0000-000000000001','2026-10-19',3::smallint,7.5,'okay','private fixture');
SELECT public.save_private_wellness_checkin('30000000-0000-0000-0000-000000000001','2026-10-19',4::smallint,8,'peaceful',NULL);
DO $$ BEGIN
 IF (SELECT sleep_rating FROM public.wellness_private_checkins)<>4 THEN RAISE EXCEPTION 'owner upsert failed'; END IF;
 BEGIN
  PERFORM public.save_private_wellness_checkin('30000000-0000-0000-0000-000000000002','2026-10-19');
  RAISE EXCEPTION 'other owner RPC allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.wellness_private_checkins(user_id,local_date,mood) VALUES('30000000-0000-0000-0000-000000000002','2026-10-19','okay');
  RAISE EXCEPTION 'cross-owner insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.wellness_private_checkins SET user_id='30000000-0000-0000-0000-000000000002';
  RAISE EXCEPTION 'ownership mutation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_private_wellness_checkin('30000000-0000-0000-0000-000000000001','2026-10-19',6::smallint);
  RAISE EXCEPTION 'invalid rating allowed';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.save_private_wellness_checkin('30000000-0000-0000-0000-000000000001','2026-10-19',NULL,25,'invalid',repeat('x',281));
  RAISE EXCEPTION 'invalid content allowed';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.wellness_private_checkins) THEN RAISE EXCEPTION 'cross-owner read leaked'; END IF;
 UPDATE public.wellness_private_checkins SET note='wrong owner';
 IF FOUND THEN RAISE EXCEPTION 'cross-owner update allowed'; END IF;
 DELETE FROM public.wellness_private_checkins;
 IF FOUND THEN RAISE EXCEPTION 'cross-owner delete allowed'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.wellness_private_checkins;
  RAISE EXCEPTION 'anonymous read allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_private_wellness_checkin('30000000-0000-0000-0000-000000000001','2026-10-19');
  RAISE EXCEPTION 'anonymous save allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
DELETE FROM public.wellness_private_checkins WHERE user_id=auth.uid();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.wellness_private_checkins) THEN RAISE EXCEPTION 'owner delete failed'; END IF;
END $$;
ROLLBACK;
