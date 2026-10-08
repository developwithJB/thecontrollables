-- Browser book-loop records only. Does not change formation attempts/content or IG proof.
CREATE SEQUENCE public.book_record_revision_seq;
REVOKE ALL ON SEQUENCE public.book_record_revision_seq FROM PUBLIC, anon;
GRANT USAGE ON SEQUENCE public.book_record_revision_seq TO authenticated;
CREATE TABLE public.controllables_book_records (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('profile', 'promise', 'dex', 'missions', 'crm', 'reading', 'track', 'startingCharge')),
  record_key text NOT NULL CHECK (length(record_key) BETWEEN 1 AND 200),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) IN ('object', 'string') AND octet_length(payload::text) <= 8000000),
  revision bigint NOT NULL DEFAULT nextval('public.book_record_revision_seq'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, record_key)
);
CREATE TABLE public.controllables_book_imports (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id text NOT NULL CHECK (import_id ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, import_id)
);
ALTER TABLE public.controllables_book_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controllables_book_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY book_records_select ON public.controllables_book_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY book_records_insert ON public.controllables_book_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY book_records_update ON public.controllables_book_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY book_records_delete ON public.controllables_book_records FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY book_imports_select ON public.controllables_book_imports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY book_imports_insert ON public.controllables_book_imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY book_imports_update ON public.controllables_book_imports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY book_imports_delete ON public.controllables_book_imports FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.controllables_book_records, public.controllables_book_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.controllables_book_records, public.controllables_book_imports TO authenticated;
GRANT INSERT (user_id, kind, record_key, payload) ON TABLE public.controllables_book_records TO authenticated;
GRANT UPDATE (payload) ON TABLE public.controllables_book_records TO authenticated;
GRANT INSERT (user_id, import_id) ON TABLE public.controllables_book_imports TO authenticated;
-- Identity, import receipts, timestamps and revisions are not client-editable.

CREATE FUNCTION public.bump_book_record_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.revision := nextval('public.book_record_revision_seq');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER book_record_revision BEFORE UPDATE ON public.controllables_book_records
  FOR EACH ROW EXECUTE FUNCTION public.bump_book_record_revision();

-- Atomic compare-and-swap. The caller's JWT and RLS are used, never a supplied owner.
CREATE FUNCTION public.save_book_loop_changes(p_user_id uuid, p_changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item jsonb; current_revision bigint;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_changes) <> 'array' OR jsonb_array_length(p_changes) > 2000 THEN RAISE EXCEPTION 'Invalid changes'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':book-loop', 0));
  FOR item IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    SELECT revision INTO current_revision FROM public.controllables_book_records
      WHERE user_id = auth.uid() AND kind = item->>'kind' AND record_key = item->>'record_key' FOR UPDATE;
    IF COALESCE(current_revision, 0) IS DISTINCT FROM (item->>'expected_revision')::bigint THEN
      RAISE EXCEPTION 'book_loop_conflict' USING ERRCODE = '40001';
    END IF;
    IF COALESCE((item->>'delete')::boolean, false) THEN
      DELETE FROM public.controllables_book_records WHERE user_id = auth.uid() AND kind = item->>'kind' AND record_key = item->>'record_key';
    ELSIF current_revision IS NULL THEN
      INSERT INTO public.controllables_book_records (kind, record_key, payload) VALUES (item->>'kind', item->>'record_key', item->'payload');
    ELSE
      UPDATE public.controllables_book_records SET payload = item->'payload'
        WHERE user_id = auth.uid() AND kind = item->>'kind' AND record_key = item->>'record_key';
    END IF;
  END LOOP;
END;
$$;

-- One transaction: retrying the same import is a no-op; existing server rows always win.
CREATE FUNCTION public.import_book_loop(p_user_id uuid, p_import_id text, p_records jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_records) <> 'array' OR jsonb_array_length(p_records) > 2000 THEN RAISE EXCEPTION 'Invalid import'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':book-loop', 0));
  IF EXISTS (SELECT 1 FROM public.controllables_book_imports WHERE user_id = auth.uid() AND import_id = p_import_id) THEN RETURN; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_records) LOOP
    INSERT INTO public.controllables_book_records (kind, record_key, payload)
      VALUES (item->>'kind', item->>'record_key', item->'payload')
      ON CONFLICT (user_id, kind, record_key) DO NOTHING;
  END LOOP;
  INSERT INTO public.controllables_book_imports (import_id) VALUES (p_import_id);
END;
$$;
REVOKE ALL ON FUNCTION public.save_book_loop_changes(uuid, jsonb), public.import_book_loop(uuid, text, jsonb), public.bump_book_record_revision() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_book_loop_changes(uuid, jsonb), public.import_book_loop(uuid, text, jsonb) TO authenticated;
