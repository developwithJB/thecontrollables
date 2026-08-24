-- Run after `supabase db reset`:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/database/fully-charged-75-simulation.sql
--
-- The transaction is rolled back. It persists 75 canonical day rows and 375
-- strict circuit rows long enough to assert the real database lifecycle, then
-- proves an incomplete Day 10 ends a separate attempt without rewriting history.

BEGIN;

DO $$
BEGIN
  IF extract(epoch FROM (
    (DATE '2027-03-15'::timestamp AT TIME ZONE 'America/Los_Angeles')
    - (DATE '2027-03-14'::timestamp AT TIME ZONE 'America/Los_Angeles')
  )) / 3600 <> 23 THEN
    RAISE EXCEPTION 'simulation_expected_23_hour_spring_day';
  END IF;
  IF extract(epoch FROM (
    (DATE '2027-11-08'::timestamp AT TIME ZONE 'America/Los_Angeles')
    - (DATE '2027-11-07'::timestamp AT TIME ZONE 'America/Los_Angeles')
  )) / 3600 <> 25 THEN
    RAISE EXCEPTION 'simulation_expected_25_hour_fall_day';
  END IF;
END;
$$;

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

DO $$
DECLARE
  simulation_user_id constant uuid := '00000000-0000-4000-8000-000000000075';
  attempt public.formation_attempts;
  target_day public.formation_days;
  closeout jsonb;
  day_value integer;
  circuit_value text;
  completed_actions text[];
  circuit_payload jsonb;
  day_content_version_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', simulation_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT * INTO attempt
  FROM public.start_fully_charged_attempt(
    (now() AT TIME ZONE 'UTC')::date,
    'UTC',
    'Complete one honest Main Promise each day.',
    'formation-circuits-v1',
    'fully-charged-75-content-v1',
    true, true, true, true, true,
    'simulation:start:complete',
    NULL
  );

  IF (SELECT count(*) FROM public.formation_days WHERE attempt_id = attempt.id) <> 75 THEN
    RAISE EXCEPTION 'simulation_expected_75_day_rows';
  END IF;
  IF (SELECT count(*) FROM public.formation_days WHERE attempt_id = attempt.id AND formation_season = 'be_with_jesus') <> 25
     OR (SELECT count(*) FROM public.formation_days WHERE attempt_id = attempt.id AND formation_season = 'become_like_jesus') <> 25
     OR (SELECT count(*) FROM public.formation_days WHERE attempt_id = attempt.id AND formation_season = 'do_what_jesus_did') <> 25 THEN
    RAISE EXCEPTION 'simulation_expected_three_25_day_seasons';
  END IF;

  FOR day_value IN 1..75 LOOP
    SELECT * INTO target_day
    FROM public.formation_days
    WHERE attempt_id = attempt.id AND day_number = day_value;

    -- Advance the authoritative test clock window without changing now().
    UPDATE public.formation_days
    SET utc_open_at = now() - interval '1 hour',
        utc_close_at = now() + interval '1 hour',
        status = 'open',
        opened_at = COALESCE(opened_at, now())
    WHERE id = target_day.id;

    SELECT version.id INTO day_content_version_id
    FROM public.formation_content_versions AS version
    JOIN public.formation_content_items AS item ON item.current_published_version_id = version.id
    WHERE version.formation_track = 'fully_charged_75'
      AND version.day_start = day_value
      AND version.day_end = day_value
      AND version.publication_status = 'published'
    ORDER BY version.published_at DESC
    LIMIT 1;

    IF day_value = 1 THEN
      BEGIN
        PERFORM public.save_formation_circuit(
          target_day.local_date, 'fully_charged_75', 'awareness', 'formation-circuits-v1', 'complete',
          ARRAY['scripture_opened', 'reading_completed', 'honest_truth_saved']::text[], '{}', '{}'::jsonb,
          'simulation:tampered-client-claim', day_content_version_id
        );
        RAISE EXCEPTION 'simulation_expected_tampered_client_claim_rejection';
      EXCEPTION WHEN SQLSTATE '22023' THEN
        IF SQLERRM <> 'strict_action_claim_does_not_match_payload' THEN
          RAISE;
        END IF;
      END;
    END IF;

    FOR circuit_value IN
      SELECT unnest(ARRAY['awareness', 'perspective', 'habit', 'wellness', 'environment']::text[])
    LOOP
      completed_actions := CASE circuit_value
        WHEN 'awareness' THEN ARRAY['scripture_opened', 'reading_completed', 'honest_truth_saved']::text[]
        WHEN 'perspective' THEN ARRAY['prayer_practiced', 'gratitude_recorded', 'control_release_move_recorded', 'smaller_faithful_action']::text[]
        WHEN 'habit' THEN ARRAY['main_promise_named', 'main_promise_completed']::text[]
        WHEN 'wellness' THEN ARRAY['nutrition_covenant_honored', 'hydration_covenant_honored', 'movement_block_one', 'movement_block_two', 'outdoor_movement']::text[]
        ELSE ARRAY['friction_removed', 'tomorrow_prepared', 'service_completed']::text[]
      END;
      circuit_payload := CASE circuit_value
        WHEN 'awareness' THEN jsonb_build_object(
          'actions', jsonb_build_object('scripture_opened', true, 'reading_completed', true),
          'fields', jsonb_build_object('honestTruth', 'One honest truth.')
        )
        WHEN 'perspective' THEN jsonb_build_object(
          'actions', jsonb_build_object('prayer_practiced', true),
          'fields', jsonb_build_object(
            'gratitude', 'One concrete gift.', 'control', 'My next choice.',
            'release', 'The outcome.', 'move', 'Take the next step.',
            'faithfulAction', 'One smaller faithful action.'
          )
        )
        WHEN 'habit' THEN jsonb_build_object(
          'actions', jsonb_build_object('main_promise_completed', true),
          'fields', jsonb_build_object('mainPromise', 'Keep one clear promise.')
        )
        WHEN 'wellness' THEN jsonb_build_object(
          'actions', jsonb_build_object('nutrition_covenant_honored', true, 'hydration_covenant_honored', true),
          'movement', jsonb_build_object(
            'one', jsonb_build_object('completed', true, 'description', 'Safe block one.', 'outdoors', true, 'adaptation', 'standard'),
            'two', jsonb_build_object('completed', true, 'description', 'Safe block two.', 'outdoors', false, 'adaptation', 'standard')
          )
        )
        ELSE jsonb_build_object(
          'actions', jsonb_build_object('service_completed', true),
          'fields', jsonb_build_object('frictionRemoved', 'Removed one friction.', 'tomorrowPrepared', 'Prepared one cue.')
        )
      END;

      PERFORM public.save_formation_circuit(
        target_day.local_date,
        'fully_charged_75',
        circuit_value,
        'formation-circuits-v1',
        'complete',
        completed_actions,
        '{}',
        circuit_payload,
        'simulation:' || attempt.id::text || ':day:' || day_value::text || ':' || circuit_value,
        day_content_version_id
      );
    END LOOP;

    closeout := public.close_fully_charged_day(
      attempt.id,
      'simulation:' || attempt.id::text || ':close:' || day_value::text
    );

    IF closeout ->> 'dayStatus' <> 'complete' THEN
      RAISE EXCEPTION 'simulation_day_%_did_not_complete: %', day_value, closeout;
    END IF;
  END LOOP;

  SELECT * INTO attempt FROM public.formation_attempts WHERE id = attempt.id;
  IF attempt.status <> 'completed' OR attempt.completed_day_count <> 75 THEN
    RAISE EXCEPTION 'simulation_attempt_did_not_complete';
  END IF;
  IF (SELECT count(*) FROM public.formation_days WHERE attempt_id = attempt.id AND status = 'complete') <> 75 THEN
    RAISE EXCEPTION 'simulation_expected_75_complete_days';
  END IF;
  IF (SELECT count(*) FROM public.formation_circuit_entries WHERE attempt_id = attempt.id AND completion_state = 'complete') <> 375 THEN
    RAISE EXCEPTION 'simulation_expected_375_complete_circuits';
  END IF;
  IF (SELECT count(*) FROM public.formation_completion_records WHERE source_journey_id = attempt.id) <> 1 THEN
    RAISE EXCEPTION 'simulation_expected_one_atomic_completion_record';
  END IF;
