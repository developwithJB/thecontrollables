-- Authoritative Fully Charged: 75 Days attempt/day lifecycle.
-- The existing formation_circuit_entries table remains the private circuit payload
-- store. Strict rows are now pinned to an immutable attempt and canonical day.

CREATE TABLE public.formation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL DEFAULT 'fully_charged_75' CHECK (track = 'fully_charged_75'),
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  status text NOT NULL CHECK (status IN ('scheduled', 'active', 'ended', 'completed', 'cancelled')),
  rules_version text NOT NULL,
  content_bundle_version text NOT NULL,
  planned_start_local_date date NOT NULL,
  start_timezone text NOT NULL,
  timezone_policy text NOT NULL DEFAULT 'fixed' CHECK (timezone_policy = 'fixed'),
  current_day_number smallint CHECK (current_day_number BETWEEN 1 AND 75),
  completed_day_count smallint NOT NULL DEFAULT 0 CHECK (completed_day_count BETWEEN 0 AND 75),
  previous_attempt_id uuid REFERENCES public.formation_attempts(id) ON DELETE RESTRICT,
  end_reason_code text CHECK (end_reason_code IS NULL OR end_reason_code IN ('incomplete_day', 'user_cancelled', 'health_safety')),
  start_idempotency_key text NOT NULL,
  strict_opt_in_at timestamptz NOT NULL,
  rules_accepted_at timestamptz NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  aggregate_version bigint NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track, sequence_number),
  UNIQUE (user_id, start_idempotency_key),
  CHECK (previous_attempt_id IS NULL OR previous_attempt_id <> id),
  CHECK ((status = 'ended') = (ended_at IS NOT NULL)),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  CHECK (status <> 'completed' OR completed_day_count = 75)
);

CREATE UNIQUE INDEX formation_attempts_one_live_strict_idx
  ON public.formation_attempts (user_id, track)
  WHERE status IN ('scheduled', 'active');

CREATE INDEX formation_attempts_owner_history_idx
  ON public.formation_attempts (user_id, track, sequence_number DESC);

ALTER TABLE public.formation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formation attempt owners can read"
  ON public.formation_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.formation_attempts FROM authenticated, anon;
GRANT SELECT ON public.formation_attempts TO authenticated;

CREATE TABLE public.formation_strict_setups (
  attempt_id uuid PRIMARY KEY REFERENCES public.formation_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  main_promise text NOT NULL CHECK (length(trim(main_promise)) BETWEEN 1 AND 1000),
  personal_covenant_accepted boolean NOT NULL CHECK (personal_covenant_accepted),
  environment_prepared boolean NOT NULL CHECK (environment_prepared),
  privacy_safety_acknowledged boolean NOT NULL CHECK (privacy_safety_acknowledged),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, user_id)
);

ALTER TABLE public.formation_strict_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formation setup owners can read"
  ON public.formation_strict_setups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.formation_strict_setups FROM authenticated, anon;
GRANT SELECT ON public.formation_strict_setups TO authenticated;

CREATE TABLE public.formation_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.formation_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number smallint NOT NULL CHECK (day_number BETWEEN 1 AND 75),
  local_date date NOT NULL,
  formation_season text NOT NULL CHECK (formation_season IN ('be_with_jesus', 'become_like_jesus', 'do_what_jesus_did')),
  timezone_used text NOT NULL,
  utc_open_at timestamptz NOT NULL,
  utc_close_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'complete', 'incomplete')),
  rules_version text NOT NULL,
  closeout_idempotency_key text,
  closeout_summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(closeout_summary) = 'object'),
  opened_at timestamptz,
  closed_at timestamptz,
  incomplete_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, day_number),
  UNIQUE (attempt_id, local_date),
  CHECK (utc_open_at < utc_close_at),
  CHECK ((status = 'complete') = (closed_at IS NOT NULL)),
  CHECK ((status = 'incomplete') = (incomplete_at IS NOT NULL))
);

CREATE INDEX formation_days_owner_calendar_idx
  ON public.formation_days (user_id, local_date DESC, day_number DESC);

ALTER TABLE public.formation_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formation day owners can read"
  ON public.formation_days
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.formation_days FROM authenticated, anon;
GRANT SELECT ON public.formation_days TO authenticated;

