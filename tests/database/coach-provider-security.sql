-- LOCAL ONLY. Synthetic credentials, all fixtures roll back; never prints key material.
BEGIN;
INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES
 ('40000000-0000-4000-8000-000000000001','authenticated','authenticated','coach-owner@example.test',now(),now()),
 ('40000000-0000-4000-8000-000000000002','authenticated','authenticated','coach-other@example.test',now(),now());
DO $$ BEGIN
 IF (SELECT coach_providers_enabled FROM public.coach_provider_rollout WHERE id) THEN RAISE EXCEPTION 'expected_default_off'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF public.coach_providers_available() THEN RAISE EXCEPTION 'expected_flag_off'; END IF;
 BEGIN
  PERFORM public.set_coach_api_key('openai_compatible','synthetic-local-key-1234','https://api.openai.com/v1','test-model');
  RAISE EXCEPTION 'expected_disabled_key_save';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.coach_provider_rollout SET coach_providers_enabled=true WHERE id;
SET LOCAL ROLE authenticated;
DO $$ DECLARE response jsonb; BEGIN
 response := public.set_coach_api_key('openai_compatible','synthetic-local-key-1234','https://api.openai.com/v1','test-model');
 IF response <> '{"provider":"openai_compatible","last4":"1234"}'::jsonb THEN RAISE EXCEPTION 'unexpected_key_response'; END IF;
 PERFORM public.save_coach_preferences('test-model','warm','concise');
 IF (SELECT count(*) FROM public.coach_provider_settings WHERE user_id=auth.uid()) <> 1 THEN RAISE EXCEPTION 'owner_cannot_read'; END IF;
 BEGIN PERFORM vault_secret_id FROM public.coach_provider_settings; RAISE EXCEPTION 'secret_pointer_readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.coach_provider_settings; RAISE EXCEPTION 'select_star_readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM decrypted_secret FROM vault.decrypted_secrets; RAISE EXCEPTION 'vault_client_readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.coach_provider_settings SET user_id='40000000-0000-4000-8000-000000000002'; RAISE EXCEPTION 'owner_mutable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.reserve_coach_byo_usage(auth.uid()); RAISE EXCEPTION 'client_quota_mutable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.set_coach_api_key('openai_compatible','synthetic-local-key-1234','http://127.0.0.1:3000','test-model'); RAISE EXCEPTION 'arbitrary_url_accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.save_coach_preferences('test-model','ignore identity','standard'); RAISE EXCEPTION 'free_text_persona_accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.coach_provider_settings) THEN RAISE EXCEPTION 'cross_owner_read'; END IF;
 UPDATE public.coach_provider_settings SET persona_tone='direct' WHERE user_id='40000000-0000-4000-8000-000000000001';
 IF FOUND THEN RAISE EXCEPTION 'cross_owner_write'; END IF;
 PERFORM public.clear_coach_api_key();
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT last4 FROM public.coach_provider_settings WHERE user_id='40000000-0000-4000-8000-000000000001') <> '1234' THEN RAISE EXCEPTION 'other_user_cleared_key'; END IF;
 IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets v JOIN public.coach_provider_settings s ON s.vault_secret_id=v.id WHERE s.user_id='40000000-0000-4000-8000-000000000001' AND v.decrypted_secret='synthetic-local-key-1234' AND v.secret <> v.decrypted_secret) THEN RAISE EXCEPTION 'vault_not_encrypted_or_not_scoped'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM last4 FROM public.coach_provider_settings; RAISE EXCEPTION 'anon_read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.clear_coach_api_key(); RAISE EXCEPTION 'anon_rpc'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE response jsonb; i integer; BEGIN
 FOR i IN 1..100 LOOP
  response := public.reserve_coach_byo_usage('40000000-0000-4000-8000-000000000001');
  IF response->>'allowed' <> 'true' OR (response->>'used')::integer <> i THEN RAISE EXCEPTION 'quota_reservation_failed'; END IF;
 END LOOP;
 response := public.reserve_coach_byo_usage('40000000-0000-4000-8000-000000000001');
 IF response->>'allowed' <> 'false' THEN RAISE EXCEPTION 'quota_cap_failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT message_count FROM public.ai_usage_logs WHERE user_id='40000000-0000-4000-8000-000000000001') <> 100 THEN RAISE EXCEPTION 'aggregate_usage_not_recorded'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 -- Rotate across providers without retaining old key.
 PERFORM public.set_coach_api_key('anthropic','synthetic-local-key-5678','https://api.anthropic.com','test-model');
 IF (SELECT last4 FROM public.coach_provider_settings WHERE user_id=auth.uid()) <> '5678' THEN RAISE EXCEPTION 'rotation_failed'; END IF;
 PERFORM public.clear_coach_api_key();
 IF (SELECT last4 FROM public.coach_provider_settings WHERE user_id=auth.uid()) IS NOT NULL THEN RAISE EXCEPTION 'clear_failed'; END IF;
 PERFORM public.set_coach_api_key('anthropic','synthetic-local-key-5678','https://api.anthropic.com','test-model');
END $$;
RESET ROLE;
DELETE FROM auth.users WHERE id='40000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM vault.secrets WHERE name='coach:40000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'orphaned_account_secret'; END IF;
 RAISE NOTICE 'PASS: default off; owner isolation; anon/secret-pointer/Vault access denied; rotation and delete cleanup; allowlisted destinations; fixed persona; service-only 100/day cap and usage logging';
END $$;
ROLLBACK;