END;
$$;

DO $$
DECLARE
  simulation_user_id constant uuid := '00000000-0000-4000-8000-000000000010';
  attempt public.formation_attempts;
  target_day public.formation_days;
  closeout jsonb;
  day_value integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', simulation_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT * INTO attempt
  FROM public.start_fully_charged_attempt(
    (now() AT TIME ZONE 'UTC')::date,
    'UTC',
    'Practice the next honest promise.',
    'formation-circuits-v1',
    'fully-charged-75-content-v1',
    true, true, true, true, true,
    'simulation:start:ended',
    NULL
  );

  -- Directly mark the first nine canonical days complete to focus this second
  -- database scenario on the missed-day terminal transition.
  FOR day_value IN 1..9 LOOP
    UPDATE public.formation_days
    SET status = 'complete', opened_at = now(), closed_at = now(),
        closeout_idempotency_key = 'simulation:preclosed:' || day_value::text,
        closeout_summary = jsonb_build_object('dayStatus', 'complete', 'dayNumber', day_value)
    WHERE attempt_id = attempt.id AND day_number = day_value;
  END LOOP;
  UPDATE public.formation_attempts
  SET current_day_number = 10, completed_day_count = 9
  WHERE id = attempt.id;

  SELECT * INTO target_day
  FROM public.formation_days
  WHERE attempt_id = attempt.id AND day_number = 10;
  UPDATE public.formation_days
  SET utc_open_at = now() - interval '2 hours', utc_close_at = now() - interval '1 hour',
      status = 'open', opened_at = now() - interval '2 hours'
  WHERE id = target_day.id;

  closeout := public.close_fully_charged_day(attempt.id, 'simulation:missed:day:10');
  IF closeout ->> 'attemptStatus' <> 'ended' OR (closeout ->> 'dayNumber')::integer <> 10 THEN
    RAISE EXCEPTION 'simulation_expected_attempt_to_end_on_day_10: %', closeout;
  END IF;
  IF (SELECT completed_day_count FROM public.formation_attempts WHERE id = attempt.id) <> 9 THEN
    RAISE EXCEPTION 'simulation_ended_attempt_rewrote_completed_history';
  END IF;
END;
$$;

ROLLBACK;