ALTER TABLE public.formation_circuit_entries
  ADD COLUMN attempt_id uuid REFERENCES public.formation_attempts(id) ON DELETE RESTRICT,
  ADD COLUMN formation_day_id uuid REFERENCES public.formation_days(id) ON DELETE RESTRICT,
  ADD COLUMN day_number smallint CHECK (day_number IS NULL OR day_number BETWEEN 1 AND 75);

CREATE INDEX formation_circuit_entries_attempt_day_idx
  ON public.formation_circuit_entries (attempt_id, day_number, circuit_type)
  WHERE attempt_id IS NOT NULL;

ALTER TABLE public.formation_completion_records
  ADD CONSTRAINT formation_completion_records_source_journey_fkey
  FOREIGN KEY (source_journey_id)
  REFERENCES public.formation_attempts(id)
  ON DELETE RESTRICT
  NOT VALID;

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

-- Replaces the content-aware circuit RPC from 20260801110000. The signature is
-- unchanged, but strict writes are now attached to the authoritative current day
-- and the server derives strict completion from required action IDs.
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

    required_actions := CASE p_circuit_type
      WHEN 'awareness' THEN ARRAY['scripture_opened', 'reading_completed', 'honest_truth_saved']::text[]
      WHEN 'perspective' THEN ARRAY['prayer_practiced', 'gratitude_recorded', 'control_release_move_recorded', 'smaller_faithful_action']::text[]
      WHEN 'habit' THEN ARRAY['main_promise_named', 'main_promise_completed']::text[]
      WHEN 'wellness' THEN ARRAY['nutrition_covenant_honored', 'hydration_covenant_honored', 'movement_block_one', 'movement_block_two', 'outdoor_movement']::text[]
      ELSE ARRAY['friction_removed', 'tomorrow_prepared', 'service_completed']::text[]
    END;
    allowed_actions := CASE p_circuit_type
      WHEN 'awareness' THEN ARRAY['scripture_opened', 'reading_completed', 'honest_truth_saved', 'witness_objective_completed']::text[]
      WHEN 'perspective' THEN ARRAY['prayer_practiced', 'gratitude_recorded', 'control_release_move_recorded', 'ego_signal_responded', 'smaller_faithful_action']::text[]
      WHEN 'habit' THEN ARRAY['main_promise_named', 'main_promise_completed', 'recovery_reflection_recorded']::text[]
      WHEN 'wellness' THEN ARRAY['nutrition_covenant_honored', 'hydration_covenant_honored', 'movement_block_one', 'movement_block_two', 'outdoor_movement', 'sleep_preparation', 'adapted_movement']::text[]
      ELSE ARRAY['friction_removed', 'tomorrow_prepared', 'service_completed']::text[]
    END;
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

