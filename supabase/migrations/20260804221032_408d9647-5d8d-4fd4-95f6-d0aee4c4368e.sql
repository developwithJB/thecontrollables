-- Versioned, review-gated formation content operating system.

CREATE TABLE public.formation_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_id text NOT NULL UNIQUE CHECK (stable_id ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  content_type text NOT NULL CHECK (content_type IN (
    'daily_scripture_assignment',
    'formation_season_introduction',
    'circuit_practice',
    'book_chapter_practice',
    'read_along_prompt',
    'control_release_move_prompt',
    'ego_signal',
    'recovery_prompt',
    'service_mission',
    'weekly_review',
    'witness_act',
    'witness_evidence',
    'gospel_comparison',
    'historical_context',
    'completion_language',
    'email_guidance'
  )),
  current_published_version_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.formation_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.formation_content_items(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 30000),
  formation_track text NOT NULL DEFAULT 'all' CHECK (formation_track IN ('all', 'read_along', 'charge_40', 'fully_charged_75')),
  day_start smallint CHECK (day_start BETWEEN 1 AND 75),
  day_end smallint CHECK (day_end BETWEEN 1 AND 75),
  formation_season text CHECK (formation_season IS NULL OR formation_season IN ('be_with_jesus', 'become_like_jesus', 'do_what_jesus_did')),
  book_chapter text,
  spoiler_level smallint NOT NULL DEFAULT 0 CHECK (spoiler_level BETWEEN 0 AND 5),
  scripture_reference text,
  bible_translation text,
  evidence_classification text CHECK (evidence_classification IS NULL OR evidence_classification IN (
    'Scripture',
    'Historical Context',
    'Christian Tradition',
    'Scholarly Interpretation',
    'Creative Reconstruction'
  )),
  source_citations text[] NOT NULL DEFAULT '{}',
  author text NOT NULL,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer text,
  reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  theological_review_status text NOT NULL DEFAULT 'pending' CHECK (theological_review_status IN ('not_required', 'pending', 'approved', 'changes_requested')),
  historical_review_status text NOT NULL DEFAULT 'not_required' CHECK (historical_review_status IN ('not_required', 'pending', 'approved', 'changes_requested')),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'in_review', 'published', 'archived')),
  effective_date date,
  last_reviewed_date date,
  ai_assisted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (item_id, version),
  CHECK ((day_start IS NULL AND day_end IS NULL) OR (day_start IS NOT NULL AND day_end IS NOT NULL AND day_start <= day_end)),
  CHECK ((scripture_reference IS NULL AND bible_translation IS NULL) OR (scripture_reference IS NOT NULL AND bible_translation IS NOT NULL)),
  CHECK (evidence_classification <> 'Creative Reconstruction' OR body ~* '^Creative Reconstruction:'),
  CHECK (evidence_classification <> 'Historical Context' OR cardinality(source_citations) > 0)
);

ALTER TABLE public.formation_content_items
  ADD CONSTRAINT formation_content_items_current_version_fkey
  FOREIGN KEY (current_published_version_id)
  REFERENCES public.formation_content_versions(id)
  ON DELETE SET NULL;

CREATE INDEX formation_content_versions_discovery_idx
  ON public.formation_content_versions (publication_status, effective_date, formation_track, day_start, day_end);

CREATE TABLE public.formation_content_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES public.formation_content_versions(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'submitted', 'approved', 'changes_requested', 'published', 'archived', 'imported')),
  theological_review_status text,
  historical_review_status text,
  note text CHECK (note IS NULL OR length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formation_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_content_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published content items are readable"
  ON public.formation_content_items
  FOR SELECT TO authenticated
  USING (current_published_version_id IS NOT NULL OR public.is_admin());

CREATE POLICY "Only published content versions are readable outside admin"
  ON public.formation_content_versions
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      publication_status = 'published'
      AND effective_date IS NOT NULL
      AND effective_date <= current_date
    )
  );

CREATE POLICY "Admins can read content review events"
  ON public.formation_content_review_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.formation_content_items FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.formation_content_versions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.formation_content_review_events FROM authenticated, anon;
GRANT SELECT ON public.formation_content_items, public.formation_content_versions TO authenticated;
GRANT SELECT ON public.formation_content_review_events TO authenticated;

CREATE OR REPLACE FUNCTION public.is_valid_scripture_reference(reference text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT reference ~ '^(?:[1-3][[:space:]]*)?[A-Za-z][A-Za-z ]+[[:space:]]+[0-9]+(?::[0-9]+(?:-[0-9]+)?)?$'
$$;

CREATE OR REPLACE FUNCTION public.save_formation_content_draft(p_payload jsonb)
RETURNS public.formation_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  target_item public.formation_content_items;
  saved_version public.formation_content_versions;
  next_version integer;
  payload_content_type text := p_payload ->> 'contentType';
  payload_stable_id text := p_payload ->> 'stableId';
  payload_classification text := NULLIF(p_payload ->> 'evidenceClassification', '');
  citations text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload -> 'sourceCitations', '[]'::jsonb)));
