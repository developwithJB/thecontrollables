-- Immutable journey completion summaries with separately stored private reflections.
-- Authoritative journey engines insert completion records with service-role or future
-- server-owned closeout functions. Ordinary clients can only read their own record
-- and save the private reflection through the constrained RPC below.

CREATE TABLE public.formation_completion_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('read_along', 'charge_40', 'fully_charged_75')),
  completion_key text NOT NULL,
  rule_version text NOT NULL,
  content_version text NOT NULL,
  started_on date,
  completed_on date NOT NULL,
  counts jsonb NOT NULL CHECK (jsonb_typeof(counts) = 'object'),
  source_journey_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, completion_key)
);

CREATE INDEX formation_completion_records_owner_history_idx
  ON public.formation_completion_records (user_id, completed_on DESC, created_at DESC);

ALTER TABLE public.formation_completion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Completion record owners can read"
  ON public.formation_completion_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.formation_completion_records FROM authenticated, anon;
GRANT SELECT ON public.formation_completion_records TO authenticated;

CREATE TABLE public.formation_completion_reflections (
  completion_record_id uuid PRIMARY KEY REFERENCES public.formation_completion_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  next_step text CHECK (
    next_step IS NULL OR next_step IN (
      'daily_rhythm',
      'reread',
      'small_group',
      'formation_season',
      'new_attempt',
      'witness',
      'planned_recovery'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formation_completion_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Completion reflection owners can read"
  ON public.formation_completion_reflections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.formation_completion_reflections FROM authenticated, anon;
GRANT SELECT ON public.formation_completion_reflections TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_formation_completion_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'formation_completion_records_are_immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER formation_completion_records_immutable
BEFORE UPDATE OR DELETE ON public.formation_completion_records
FOR EACH ROW EXECUTE FUNCTION public.prevent_formation_completion_record_mutation();

CREATE OR REPLACE FUNCTION public.save_formation_completion_reflection(
  p_completion_record_id uuid,
  p_answers jsonb,
  p_next_step text DEFAULT NULL
)
RETURNS public.formation_completion_reflections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  answer_key text;
  answer_value text;
  saved_reflection public.formation_completion_reflections;
  allowed_keys constant text[] := ARRAY[
    'relationshipWithJesus',
    'strongerControllable',
    'stillBeingFormed',
    'promiseLesson',
    'recoveryLesson',
    'serviceNext',
    'carryForward'
  ];
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.formation_completion_records
    WHERE id = p_completion_record_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'completion_record_not_owned' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(COALESCE(p_answers, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'invalid_reflection_answers' USING ERRCODE = '22023';
  END IF;

  FOR answer_key, answer_value IN
    SELECT key, value #>> '{}'
    FROM jsonb_each(COALESCE(p_answers, '{}'::jsonb))
  LOOP
    IF NOT (answer_key = ANY(allowed_keys)) THEN
      RAISE EXCEPTION 'unsupported_reflection_field' USING ERRCODE = '22023';
    END IF;
    IF length(COALESCE(answer_value, '')) > 4000 THEN
      RAISE EXCEPTION 'reflection_answer_too_long' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_next_step IS NOT NULL AND p_next_step NOT IN (
    'daily_rhythm',
    'reread',
    'small_group',
    'formation_season',
    'new_attempt',
    'witness',
    'planned_recovery'
  ) THEN
    RAISE EXCEPTION 'invalid_next_step' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.formation_completion_reflections (
    completion_record_id,
    user_id,
    answers,
    next_step
  ) VALUES (
    p_completion_record_id,
    current_user_id,
    COALESCE(p_answers, '{}'::jsonb),
    p_next_step
  )
  ON CONFLICT (completion_record_id)
  DO UPDATE SET
    answers = EXCLUDED.answers,
    next_step = EXCLUDED.next_step,
    updated_at = now()
  WHERE formation_completion_reflections.user_id = current_user_id
  RETURNING * INTO saved_reflection;

  RETURN saved_reflection;
END;
$$;

REVOKE ALL ON FUNCTION public.save_formation_completion_reflection(uuid, jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_formation_completion_reflection(uuid, jsonb, text)
  TO authenticated;

COMMENT ON TABLE public.formation_completion_records IS
  'Immutable, count-only formation completion snapshots. Private content belongs in separate owner-private tables.';

COMMENT ON TABLE public.formation_completion_reflections IS
  'Owner-private closing reflection. Never eligible for analytics or milestone-sharing payloads.';