-- New attempts only. No existing attempt/day is rewritten. Sunday=0 ... Saturday=6.
ALTER TABLE public.formation_attempts ADD COLUMN rest_weekday smallint
  CHECK (rest_weekday BETWEEN 0 AND 6);
ALTER TABLE public.formation_attempts ADD CONSTRAINT sabbath_attempt_requires_weekday
  CHECK (rules_version <> 'v2_sabbath' OR rest_weekday IS NOT NULL);
CREATE TABLE public.formation_rule_rollouts (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  sabbath_new_attempts_enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE public.formation_rule_rollouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.formation_rule_rollouts FROM PUBLIC, anon, authenticated;
INSERT INTO public.formation_rule_rollouts (id) VALUES (true);
-- Only service-role/DB administration may disable future starts. Existing v2 rules stay pinned.
GRANT SELECT, UPDATE ON public.formation_rule_rollouts TO service_role;
CREATE FUNCTION public.lock_formation_attempt_rules() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.rules_version IS DISTINCT FROM OLD.rules_version OR NEW.rest_weekday IS DISTINCT FROM OLD.rest_weekday THEN
    RAISE EXCEPTION 'attempt_rules_locked' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER formation_attempt_rules_locked BEFORE UPDATE ON public.formation_attempts
FOR EACH ROW EXECUTE FUNCTION public.lock_formation_attempt_rules();

CREATE OR REPLACE FUNCTION public.start_fully_charged_attempt(
  p_start_local_date date,
  p_timezone text,
  p_main_promise text,
  p_rules_version text,
  p_content_bundle_version text,
  p_strict_opt_in boolean,
  p_rules_accepted boolean,
  p_personal_covenant_accepted boolean,
  p_environment_prepared boolean,
  p_privacy_safety_acknowledged boolean,
  p_idempotency_key text,
  p_previous_attempt_id uuid DEFAULT NULL
)
RETURNS public.formation_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  existing_attempt public.formation_attempts;
  existing_main_promise text;
  previous_attempt public.formation_attempts;
  saved_attempt public.formation_attempts;
  next_sequence integer;
  local_today date;
  initial_status text;
BEGIN
  IF p_rules_version = 'v2_sabbath' THEN RAISE EXCEPTION 'sabbath_start_rpc_required' USING ERRCODE = '22023'; END IF;
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF NOT p_strict_opt_in OR NOT p_rules_accepted OR NOT p_personal_covenant_accepted
     OR NOT p_environment_prepared OR NOT p_privacy_safety_acknowledged THEN
    RAISE EXCEPTION 'strict_readiness_incomplete' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_main_promise, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'main_promise_required' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_rules_version, ''))) = 0
     OR length(trim(COALESCE(p_content_bundle_version, ''))) = 0
     OR length(trim(COALESCE(p_idempotency_key, ''))) = 0 THEN
    RAISE EXCEPTION 'attempt_versions_and_idempotency_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RAISE EXCEPTION 'invalid_iana_timezone' USING ERRCODE = '22023';
  END IF;
  IF p_content_bundle_version <> 'fully-charged-75-content-v1' THEN
    RAISE EXCEPTION 'unsupported_fully_charged_content_bundle' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(*)
    FROM public.formation_content_items AS item
    JOIN public.formation_content_versions AS version
      ON version.id = item.current_published_version_id
    WHERE version.formation_track = 'fully_charged_75'
      AND version.day_start = version.day_end
      AND version.day_start BETWEEN 1 AND 75
      AND version.publication_status = 'published'
      AND version.theological_review_status = 'approved'
      AND version.scripture_reference IS NOT NULL
      AND version.evidence_classification = 'Scripture'
      AND version.reviewer_user_id IS NOT NULL
      AND version.reviewer_user_id IS DISTINCT FROM version.author_user_id
      AND version.effective_date <= p_start_local_date
  ) <> 75 OR (
    SELECT count(*)
    FROM generate_series(1, 75) AS required_day
    WHERE EXISTS (
      SELECT 1
      FROM public.formation_content_items AS item
      JOIN public.formation_content_versions AS version
        ON version.id = item.current_published_version_id
      WHERE version.formation_track = 'fully_charged_75'
        AND version.day_start = required_day
        AND version.day_end = required_day
        AND version.publication_status = 'published'
        AND version.theological_review_status = 'approved'
        AND version.scripture_reference IS NOT NULL
        AND version.evidence_classification = 'Scripture'
        AND version.reviewer_user_id IS NOT NULL
        AND version.reviewer_user_id IS DISTINCT FROM version.author_user_id
        AND version.effective_date <= p_start_local_date
    )
  ) <> 75 THEN
    RAISE EXCEPTION 'reviewed_75_day_content_bundle_not_ready' USING ERRCODE = '55000';
  END IF;

  local_today := (now() AT TIME ZONE p_timezone)::date;
  IF p_start_local_date < local_today OR p_start_local_date > local_today + 30 THEN
    RAISE EXCEPTION 'start_date_must_be_today_or_within_30_days' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':fully_charged_75', 0));

  SELECT * INTO existing_attempt
  FROM public.formation_attempts
  WHERE user_id = current_user_id AND start_idempotency_key = p_idempotency_key;

  IF existing_attempt.id IS NOT NULL THEN
    SELECT main_promise INTO existing_main_promise
    FROM public.formation_strict_setups
    WHERE attempt_id = existing_attempt.id AND user_id = current_user_id;
    IF existing_attempt.planned_start_local_date <> p_start_local_date
       OR existing_attempt.start_timezone <> p_timezone
       OR existing_attempt.rules_version <> p_rules_version
       OR existing_attempt.content_bundle_version <> p_content_bundle_version
       OR existing_attempt.previous_attempt_id IS DISTINCT FROM p_previous_attempt_id
       OR existing_main_promise IS DISTINCT FROM trim(p_main_promise) THEN
      RAISE EXCEPTION 'idempotency_key_reused_with_different_attempt' USING ERRCODE = '23505';
    END IF;
    RETURN existing_attempt;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.formation_attempts
    WHERE user_id = current_user_id AND track = 'fully_charged_75' AND status IN ('scheduled', 'active')
  ) THEN
    RAISE EXCEPTION 'active_fully_charged_attempt_exists' USING ERRCODE = '23505';
  END IF;

  IF p_previous_attempt_id IS NOT NULL THEN
    SELECT * INTO previous_attempt
    FROM public.formation_attempts
    WHERE id = p_previous_attempt_id
      AND user_id = current_user_id
      AND track = 'fully_charged_75'
      AND status IN ('ended', 'cancelled');
    IF previous_attempt.id IS NULL THEN
      RAISE EXCEPTION 'previous_terminal_attempt_not_owned' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.formation_circuit_entries
      WHERE attempt_id = previous_attempt.id
        AND local_date = p_start_local_date
    ) THEN
      RAISE EXCEPTION 'begin_again_must_start_after_previous_practice_date' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.formation_circuit_entries
    WHERE user_id = current_user_id
      AND track = 'fully_charged_75'
      AND local_date BETWEEN p_start_local_date AND p_start_local_date + 74
  ) THEN
    RAISE EXCEPTION 'attempt_date_range_conflicts_with_existing_strict_history' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_sequence
  FROM public.formation_attempts
  WHERE user_id = current_user_id AND track = 'fully_charged_75';

  initial_status := CASE WHEN p_start_local_date = local_today THEN 'active' ELSE 'scheduled' END;

  INSERT INTO public.formation_attempts (
    user_id, sequence_number, status, rules_version, content_bundle_version,
    planned_start_local_date, start_timezone, current_day_number, previous_attempt_id,
    start_idempotency_key, strict_opt_in_at, rules_accepted_at, started_at
  ) VALUES (
    current_user_id, next_sequence, initial_status, trim(p_rules_version), trim(p_content_bundle_version),
    p_start_local_date, p_timezone, 1, p_previous_attempt_id,
    trim(p_idempotency_key), now(), now(), CASE WHEN initial_status = 'active' THEN now() ELSE NULL END
  ) RETURNING * INTO saved_attempt;

  INSERT INTO public.formation_strict_setups (
    attempt_id, user_id, main_promise, personal_covenant_accepted,
    environment_prepared, privacy_safety_acknowledged
  ) VALUES (
    saved_attempt.id, current_user_id, trim(p_main_promise), true, true, true
  );

  INSERT INTO public.formation_days (
    attempt_id, user_id, day_number, local_date, formation_season,
    timezone_used, utc_open_at, utc_close_at, status, rules_version, opened_at
  )
  SELECT
    saved_attempt.id,
    current_user_id,
    offset_value + 1,
    p_start_local_date + offset_value,
    CASE
      WHEN offset_value + 1 <= 25 THEN 'be_with_jesus'
      WHEN offset_value + 1 <= 50 THEN 'become_like_jesus'
      ELSE 'do_what_jesus_did'
    END,
    p_timezone,
    ((p_start_local_date + offset_value)::timestamp AT TIME ZONE p_timezone),
    ((p_start_local_date + offset_value + 1)::timestamp AT TIME ZONE p_timezone),
    CASE WHEN offset_value = 0 AND initial_status = 'active' THEN 'open' ELSE 'scheduled' END,
    trim(p_rules_version),
    CASE WHEN offset_value = 0 AND initial_status = 'active' THEN now() ELSE NULL END
  FROM generate_series(0, 74) AS offset_value;

  RETURN saved_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.start_fully_charged_attempt(
  date, text, text, text, text, boolean, boolean, boolean, boolean, boolean, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_fully_charged_attempt(
  date, text, text, text, text, boolean, boolean, boolean, boolean, boolean, text, uuid
) TO authenticated;


CREATE OR REPLACE FUNCTION public.start_fully_charged_sabbath_attempt(
  p_start_local_date date,
  p_timezone text,
  p_main_promise text,
  p_rules_version text,
  p_content_bundle_version text,
  p_strict_opt_in boolean,
  p_rules_accepted boolean,
  p_personal_covenant_accepted boolean,
  p_environment_prepared boolean,
  p_privacy_safety_acknowledged boolean,
  p_idempotency_key text,
  p_previous_attempt_id uuid,
  p_rest_weekday smallint
)
RETURNS public.formation_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  existing_attempt public.formation_attempts;
  existing_main_promise text;
  previous_attempt public.formation_attempts;
  saved_attempt public.formation_attempts;
  next_sequence integer;
  local_today date;
  initial_status text;
BEGIN
  IF p_rules_version <> 'v2_sabbath' OR p_rest_weekday IS NULL OR p_rest_weekday NOT BETWEEN 0 AND 6 THEN
    RAISE EXCEPTION 'invalid_sabbath_setup' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.formation_rule_rollouts WHERE id AND sabbath_new_attempts_enabled) THEN
    RAISE EXCEPTION 'sabbath_new_attempts_disabled' USING ERRCODE = '55000';
  END IF;
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF NOT p_strict_opt_in OR NOT p_rules_accepted OR NOT p_personal_covenant_accepted
     OR NOT p_environment_prepared OR NOT p_privacy_safety_acknowledged THEN
    RAISE EXCEPTION 'strict_readiness_incomplete' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_main_promise, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'main_promise_required' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_rules_version, ''))) = 0
     OR length(trim(COALESCE(p_content_bundle_version, ''))) = 0
     OR length(trim(COALESCE(p_idempotency_key, ''))) = 0 THEN
    RAISE EXCEPTION 'attempt_versions_and_idempotency_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RAISE EXCEPTION 'invalid_iana_timezone' USING ERRCODE = '22023';
  END IF;
  IF p_content_bundle_version <> 'fully-charged-75-content-v1' THEN
    RAISE EXCEPTION 'unsupported_fully_charged_content_bundle' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(*)
    FROM public.formation_content_items AS item
    JOIN public.formation_content_versions AS version
      ON version.id = item.current_published_version_id
    WHERE version.formation_track = 'fully_charged_75'
      AND version.day_start = version.day_end
      AND version.day_start BETWEEN 1 AND 75
      AND version.publication_status = 'published'
      AND version.theological_review_status = 'approved'
      AND version.scripture_reference IS NOT NULL
      AND version.evidence_classification = 'Scripture'
      AND version.reviewer_user_id IS NOT NULL
      AND version.reviewer_user_id IS DISTINCT FROM version.author_user_id
      AND version.effective_date <= p_start_local_date
  ) <> 75 OR (
    SELECT count(*)
    FROM generate_series(1, 75) AS required_day
    WHERE EXISTS (
      SELECT 1
      FROM public.formation_content_items AS item
      JOIN public.formation_content_versions AS version
        ON version.id = item.current_published_version_id
      WHERE version.formation_track = 'fully_charged_75'
        AND version.day_start = required_day
        AND version.day_end = required_day
        AND version.publication_status = 'published'
        AND version.theological_review_status = 'approved'
        AND version.scripture_reference IS NOT NULL
        AND version.evidence_classification = 'Scripture'
        AND version.reviewer_user_id IS NOT NULL
        AND version.reviewer_user_id IS DISTINCT FROM version.author_user_id
        AND version.effective_date <= p_start_local_date
    )
  ) <> 75 THEN
    RAISE EXCEPTION 'reviewed_75_day_content_bundle_not_ready' USING ERRCODE = '55000';
  END IF;

  local_today := (now() AT TIME ZONE p_timezone)::date;
  IF p_start_local_date < local_today OR p_start_local_date > local_today + 30 THEN
    RAISE EXCEPTION 'start_date_must_be_today_or_within_30_days' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':fully_charged_75', 0));

  SELECT * INTO existing_attempt
  FROM public.formation_attempts
  WHERE user_id = current_user_id AND start_idempotency_key = p_idempotency_key;

  IF existing_attempt.id IS NOT NULL THEN
    SELECT main_promise INTO existing_main_promise
    FROM public.formation_strict_setups
    WHERE attempt_id = existing_attempt.id AND user_id = current_user_id;
    IF existing_attempt.planned_start_local_date <> p_start_local_date
       OR existing_attempt.start_timezone <> p_timezone
       OR existing_attempt.rest_weekday IS DISTINCT FROM p_rest_weekday
       OR existing_attempt.rules_version <> p_rules_version
       OR existing_attempt.content_bundle_version <> p_content_bundle_version
       OR existing_attempt.previous_attempt_id IS DISTINCT FROM p_previous_attempt_id
       OR existing_main_promise IS DISTINCT FROM trim(p_main_promise) THEN
      RAISE EXCEPTION 'idempotency_key_reused_with_different_attempt' USING ERRCODE = '23505';
    END IF;
    RETURN existing_attempt;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.formation_attempts
    WHERE user_id = current_user_id AND track = 'fully_charged_75' AND status IN ('scheduled', 'active')
  ) THEN
    RAISE EXCEPTION 'active_fully_charged_attempt_exists' USING ERRCODE = '23505';
  END IF;

  IF p_previous_attempt_id IS NOT NULL THEN
    SELECT * INTO previous_attempt
    FROM public.formation_attempts
    WHERE id = p_previous_attempt_id
      AND user_id = current_user_id
      AND track = 'fully_charged_75'
      AND status IN ('ended', 'cancelled');
    IF previous_attempt.id IS NULL THEN
      RAISE EXCEPTION 'previous_terminal_attempt_not_owned' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.formation_circuit_entries
      WHERE attempt_id = previous_attempt.id
        AND local_date = p_start_local_date
    ) THEN
      RAISE EXCEPTION 'begin_again_must_start_after_previous_practice_date' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.formation_circuit_entries
    WHERE user_id = current_user_id
      AND track = 'fully_charged_75'
      AND local_date BETWEEN p_start_local_date AND p_start_local_date + 74
  ) THEN
    RAISE EXCEPTION 'attempt_date_range_conflicts_with_existing_strict_history' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_sequence
  FROM public.formation_attempts
  WHERE user_id = current_user_id AND track = 'fully_charged_75';

  initial_status := CASE WHEN p_start_local_date = local_today THEN 'active' ELSE 'scheduled' END;

  INSERT INTO public.formation_attempts (
    user_id, sequence_number, status, rules_version, content_bundle_version, rest_weekday,
    planned_start_local_date, start_timezone, current_day_number, previous_attempt_id,
    start_idempotency_key, strict_opt_in_at, rules_accepted_at, started_at
  ) VALUES (
    current_user_id, next_sequence, initial_status, trim(p_rules_version), trim(p_content_bundle_version), p_rest_weekday,
    p_start_local_date, p_timezone, 1, p_previous_attempt_id,
    trim(p_idempotency_key), now(), now(), CASE WHEN initial_status = 'active' THEN now() ELSE NULL END
  ) RETURNING * INTO saved_attempt;

  INSERT INTO public.formation_strict_setups (
    attempt_id, user_id, main_promise, personal_covenant_accepted,
    environment_prepared, privacy_safety_acknowledged
  ) VALUES (
    saved_attempt.id, current_user_id, trim(p_main_promise), true, true, true
  );

  INSERT INTO public.formation_days (
    attempt_id, user_id, day_number, local_date, formation_season,
    timezone_used, utc_open_at, utc_close_at, status, rules_version, opened_at
  )
  SELECT
    saved_attempt.id,
    current_user_id,
    offset_value + 1,
    p_start_local_date + offset_value,
    CASE
      WHEN offset_value + 1 <= 25 THEN 'be_with_jesus'
      WHEN offset_value + 1 <= 50 THEN 'become_like_jesus'
      ELSE 'do_what_jesus_did'
    END,
    p_timezone,
    ((p_start_local_date + offset_value)::timestamp AT TIME ZONE p_timezone),
    ((p_start_local_date + offset_value + 1)::timestamp AT TIME ZONE p_timezone),
    CASE WHEN offset_value = 0 AND initial_status = 'active' THEN 'open' ELSE 'scheduled' END,
    trim(p_rules_version),
    CASE WHEN offset_value = 0 AND initial_status = 'active' THEN now() ELSE NULL END
  FROM generate_series(0, 74) AS offset_value;

  RETURN saved_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.start_fully_charged_sabbath_attempt(
  date, text, text, text, text, boolean, boolean, boolean, boolean, boolean, text, uuid, smallint
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_fully_charged_sabbath_attempt(
  date, text, text, text, text, boolean, boolean, boolean, boolean, boolean, text, uuid, smallint
) TO authenticated;


CREATE OR REPLACE FUNCTION public.save_formation_circuit(
  p_local_date date,
  p_track text,
  p_circuit_type text,
  p_rule_version text,
  p_completion_state text,
  p_completed_action_ids text[],
  p_missing_required_action_ids text[],
  p_payload jsonb,
  p_idempotency_key text,
  p_content_version_id uuid DEFAULT NULL
)
RETURNS public.formation_circuit_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  saved_entry public.formation_circuit_entries;
  strict_attempt public.formation_attempts;
  strict_day public.formation_days;
  rest_day boolean := false;
  required_actions text[];
  allowed_actions text[];
  claimed_completed text[] := COALESCE(p_completed_action_ids, '{}');
  normalized_completed text[] := '{}';
  normalized_missing text[] := COALESCE(p_missing_required_action_ids, '{}');
  normalized_state text := p_completion_state;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_track NOT IN ('read_along', 'charge_40', 'fully_charged_75') THEN RAISE EXCEPTION 'invalid_training_track' USING ERRCODE = '22023'; END IF;
  IF p_circuit_type NOT IN ('awareness', 'perspective', 'habit', 'wellness', 'environment') THEN RAISE EXCEPTION 'invalid_circuit_type' USING ERRCODE = '22023'; END IF;
  IF p_completion_state NOT IN ('not_started', 'in_progress', 'recorded', 'complete') THEN RAISE EXCEPTION 'invalid_completion_state' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'invalid_payload' USING ERRCODE = '22023'; END IF;
  IF p_content_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.formation_content_versions
    WHERE id = p_content_version_id AND publication_status = 'published' AND effective_date <= p_local_date
  ) THEN RAISE EXCEPTION 'published_content_version_required' USING ERRCODE = '22023'; END IF;

  IF p_track = 'fully_charged_75' THEN
    SELECT * INTO strict_attempt
    FROM public.formation_attempts
    WHERE user_id = current_user_id AND track = 'fully_charged_75' AND status = 'active'
    FOR UPDATE;
    IF strict_attempt.id IS NULL THEN
      RAISE EXCEPTION 'active_fully_charged_attempt_required' USING ERRCODE = '22023';
    END IF;
    IF strict_attempt.rules_version <> p_rule_version THEN
      RAISE EXCEPTION 'attempt_rules_version_mismatch' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO strict_day
    FROM public.formation_days
    WHERE attempt_id = strict_attempt.id
      AND day_number = strict_attempt.current_day_number
      AND local_date = p_local_date
    FOR UPDATE;
    IF strict_day.id IS NULL OR now() < strict_day.utc_open_at OR now() >= strict_day.utc_close_at
       OR strict_day.status NOT IN ('scheduled', 'open') THEN
      RAISE EXCEPTION 'formation_day_not_open' USING ERRCODE = '22023';
    END IF;
    IF p_content_version_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.formation_content_versions AS version
      JOIN public.formation_content_items AS item
        ON item.current_published_version_id = version.id
      WHERE version.id = p_content_version_id
        AND version.formation_track = 'fully_charged_75'
        AND version.day_start = strict_day.day_number
        AND version.day_end = strict_day.day_number
        AND version.publication_status = 'published'
        AND version.theological_review_status = 'approved'
    ) THEN
      RAISE EXCEPTION 'current_reviewed_day_content_required' USING ERRCODE = '22023';
    END IF;

    rest_day := strict_attempt.rules_version = 'v2_sabbath'
      AND strict_attempt.rest_weekday = extract(dow FROM strict_day.local_date)::smallint;
    required_actions := CASE p_circuit_type
      WHEN 'awareness' THEN ARRAY['scripture_opened', 'reading_completed', 'honest_truth_saved']::text[]
      WHEN 'perspective' THEN ARRAY['prayer_practiced', 'gratitude_recorded', 'control_release_move_recorded', 'smaller_faithful_action']::text[]
      WHEN 'habit' THEN ARRAY['main_promise_named', 'main_promise_completed']::text[]
      WHEN 'wellness' THEN CASE WHEN rest_day THEN ARRAY['nutrition_covenant_honored', 'hydration_covenant_honored', 'rest_or_walk']::text[] ELSE ARRAY['nutrition_covenant_honored', 'hydration_covenant_honored', 'movement_block_one', 'movement_block_two', 'outdoor_movement']::text[] END
      ELSE ARRAY['friction_removed', 'tomorrow_prepared', 'service_completed']::text[]
    END;
    allowed_actions := CASE p_circuit_type
      WHEN 'awareness' THEN ARRAY['scripture_opened', 'reading_completed', 'honest_truth_saved', 'witness_objective_completed']::text[]
      WHEN 'perspective' THEN ARRAY['prayer_practiced', 'gratitude_recorded', 'control_release_move_recorded', 'ego_signal_responded', 'smaller_faithful_action']::text[]
      WHEN 'habit' THEN ARRAY['main_promise_named', 'main_promise_completed', 'recovery_reflection_recorded']::text[]
      WHEN 'wellness' THEN ARRAY['nutrition_covenant_honored', 'hydration_covenant_honored', 'movement_block_one', 'movement_block_two', 'outdoor_movement', 'sleep_preparation', 'adapted_movement']::text[]
      ELSE ARRAY['friction_removed', 'tomorrow_prepared', 'service_completed']::text[]
    END;
    IF rest_day AND p_circuit_type = 'wellness' THEN allowed_actions := allowed_actions || ARRAY['rest_or_walk']; END IF;
    IF p_payload ? 'actions' AND jsonb_typeof(p_payload -> 'actions') <> 'object' THEN
      RAISE EXCEPTION 'strict_actions_payload_must_be_object' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(claimed_completed) AS completed(completed_action)
      WHERE NOT (completed_action = ANY(allowed_actions))
    ) OR cardinality(claimed_completed) <> (
      SELECT count(DISTINCT completed_action)
      FROM unnest(claimed_completed) AS completed(completed_action)
    ) THEN
      RAISE EXCEPTION 'invalid_or_duplicate_strict_action_id' USING ERRCODE = '22023';
    END IF;

    -- Strict completion is derived from the persisted payload, not awarded from
    -- a client-provided state or action list. Boolean actions are attestations;
    -- text/movement-derived actions must also have their underlying facts.
    normalized_completed := ARRAY(
      SELECT DISTINCT derived.action_id
      FROM (
        SELECT allowed.action_id
        FROM unnest(allowed_actions) AS allowed(action_id)
        WHERE p_payload #> ARRAY['actions', allowed.action_id] = 'true'::jsonb
          AND allowed.action_id <> 'rest_or_walk'
        UNION ALL SELECT 'rest_or_walk' WHERE rest_day AND p_circuit_type = 'wellness'
          AND p_payload #>> '{actions,rest_or_walk}' = 'true'
          AND length(trim(COALESCE(p_payload #>> '{fields,restOrWalk}', ''))) BETWEEN 1 AND 500
        UNION ALL SELECT 'honest_truth_saved' WHERE p_circuit_type = 'awareness' AND length(trim(COALESCE(p_payload #>> '{fields,honestTruth}', ''))) > 0
        UNION ALL SELECT 'gratitude_recorded' WHERE p_circuit_type = 'perspective' AND length(trim(COALESCE(p_payload #>> '{fields,gratitude}', ''))) > 0
        UNION ALL SELECT 'control_release_move_recorded' WHERE p_circuit_type = 'perspective'
          AND length(trim(COALESCE(p_payload #>> '{fields,control}', ''))) > 0
          AND length(trim(COALESCE(p_payload #>> '{fields,release}', ''))) > 0
          AND length(trim(COALESCE(p_payload #>> '{fields,move}', ''))) > 0
        UNION ALL SELECT 'ego_signal_responded' WHERE p_circuit_type = 'perspective' AND length(trim(COALESCE(p_payload #>> '{fields,egoResponse}', ''))) > 0
        UNION ALL SELECT 'smaller_faithful_action' WHERE p_circuit_type = 'perspective' AND length(trim(COALESCE(p_payload #>> '{fields,faithfulAction}', ''))) > 0
        UNION ALL SELECT 'main_promise_named' WHERE p_circuit_type = 'habit' AND length(trim(COALESCE(p_payload #>> '{fields,mainPromise}', ''))) > 0
        UNION ALL SELECT 'recovery_reflection_recorded' WHERE p_circuit_type = 'habit' AND length(trim(COALESCE(p_payload #>> '{fields,recoveryReflection}', ''))) > 0
        UNION ALL SELECT 'movement_block_one' WHERE p_circuit_type = 'wellness'
          AND p_payload #>> '{movement,one,completed}' = 'true'
          AND length(trim(COALESCE(p_payload #>> '{movement,one,description}', ''))) > 0
        UNION ALL SELECT 'movement_block_two' WHERE p_circuit_type = 'wellness'
          AND p_payload #>> '{movement,two,completed}' = 'true'
          AND length(trim(COALESCE(p_payload #>> '{movement,two,description}', ''))) > 0
        UNION ALL SELECT 'outdoor_movement' WHERE p_circuit_type = 'wellness' AND (
          (p_payload #>> '{movement,one,completed}' = 'true' AND p_payload #>> '{movement,one,outdoors}' = 'true')
          OR (p_payload #>> '{movement,two,completed}' = 'true' AND p_payload #>> '{movement,two,outdoors}' = 'true')
          OR p_payload #>> '{movement,one,adaptation}' = 'indoor_safety_alternative'
          OR p_payload #>> '{movement,two,adaptation}' = 'indoor_safety_alternative'
        )
        UNION ALL SELECT 'adapted_movement' WHERE p_circuit_type = 'wellness' AND (
          COALESCE(p_payload #>> '{movement,one,adaptation}', 'standard') <> 'standard'
          OR COALESCE(p_payload #>> '{movement,two,adaptation}', 'standard') <> 'standard'
        )
        UNION ALL SELECT 'friction_removed' WHERE p_circuit_type = 'environment' AND length(trim(COALESCE(p_payload #>> '{fields,frictionRemoved}', ''))) > 0
        UNION ALL SELECT 'tomorrow_prepared' WHERE p_circuit_type = 'environment' AND length(trim(COALESCE(p_payload #>> '{fields,tomorrowPrepared}', ''))) > 0
      ) AS derived(action_id)
      ORDER BY derived.action_id
    );
    IF cardinality(normalized_completed) <> cardinality(claimed_completed)
       OR EXISTS (
         SELECT 1 FROM unnest(claimed_completed) AS claimed(action_id)
         WHERE NOT (claimed.action_id = ANY(normalized_completed))
       ) THEN
      RAISE EXCEPTION 'strict_action_claim_does_not_match_payload' USING ERRCODE = '22023';
    END IF;
    normalized_missing := ARRAY(
      SELECT required_action FROM unnest(required_actions) AS required_action
      WHERE NOT (required_action = ANY(normalized_completed))
    );
    normalized_state := CASE
      WHEN cardinality(normalized_missing) = 0 THEN 'complete'
      WHEN cardinality(normalized_completed) > 0 OR COALESCE(p_payload, '{}'::jsonb) <> '{}'::jsonb THEN 'in_progress'
      ELSE 'not_started'
    END;

    UPDATE public.formation_days
    SET status = 'open', opened_at = COALESCE(opened_at, now()), updated_at = now()
    WHERE id = strict_day.id AND status = 'scheduled';
  END IF;

  INSERT INTO public.formation_circuit_entries (
    user_id, local_date, track, circuit_type, rule_version, completion_state,
    completed_action_ids, missing_required_action_ids, payload, idempotency_key,
    content_version_id, attempt_id, formation_day_id, day_number, completed_at
  ) VALUES (
    current_user_id, p_local_date, p_track, p_circuit_type, p_rule_version, normalized_state,
    normalized_completed, normalized_missing, COALESCE(p_payload, '{}'::jsonb), p_idempotency_key,
    p_content_version_id, strict_attempt.id, strict_day.id, strict_day.day_number,
    CASE WHEN normalized_state IN ('recorded', 'complete') THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, local_date, track, circuit_type)
  DO UPDATE SET
    rule_version = EXCLUDED.rule_version,
    completion_state = EXCLUDED.completion_state,
    completed_action_ids = EXCLUDED.completed_action_ids,
    missing_required_action_ids = EXCLUDED.missing_required_action_ids,
    payload = EXCLUDED.payload,
    idempotency_key = EXCLUDED.idempotency_key,
    content_version_id = COALESCE(formation_circuit_entries.content_version_id, EXCLUDED.content_version_id),
    attempt_id = COALESCE(formation_circuit_entries.attempt_id, EXCLUDED.attempt_id),
    formation_day_id = COALESCE(formation_circuit_entries.formation_day_id, EXCLUDED.formation_day_id),
    day_number = COALESCE(formation_circuit_entries.day_number, EXCLUDED.day_number),
    completed_at = CASE WHEN EXCLUDED.completion_state IN ('recorded', 'complete') THEN COALESCE(formation_circuit_entries.completed_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE formation_circuit_entries.attempt_id IS NOT DISTINCT FROM EXCLUDED.attempt_id
  RETURNING * INTO saved_entry;

  IF saved_entry.id IS NULL THEN
    RAISE EXCEPTION 'circuit_entry_belongs_to_another_attempt' USING ERRCODE = '23505';
  END IF;
  RETURN saved_entry;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_fully_charged_today()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  target_attempt public.formation_attempts;
  target_day public.formation_days;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;

  SELECT * INTO target_attempt
  FROM public.formation_attempts
  WHERE user_id = current_user_id AND track = 'fully_charged_75'
  ORDER BY sequence_number DESC
  LIMIT 1
  FOR UPDATE;

  IF target_attempt.id IS NULL THEN RETURN NULL; END IF;

  IF target_attempt.status = 'scheduled'
     AND now() >= ((target_attempt.planned_start_local_date)::timestamp AT TIME ZONE target_attempt.start_timezone) THEN
    UPDATE public.formation_attempts
    SET status = 'active', started_at = COALESCE(started_at, now()), updated_at = now()
    WHERE id = target_attempt.id
    RETURNING * INTO target_attempt;
  END IF;

  IF target_attempt.current_day_number IS NOT NULL THEN
    SELECT * INTO target_day
    FROM public.formation_days
    WHERE attempt_id = target_attempt.id AND day_number = target_attempt.current_day_number
    FOR UPDATE;
    IF target_day.id IS NOT NULL AND target_attempt.status = 'active'
       AND now() >= target_day.utc_close_at
       AND target_day.status IN ('scheduled', 'open') THEN
      UPDATE public.formation_days
      SET status = 'incomplete', incomplete_at = now(),
          closeout_idempotency_key = 'read-reconcile:' || target_attempt.id::text || ':day:' || target_day.day_number::text,
          closeout_summary = jsonb_build_object(
            'attemptId', target_attempt.id,
            'attemptStatus', 'ended',
            'dayNumber', target_day.day_number,
            'dayStatus', 'incomplete',
            'missingRequirements', ARRAY['server_confirmed_closeout'],
            'completedDays', target_attempt.completed_day_count
          ),
          updated_at = now()
      WHERE id = target_day.id;
      UPDATE public.formation_attempts
      SET status = 'ended', current_day_number = NULL, end_reason_code = 'incomplete_day', ended_at = now(),
          aggregate_version = aggregate_version + 1, updated_at = now()
      WHERE id = target_attempt.id
      RETURNING * INTO target_attempt;
      target_day.status := 'incomplete';
      target_day.incomplete_at := now();
    END IF;
    IF target_day.id IS NOT NULL AND target_attempt.status = 'active'
       AND now() >= target_day.utc_open_at AND now() < target_day.utc_close_at
       AND target_day.status = 'scheduled' THEN
      UPDATE public.formation_days
      SET status = 'open', opened_at = COALESCE(opened_at, now()), updated_at = now()
      WHERE id = target_day.id
      RETURNING * INTO target_day;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'attemptId', target_attempt.id,
    'sequenceNumber', target_attempt.sequence_number,
    'attemptStatus', target_attempt.status,
    'rulesVersion', target_attempt.rules_version,
    'restWeekday', target_attempt.rest_weekday,
    'isRestDay', COALESCE(target_attempt.rules_version = 'v2_sabbath' AND target_attempt.rest_weekday = extract(dow FROM target_day.local_date)::smallint, false),
    'contentBundleVersion', target_attempt.content_bundle_version,
    'startLocalDate', target_attempt.planned_start_local_date,
    'startTimezone', target_attempt.start_timezone,
    'completedDays', target_attempt.completed_day_count,
    'dayNumber', target_day.day_number,
    'localDate', target_day.local_date,
    'season', target_day.formation_season,
    'dayStatus', target_day.status,
    'opensAt', target_day.utc_open_at,
    'closesAt', target_day.utc_close_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_fully_charged_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fully_charged_today() TO authenticated;


-- close_fully_charged_day is intentionally unchanged: all five saved circuits, ownership, idempotency and boundaries remain mandatory.