BEGIN
  IF current_user_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'invalid_content_payload' USING ERRCODE = '22023';
  END IF;
  IF payload_stable_id !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'invalid_stable_id' USING ERRCODE = '22023';
  END IF;
  IF payload_content_type NOT IN (
    'daily_scripture_assignment', 'formation_season_introduction', 'circuit_practice',
    'book_chapter_practice', 'read_along_prompt', 'control_release_move_prompt',
    'ego_signal', 'recovery_prompt', 'service_mission', 'weekly_review', 'witness_act',
    'witness_evidence', 'gospel_comparison', 'historical_context', 'completion_language', 'email_guidance'
  ) THEN
    RAISE EXCEPTION 'invalid_content_type' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_payload ->> 'title', ''))) NOT BETWEEN 1 AND 240
     OR length(trim(COALESCE(p_payload ->> 'body', ''))) NOT BETWEEN 1 AND 30000 THEN
    RAISE EXCEPTION 'title_and_body_required' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(p_payload ->> 'scriptureReference', '') IS NOT NULL
     AND NOT public.is_valid_scripture_reference(p_payload ->> 'scriptureReference') THEN
    RAISE EXCEPTION 'invalid_scripture_reference' USING ERRCODE = '22023';
  END IF;
  IF (payload_content_type = 'historical_context' OR payload_classification = 'Historical Context')
     AND cardinality(citations) = 0 THEN
    RAISE EXCEPTION 'historical_citations_required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(citations) AS citation WHERE citation !~ '^https://') THEN
    RAISE EXCEPTION 'https_citations_required' USING ERRCODE = '22023';
  END IF;
  IF payload_classification = 'Creative Reconstruction'
     AND COALESCE(p_payload ->> 'body', '') !~* '^Creative Reconstruction:' THEN
    RAISE EXCEPTION 'creative_reconstruction_label_required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(payload_stable_id, 0));

  INSERT INTO public.formation_content_items (stable_id, content_type, created_by)
  VALUES (payload_stable_id, payload_content_type, current_user_id)
  ON CONFLICT (stable_id) DO UPDATE SET stable_id = EXCLUDED.stable_id
  RETURNING * INTO target_item;

  IF target_item.content_type <> payload_content_type THEN
    RAISE EXCEPTION 'content_type_is_stable' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM public.formation_content_versions
  WHERE item_id = target_item.id;

  INSERT INTO public.formation_content_versions (
    item_id, version, title, slug, body, formation_track, day_start, day_end,
    formation_season, book_chapter, spoiler_level, scripture_reference, bible_translation,
    evidence_classification, source_citations, author, author_user_id,
    theological_review_status, historical_review_status, publication_status, ai_assisted
  ) VALUES (
    target_item.id,
    next_version,
    trim(p_payload ->> 'title'),
    p_payload ->> 'slug',
    trim(p_payload ->> 'body'),
    COALESCE(NULLIF(p_payload ->> 'formationTrack', ''), 'all'),
    NULLIF(p_payload ->> 'dayStart', '')::smallint,
    NULLIF(p_payload ->> 'dayEnd', '')::smallint,
    NULLIF(p_payload ->> 'formationSeason', ''),
    NULLIF(p_payload ->> 'bookChapter', ''),
    COALESCE((p_payload ->> 'spoilerLevel')::smallint, 0),
    NULLIF(p_payload ->> 'scriptureReference', ''),
    NULLIF(p_payload ->> 'bibleTranslation', ''),
    payload_classification,
    citations,
    trim(p_payload ->> 'author'),
    current_user_id,
    'pending',
    CASE WHEN payload_content_type = 'historical_context' OR payload_classification = 'Historical Context' THEN 'pending' ELSE 'not_required' END,
    'draft',
    COALESCE((p_payload ->> 'aiAssisted')::boolean, false)
  ) RETURNING * INTO saved_version;

  INSERT INTO public.formation_content_review_events (content_version_id, actor_user_id, event_type)
  VALUES (saved_version.id, current_user_id, CASE WHEN COALESCE((p_payload ->> 'imported')::boolean, false) THEN 'imported' ELSE 'created' END);

  RETURN saved_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_formation_content_for_review(p_version_id uuid)
