-- Daily Christian formation circuit records and private proof assets.
-- This migration is additive and does not convert or modify legacy daily_rings/proof data.

CREATE TABLE public.formation_circuit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  track text NOT NULL CHECK (track IN ('read_along', 'charge_40', 'fully_charged_75')),
  circuit_type text NOT NULL CHECK (circuit_type IN ('awareness', 'perspective', 'habit', 'wellness', 'environment')),
  rule_version text NOT NULL,
  completion_state text NOT NULL CHECK (completion_state IN ('not_started', 'in_progress', 'recorded', 'complete')),
  completed_action_ids text[] NOT NULL DEFAULT '{}',
  missing_required_action_ids text[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key text NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date, track, circuit_type),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX formation_circuit_entries_user_history_idx
  ON public.formation_circuit_entries (user_id, track, local_date DESC, updated_at DESC);

ALTER TABLE public.formation_circuit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formation circuit owners can read their entries"
  ON public.formation_circuit_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.formation_circuit_entries FROM authenticated, anon;
GRANT SELECT ON public.formation_circuit_entries TO authenticated;

CREATE TABLE public.formation_proof_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  track text NOT NULL CHECK (track IN ('read_along', 'charge_40', 'fully_charged_75')),
  circuit_type text NOT NULL CHECK (circuit_type = 'habit'),
  storage_path text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type = 'image/jpeg'),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility = 'private'),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (user_id, storage_path)
);

CREATE INDEX formation_proof_assets_user_date_idx
  ON public.formation_proof_assets (user_id, local_date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.formation_proof_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formation proof owners can read their assets"
  ON public.formation_proof_assets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Formation proof owners can insert their assets"
  ON public.formation_proof_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND visibility = 'private'
    AND split_part(storage_path, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Formation proof owners can update their assets"
  ON public.formation_proof_assets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND visibility = 'private'
    AND split_part(storage_path, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Formation proof owners can delete their assets"
  ON public.formation_proof_assets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Formation proof owners can upload private objects"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'formation-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Formation proof owners can read private objects"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'formation-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Formation proof owners can update private objects"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'formation-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'formation-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Formation proof owners can delete private objects"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'formation-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION public.save_formation_circuit(
  p_local_date date,
  p_track text,
  p_circuit_type text,
  p_rule_version text,
  p_completion_state text,
  p_completed_action_ids text[],
  p_missing_required_action_ids text[],
  p_payload jsonb,
  p_idempotency_key text
)
RETURNS public.formation_circuit_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  saved_entry public.formation_circuit_entries;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF p_track NOT IN ('read_along', 'charge_40', 'fully_charged_75') THEN
    RAISE EXCEPTION 'invalid_training_track' USING ERRCODE = '22023';
  END IF;

  IF p_circuit_type NOT IN ('awareness', 'perspective', 'habit', 'wellness', 'environment') THEN
    RAISE EXCEPTION 'invalid_circuit_type' USING ERRCODE = '22023';
  END IF;

  IF p_completion_state NOT IN ('not_started', 'in_progress', 'recorded', 'complete') THEN
    RAISE EXCEPTION 'invalid_completion_state' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'invalid_payload' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.formation_circuit_entries (
    user_id,
    local_date,
    track,
    circuit_type,
    rule_version,
    completion_state,
    completed_action_ids,
    missing_required_action_ids,
    payload,
    idempotency_key,
    completed_at
  )
  VALUES (
    current_user_id,
    p_local_date,
    p_track,
    p_circuit_type,
    p_rule_version,
    p_completion_state,
    COALESCE(p_completed_action_ids, '{}'),
    COALESCE(p_missing_required_action_ids, '{}'),
    COALESCE(p_payload, '{}'::jsonb),
    p_idempotency_key,
    CASE WHEN p_completion_state IN ('recorded', 'complete') THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, local_date, track, circuit_type)
  DO UPDATE SET
    rule_version = EXCLUDED.rule_version,
    completion_state = EXCLUDED.completion_state,
    completed_action_ids = EXCLUDED.completed_action_ids,
    missing_required_action_ids = EXCLUDED.missing_required_action_ids,
    payload = EXCLUDED.payload,
    idempotency_key = EXCLUDED.idempotency_key,
    completed_at = CASE
      WHEN EXCLUDED.completion_state IN ('recorded', 'complete')
        THEN COALESCE(formation_circuit_entries.completed_at, now())
      ELSE NULL
    END,
    updated_at = now()
  RETURNING * INTO saved_entry;

  RETURN saved_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.save_formation_circuit(date, text, text, text, text, text[], text[], jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_formation_circuit(date, text, text, text, text, text[], text[], jsonb, text)
  TO authenticated;

COMMENT ON TABLE public.formation_circuit_entries IS
  'Owner-private, track-aware daily circuit state. Strict attempt authority is introduced by the separate journey engine.';

COMMENT ON TABLE public.formation_proof_assets IS
  'Metadata for private, sanitized Habit proof stored in the non-public formation-proof bucket.';