CREATE OR REPLACE FUNCTION public.close_fully_charged_day(
  p_attempt_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  target_attempt public.formation_attempts;
  target_day public.formation_days;
  completed_circuits text[];
  missing_circuits text[];
  result jsonb;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF length(trim(COALESCE(p_idempotency_key, ''))) = 0 THEN RAISE EXCEPTION 'closeout_idempotency_required' USING ERRCODE = '22023'; END IF;

  SELECT * INTO target_attempt
  FROM public.formation_attempts
  WHERE id = p_attempt_id AND user_id = current_user_id AND track = 'fully_charged_75'
  FOR UPDATE;
  IF target_attempt.id IS NULL THEN RAISE EXCEPTION 'fully_charged_attempt_not_owned' USING ERRCODE = '42501'; END IF;

  SELECT * INTO target_day
  FROM public.formation_days
  WHERE attempt_id = target_attempt.id AND day_number = target_attempt.current_day_number
  FOR UPDATE;

  IF target_day.id IS NULL THEN
    IF target_attempt.status IN ('ended', 'completed', 'cancelled') THEN
      RETURN jsonb_build_object(
        'attemptId', target_attempt.id,
        'attemptStatus', target_attempt.status,
        'completedDays', target_attempt.completed_day_count
      );
    END IF;
    RAISE EXCEPTION 'current_formation_day_not_found' USING ERRCODE = '22023';
  END IF;

  IF target_day.closeout_idempotency_key = p_idempotency_key AND target_day.closeout_summary <> '{}'::jsonb THEN
    RETURN target_day.closeout_summary;
  END IF;
  IF target_day.closeout_idempotency_key IS NOT NULL
     AND target_day.closeout_idempotency_key <> p_idempotency_key THEN
    RAISE EXCEPTION 'day_already_closed_with_different_key' USING ERRCODE = '23505';
  END IF;
  IF target_attempt.status <> 'active' THEN
    RETURN jsonb_build_object(
      'attemptId', target_attempt.id,
      'attemptStatus', target_attempt.status,
      'dayNumber', target_day.day_number,
      'dayStatus', target_day.status,
      'completedDays', target_attempt.completed_day_count
    );
  END IF;
  IF now() < target_day.utc_open_at THEN RAISE EXCEPTION 'formation_day_not_open' USING ERRCODE = '22023'; END IF;

  SELECT ARRAY_AGG(circuit_type ORDER BY circuit_type) INTO completed_circuits
  FROM public.formation_circuit_entries
  WHERE attempt_id = target_attempt.id
    AND formation_day_id = target_day.id
    AND completion_state = 'complete';
  completed_circuits := COALESCE(completed_circuits, '{}');

  SELECT ARRAY_AGG(required_circuit ORDER BY required_circuit) INTO missing_circuits
  FROM unnest(ARRAY['awareness', 'perspective', 'habit', 'wellness', 'environment']::text[]) AS required_circuit
  WHERE NOT (required_circuit = ANY(completed_circuits));
  missing_circuits := COALESCE(missing_circuits, '{}');

  -- V1 has no late-sync grace window. A day that reaches its fixed-timezone
  -- boundary without an explicit server-confirmed closeout ends the attempt,
  -- even when five circuit drafts were marked complete. This is intentionally
  -- centralized here until an approved offline policy replaces it.
  IF now() >= target_day.utc_close_at THEN
    result := jsonb_build_object(
      'attemptId', target_attempt.id,
      'attemptStatus', 'ended',
      'dayNumber', target_day.day_number,
      'dayStatus', 'incomplete',
      'completedCircuits', completed_circuits,
      'missingCircuits', missing_circuits,
      'missingRequirements', ARRAY['server_confirmed_closeout'],
      'completedDays', target_attempt.completed_day_count
    );
    UPDATE public.formation_days
    SET status = 'incomplete', incomplete_at = now(), closeout_idempotency_key = p_idempotency_key,
        closeout_summary = result, updated_at = now()
    WHERE id = target_day.id;
    UPDATE public.formation_attempts
    SET status = 'ended', current_day_number = NULL, end_reason_code = 'incomplete_day', ended_at = now(),
        aggregate_version = aggregate_version + 1, updated_at = now()
    WHERE id = target_attempt.id;
    RETURN result;
  END IF;

  IF cardinality(missing_circuits) > 0 THEN
    RETURN jsonb_build_object(
      'attemptId', target_attempt.id,
      'attemptStatus', 'active',
      'dayNumber', target_day.day_number,
      'dayStatus', 'open',
      'completedCircuits', completed_circuits,
      'missingCircuits', missing_circuits,
      'completedDays', target_attempt.completed_day_count
    );
  END IF;

  IF target_day.day_number = 75 THEN
    result := jsonb_build_object(
      'attemptId', target_attempt.id,
      'attemptStatus', 'completed',
      'dayNumber', 75,
      'dayStatus', 'complete',
      'completedCircuits', completed_circuits,
      'missingCircuits', '[]'::jsonb,
      'completedDays', 75,
      'completionEligible', true
    );
    UPDATE public.formation_days
    SET status = 'complete', closed_at = now(), closeout_idempotency_key = p_idempotency_key,
        closeout_summary = result, updated_at = now()
    WHERE id = target_day.id;
    UPDATE public.formation_attempts
    SET status = 'completed', current_day_number = NULL, completed_day_count = 75, completed_at = now(),
        aggregate_version = aggregate_version + 1, updated_at = now()
    WHERE id = target_attempt.id;
    INSERT INTO public.formation_completion_records (
      user_id, track, completion_key, rule_version, content_version,
      started_on, completed_on, counts, source_journey_id, content_version_ids
    ) VALUES (
      current_user_id, 'fully_charged_75', 'fully-charged-attempt:' || target_attempt.id::text,
      target_attempt.rules_version, target_attempt.content_bundle_version,
      target_attempt.planned_start_local_date, target_day.local_date,
      jsonb_build_object(
        'datesPracticed', 75,
        'controllableReps', 375,
        'scriptureProgress', 75,
        'witnessProgress', (
          SELECT count(*) FROM public.formation_circuit_entries AS entry
          WHERE entry.attempt_id = target_attempt.id
            AND entry.completed_action_ids @> ARRAY['witness_objective_completed']::text[]
        ),
        'promisesKept', 75,
        'recoveryDecisions', (
          SELECT count(*) FROM public.formation_circuit_entries AS entry
          WHERE entry.attempt_id = target_attempt.id
            AND entry.completed_action_ids @> ARRAY['recovery_reflection_recorded']::text[]
        ),
        'serviceReps', 75,
        'privateProofCount', (
          SELECT count(*) FROM public.formation_circuit_entries AS entry
          WHERE entry.attempt_id = target_attempt.id
            AND entry.payload -> 'proof' IS NOT NULL
            AND entry.payload -> 'proof' <> 'null'::jsonb
        ),
        'formationSeasonsCompleted', 3,
        'adaptedMovementDays', (
          SELECT count(DISTINCT entry.day_number) FROM public.formation_circuit_entries AS entry
          WHERE entry.attempt_id = target_attempt.id
            AND entry.completed_action_ids @> ARRAY['adapted_movement']::text[]
        )
      ),
      target_attempt.id,
      ARRAY(
        SELECT DISTINCT entry.content_version_id
        FROM public.formation_circuit_entries AS entry
        WHERE entry.attempt_id = target_attempt.id AND entry.content_version_id IS NOT NULL
        ORDER BY entry.content_version_id
      )
    ) ON CONFLICT (user_id, completion_key) DO NOTHING;
    RETURN result;
  END IF;

  result := jsonb_build_object(
    'attemptId', target_attempt.id,
    'attemptStatus', 'active',
    'dayNumber', target_day.day_number,
    'dayStatus', 'complete',
    'completedCircuits', completed_circuits,
    'missingCircuits', '[]'::jsonb,
    'completedDays', target_attempt.completed_day_count + 1,
    'nextDayNumber', target_day.day_number + 1
  );
  UPDATE public.formation_days
  SET status = 'complete', closed_at = now(), closeout_idempotency_key = p_idempotency_key,
      closeout_summary = result, updated_at = now()
  WHERE id = target_day.id;
  UPDATE public.formation_attempts
  SET current_day_number = target_day.day_number + 1,
      completed_day_count = completed_day_count + 1,
      aggregate_version = aggregate_version + 1,
      updated_at = now()
  WHERE id = target_attempt.id;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.close_fully_charged_day(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_fully_charged_day(uuid, text) TO authenticated;

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

-- Returns only the current reviewed assignment for the caller's canonical open
-- day. This avoids using the database server's UTC `current_date` as the
-- publication boundary for users whose pinned local date is already tomorrow.
CREATE OR REPLACE FUNCTION public.get_current_fully_charged_content()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  content_result jsonb;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;

  SELECT jsonb_build_object(
    'id', version.id,
    'dayNumber', day.day_number,
    'title', version.title,
    'body', version.body,
    'scriptureReference', version.scripture_reference
  ) INTO content_result
  FROM public.formation_attempts AS attempt
  JOIN public.formation_days AS day
    ON day.attempt_id = attempt.id AND day.day_number = attempt.current_day_number
  JOIN public.formation_content_versions AS version
    ON version.formation_track = 'fully_charged_75'
   AND version.day_start = day.day_number
   AND version.day_end = day.day_number
  JOIN public.formation_content_items AS item
    ON item.current_published_version_id = version.id
  WHERE attempt.user_id = current_user_id
    AND attempt.status = 'active'
    AND day.status = 'open'
    AND now() >= day.utc_open_at
    AND now() < day.utc_close_at
    AND version.publication_status = 'published'
    AND version.theological_review_status = 'approved'
    AND version.reviewer_user_id IS NOT NULL
    AND version.reviewer_user_id IS DISTINCT FROM version.author_user_id
    AND version.effective_date <= day.local_date
  LIMIT 1;

  RETURN content_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_fully_charged_content() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_fully_charged_content() TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_fully_charged_attempt(
  p_attempt_id uuid,
  p_reason_code text DEFAULT 'user_cancelled'
)
RETURNS public.formation_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_attempt public.formation_attempts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_reason_code NOT IN ('user_cancelled', 'health_safety') THEN RAISE EXCEPTION 'invalid_cancel_reason' USING ERRCODE = '22023'; END IF;
  UPDATE public.formation_attempts
  SET status = 'cancelled', current_day_number = NULL, end_reason_code = p_reason_code,
      cancelled_at = now(), aggregate_version = aggregate_version + 1, updated_at = now()
  WHERE id = p_attempt_id AND user_id = auth.uid() AND status IN ('scheduled', 'active')
  RETURNING * INTO saved_attempt;
  IF saved_attempt.id IS NULL THEN RAISE EXCEPTION 'cancellable_attempt_not_owned' USING ERRCODE = '42501'; END IF;
  RETURN saved_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_fully_charged_attempt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_fully_charged_attempt(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_overdue_fully_charged_attempts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  overdue_record record;
  ended_count integer := 0;
  result jsonb;
  completed_circuits text[];
  missing_circuits text[];
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  FOR overdue_record IN
    SELECT
      attempt.id AS attempt_id,
      attempt.user_id,
      attempt.completed_day_count,
      day.id AS day_id,
      day.day_number
    FROM public.formation_attempts AS attempt
    JOIN public.formation_days AS day
      ON day.attempt_id = attempt.id AND day.day_number = attempt.current_day_number
    WHERE attempt.status = 'active'
      AND day.status IN ('scheduled', 'open')
      AND day.utc_close_at <= now()
    ORDER BY day.utc_close_at
    FOR UPDATE OF attempt, day SKIP LOCKED
  LOOP
    SELECT ARRAY_AGG(circuit_type ORDER BY circuit_type) INTO completed_circuits
    FROM public.formation_circuit_entries
    WHERE attempt_id = overdue_record.attempt_id
      AND formation_day_id = overdue_record.day_id
      AND completion_state = 'complete';
    completed_circuits := COALESCE(completed_circuits, '{}');

    SELECT ARRAY_AGG(required_circuit ORDER BY required_circuit) INTO missing_circuits
    FROM unnest(ARRAY['awareness', 'perspective', 'habit', 'wellness', 'environment']::text[]) AS required_circuit
    WHERE NOT (required_circuit = ANY(completed_circuits));
    missing_circuits := COALESCE(missing_circuits, '{}');

    result := jsonb_build_object(
      'attemptId', overdue_record.attempt_id,
      'attemptStatus', 'ended',
      'dayNumber', overdue_record.day_number,
      'dayStatus', 'incomplete',
      'completedCircuits', completed_circuits,
      'missingCircuits', missing_circuits,
      'missingRequirements', ARRAY['server_confirmed_closeout'],
      'completedDays', overdue_record.completed_day_count
    );

    UPDATE public.formation_days
    SET status = 'incomplete', incomplete_at = now(),
        closeout_idempotency_key = 'scheduler:' || overdue_record.attempt_id::text || ':day:' || overdue_record.day_number::text,
        closeout_summary = result, updated_at = now()
    WHERE id = overdue_record.day_id;

    UPDATE public.formation_attempts
    SET status = 'ended', current_day_number = NULL, end_reason_code = 'incomplete_day', ended_at = now(),
        aggregate_version = aggregate_version + 1, updated_at = now()
    WHERE id = overdue_record.attempt_id AND status = 'active';

    ended_count := ended_count + 1;
  END LOOP;

  RETURN ended_count;
END;
$$;

REVOKE ALL ON FUNCTION public.end_overdue_fully_charged_attempts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_overdue_fully_charged_attempts() TO service_role;

COMMENT ON TABLE public.formation_attempts IS
  'Server-owned strict attempt aggregate. Terminal attempts never become active again.';
COMMENT ON TABLE public.formation_days IS
  'Canonical consecutive day rows pinned to the attempt start timezone; local days use calendar boundaries, including DST.';
COMMENT ON TABLE public.formation_strict_setups IS
  'Owner-private strict readiness record. Main Promise text is excluded from progress projections and analytics.';