RETURNS public.formation_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_version public.formation_content_versions;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501'; END IF;
  UPDATE public.formation_content_versions
  SET publication_status = 'in_review'
  WHERE id = p_version_id AND publication_status = 'draft'
  RETURNING * INTO saved_version;
  IF saved_version.id IS NULL THEN RAISE EXCEPTION 'draft_version_not_found' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.formation_content_review_events (content_version_id, actor_user_id, event_type)
  VALUES (p_version_id, auth.uid(), 'submitted');
  RETURN saved_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_formation_content_version(
  p_version_id uuid,
  p_reviewer text,
  p_theological_status text,
  p_historical_status text,
  p_note text DEFAULT NULL
)
RETURNS public.formation_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_version public.formation_content_versions;
  event_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501'; END IF;
  IF p_theological_status NOT IN ('approved', 'changes_requested') OR p_historical_status NOT IN ('not_required', 'approved', 'changes_requested') THEN
    RAISE EXCEPTION 'invalid_review_status' USING ERRCODE = '22023';
  END IF;
  UPDATE public.formation_content_versions
  SET reviewer = trim(p_reviewer),
      reviewer_user_id = auth.uid(),
      theological_review_status = p_theological_status,
      historical_review_status = p_historical_status,
      last_reviewed_date = current_date,
      publication_status = CASE WHEN p_theological_status = 'changes_requested' OR p_historical_status = 'changes_requested' THEN 'draft' ELSE 'in_review' END
  WHERE id = p_version_id
    AND publication_status IN ('draft', 'in_review')
    AND author_user_id IS DISTINCT FROM auth.uid()
    AND length(trim(p_reviewer)) > 0
  RETURNING * INTO saved_version;
  IF saved_version.id IS NULL THEN RAISE EXCEPTION 'independent_reviewer_required' USING ERRCODE = '42501'; END IF;
  event_name := CASE WHEN p_theological_status = 'approved' AND p_historical_status IN ('approved', 'not_required') THEN 'approved' ELSE 'changes_requested' END;
  INSERT INTO public.formation_content_review_events (
    content_version_id, actor_user_id, event_type, theological_review_status, historical_review_status, note
  ) VALUES (p_version_id, auth.uid(), event_name, p_theological_status, p_historical_status, left(p_note, 2000));
  RETURN saved_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_formation_content_version(
  p_version_id uuid,
  p_effective_date date
)
RETURNS public.formation_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_version public.formation_content_versions;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO target_version FROM public.formation_content_versions WHERE id = p_version_id FOR UPDATE;
  IF target_version.id IS NULL THEN RAISE EXCEPTION 'content_version_not_found' USING ERRCODE = '22023'; END IF;
  IF target_version.publication_status <> 'in_review'
     OR target_version.theological_review_status <> 'approved'
     OR target_version.reviewer_user_id IS NULL
     OR target_version.reviewer_user_id = target_version.author_user_id THEN
    RAISE EXCEPTION 'human_theological_review_required' USING ERRCODE = '42501';
  END IF;
  IF (target_version.evidence_classification = 'Historical Context' OR EXISTS (
       SELECT 1 FROM public.formation_content_items WHERE id = target_version.item_id AND content_type = 'historical_context'
     )) AND (target_version.historical_review_status <> 'approved' OR cardinality(target_version.source_citations) = 0) THEN
    RAISE EXCEPTION 'historical_review_and_citations_required' USING ERRCODE = '42501';
  END IF;
  IF target_version.scripture_reference IS NOT NULL AND NOT public.is_valid_scripture_reference(target_version.scripture_reference) THEN
    RAISE EXCEPTION 'invalid_scripture_reference' USING ERRCODE = '22023';
  END IF;
  UPDATE public.formation_content_versions
  SET publication_status = 'published', effective_date = p_effective_date,
      last_reviewed_date = COALESCE(last_reviewed_date, current_date), published_at = now()
  WHERE id = p_version_id RETURNING * INTO target_version;
  UPDATE public.formation_content_items SET current_published_version_id = p_version_id WHERE id = target_version.item_id;
  INSERT INTO public.formation_content_review_events (content_version_id, actor_user_id, event_type)
  VALUES (p_version_id, auth.uid(), 'published');
  RETURN target_version;
END;
$$;

REVOKE ALL ON FUNCTION public.save_formation_content_draft(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_formation_content_for_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_formation_content_version(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_formation_content_version(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_formation_content_draft(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_formation_content_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_formation_content_version(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_formation_content_version(uuid, date) TO authenticated;

-- Historical formation records retain the exact content version originally delivered.
ALTER TABLE public.formation_circuit_entries
  ADD COLUMN content_version_id uuid REFERENCES public.formation_content_versions(id) ON DELETE RESTRICT;

ALTER TABLE public.formation_completion_records
  ADD COLUMN content_version_ids uuid[] NOT NULL DEFAULT '{}';

DROP FUNCTION public.save_formation_circuit(date, text, text, text, text, text[], text[], jsonb, text);

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

  INSERT INTO public.formation_circuit_entries (
    user_id, local_date, track, circuit_type, rule_version, completion_state,
    completed_action_ids, missing_required_action_ids, payload, idempotency_key,
    content_version_id, completed_at
  ) VALUES (
    current_user_id, p_local_date, p_track, p_circuit_type, p_rule_version, p_completion_state,
    COALESCE(p_completed_action_ids, '{}'), COALESCE(p_missing_required_action_ids, '{}'),
    COALESCE(p_payload, '{}'::jsonb), p_idempotency_key, p_content_version_id,
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
    content_version_id = COALESCE(formation_circuit_entries.content_version_id, EXCLUDED.content_version_id),
    completed_at = CASE WHEN EXCLUDED.completion_state IN ('recorded', 'complete') THEN COALESCE(formation_circuit_entries.completed_at, now()) ELSE NULL END,
    updated_at = now()
  RETURNING * INTO saved_entry;
  RETURN saved_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.save_formation_circuit(date, text, text, text, text, text[], text[], jsonb, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_formation_circuit(date, text, text, text, text, text[], text[], jsonb, text, uuid)
  TO authenticated;