-- LOCAL ONLY. Synthetic content and users; every fixture rolls back.
BEGIN;
DO $$ BEGIN
 IF (public.get_formation_entry_status()->>'strictReady')::boolean THEN RAISE EXCEPTION 'empty_bundle_ready'; END IF;
 IF (public.get_formation_entry_status()->>'emailDeliveryReady')::boolean THEN RAISE EXCEPTION 'unverified_email_ready'; END IF;
END $$;
DO $$
DECLARE
  completed_user_id constant uuid := '00000000-0000-4000-8000-000000000075';
  ended_user_id constant uuid := '00000000-0000-4000-8000-000000000010';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (
      completed_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'fully-charged-75-simulation@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      ended_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'fully-charged-ended-simulation@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

DO $$
DECLARE
  author_user_id constant uuid := '00000000-0000-4000-8000-000000000075';
  reviewer_user_id constant uuid := '00000000-0000-4000-8000-000000000010';
  item_id uuid;
  version_id uuid;
  day_value integer;
BEGIN
  FOR day_value IN 1..75 LOOP
    INSERT INTO public.formation_content_items (stable_id, content_type, created_by)
    VALUES ('simulation.fully-charged-75.day.' || day_value::text, 'daily_scripture_assignment', author_user_id)
    RETURNING id INTO item_id;

    INSERT INTO public.formation_content_versions (
      item_id, version, title, slug, body, formation_track, day_start, day_end,
      formation_season, scripture_reference, bible_translation, evidence_classification,
      author, author_user_id, reviewer, reviewer_user_id,
      theological_review_status, historical_review_status, publication_status,
      effective_date, last_reviewed_date, published_at
    ) VALUES (
      item_id, 1,
      'Simulation Day ' || day_value::text,
      'simulation-fully-charged-75-day-' || day_value::text,
      'Database simulation content for day ' || day_value::text || '.',
      'fully_charged_75', day_value, day_value,
      CASE WHEN day_value <= 25 THEN 'be_with_jesus' WHEN day_value <= 50 THEN 'become_like_jesus' ELSE 'do_what_jesus_did' END,
      'Matthew 4:18-22', 'Reference only', 'Scripture',
      'Simulation Author', author_user_id, 'Simulation Reviewer', reviewer_user_id,
      'approved', 'not_required', 'published', current_date, current_date, now()
    ) RETURNING id INTO version_id;

    UPDATE public.formation_content_items
    SET current_published_version_id = version_id
    WHERE id = item_id;
  END LOOP;
END;
$$;


SET LOCAL ROLE anon;
DO $$ DECLARE status jsonb; BEGIN
 status := public.get_formation_entry_status();
 IF status->>'strictReady' <> 'true' OR status->>'reviewedDays' <> '75' THEN RAISE EXCEPTION 'reviewed_bundle_unavailable'; END IF;
 IF status #>> '{sample,scriptureReference}' <> 'Matthew 4:18-22' THEN RAISE EXCEPTION 'sample_unavailable'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(status)) <> 4 THEN RAISE EXCEPTION 'unexpected_public_fields'; END IF;
 BEGIN
   PERFORM public.get_formation_entry_status(CURRENT_DATE + 32);
   RAISE EXCEPTION 'future_date_allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
   UPDATE public.formation_rule_rollouts SET formation_email_verified = true;
   RAISE EXCEPTION 'anonymous_email_verification_allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.formation_content_versions SET publication_status='draft' WHERE day_start=7;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (public.get_formation_entry_status()->>'strictReady')::boolean THEN RAISE EXCEPTION 'unpublished_day_ready'; END IF;
 IF public.get_formation_entry_status()->>'reviewedDays' <> '74' THEN RAISE EXCEPTION 'unpublished_day_counted'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
