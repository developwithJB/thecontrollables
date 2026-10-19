-- Disposable local database only, after the migration. Always rolls back.
BEGIN;
DO $$ BEGIN
 IF has_sequence_privilege('authenticated','public.book_record_revision_seq','UPDATE') OR has_sequence_privilege('authenticated','public.book_record_revision_seq','SELECT') THEN RAISE EXCEPTION 'revision sequence grants too broad'; END IF;
 IF NOT has_sequence_privilege('authenticated','public.book_record_revision_seq','USAGE') THEN RAISE EXCEPTION 'revision sequence usage missing'; END IF;
 IF has_function_privilege('authenticated','public.bump_book_record_revision()','EXECUTE') THEN RAISE EXCEPTION 'trigger exposed as client RPC'; END IF;
END $$;
INSERT INTO auth.users (id, email) VALUES
 ('10000000-0000-0000-0000-000000000001', 'book-loop-a@example.invalid'),
 ('10000000-0000-0000-0000-000000000002', 'book-loop-b@example.invalid');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

SELECT public.save_book_loop_changes('10000000-0000-0000-0000-000000000001',
 '[{"kind":"track","record_key":"current","payload":"read_along","expected_revision":0}]');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.controllables_book_records(user_id,kind,record_key,payload)
      VALUES ('10000000-0000-0000-0000-000000000002','track','current','"charge_40"');
    RAISE EXCEPTION 'cross-owner insert unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.controllables_book_records SET user_id = '10000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'owner mutation unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.controllables_book_records SET revision = 999;
    RAISE EXCEPTION 'revision mutation unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.save_book_loop_changes('10000000-0000-0000-0000-000000000002', '[]');
    RAISE EXCEPTION 'account switch unexpectedly allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Authentication required' THEN RAISE; END IF;
  END;
END $$;

-- Existing server data wins, and repeating a receipt does not insert new records.
SELECT public.import_book_loop('10000000-0000-0000-0000-000000000001', repeat('a',64),
 '[{"kind":"track","record_key":"current","payload":"charge_40"},{"kind":"crm","record_key":"2026-10-07","payload":{"move":"original"}}]');
SELECT public.import_book_loop('10000000-0000-0000-0000-000000000001', repeat('a',64),
 '[{"kind":"crm","record_key":"2026-10-08","payload":{"move":"must not appear"}}]');
DO $$ BEGIN
  IF (SELECT payload FROM public.controllables_book_records WHERE kind='track') <> '"read_along"'::jsonb THEN RAISE EXCEPTION 'import overwrote server'; END IF;
  IF (SELECT count(*) FROM public.controllables_book_records) <> 2 THEN RAISE EXCEPTION 'import replay changed data'; END IF;
  IF (SELECT count(*) FROM public.controllables_book_imports) <> 1 THEN RAISE EXCEPTION 'receipt not idempotent'; END IF;
  BEGIN
    PERFORM public.import_book_loop('10000000-0000-0000-0000-000000000001', repeat('b',64),
      '[{"kind":"crm","record_key":"2026-10-09","payload":{}},{"kind":"invalid","record_key":"bad","payload":{}}]');
    RAISE EXCEPTION 'invalid import allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS (SELECT 1 FROM public.controllables_book_records WHERE record_key='2026-10-09') THEN RAISE EXCEPTION 'partial import survived'; END IF;
  IF EXISTS (SELECT 1 FROM public.controllables_book_imports WHERE import_id=repeat('b',64)) THEN RAISE EXCEPTION 'failed import recorded'; END IF;
END $$;

-- Compare-and-swap conflicts roll the entire multi-record save back.
DO $$ DECLARE old_revision bigint; new_revision bigint; BEGIN
  SELECT revision INTO old_revision FROM public.controllables_book_records WHERE kind='track';
  PERFORM public.save_book_loop_changes('10000000-0000-0000-0000-000000000001', jsonb_build_array(jsonb_build_object('kind','track','record_key','current','payload','charge_40','expected_revision',old_revision)));
  SELECT revision INTO new_revision FROM public.controllables_book_records WHERE kind='track';
  IF old_revision = new_revision THEN RAISE EXCEPTION 'revision did not advance'; END IF;
  BEGIN
    PERFORM public.save_book_loop_changes('10000000-0000-0000-0000-000000000001', jsonb_build_array(
      jsonb_build_object('kind','crm','record_key','2026-10-10','payload','{}'::jsonb,'expected_revision',0),
      jsonb_build_object('kind','track','record_key','current','payload','read_along','expected_revision',old_revision)));
    RAISE EXCEPTION 'stale revision accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  IF EXISTS (SELECT 1 FROM public.controllables_book_records WHERE record_key='2026-10-10') THEN RAISE EXCEPTION 'partial save survived'; END IF;
  DELETE FROM public.controllables_book_records WHERE kind='track';
  INSERT INTO public.controllables_book_records(kind,record_key,payload) VALUES ('track','current','"read_along"');
  IF (SELECT revision FROM public.controllables_book_records WHERE kind='track') = new_revision THEN RAISE EXCEPTION 'revision reused after delete'; END IF;
END $$;

-- A second authenticated account cannot read, update, delete or import over A.
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
DO $$ DECLARE affected integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.controllables_book_records) THEN RAISE EXCEPTION 'cross-owner read allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.controllables_book_imports) THEN RAISE EXCEPTION 'cross-owner receipt read allowed'; END IF;
  UPDATE public.controllables_book_records SET payload='{}';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'cross-owner update allowed'; END IF;
  DELETE FROM public.controllables_book_records;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'cross-owner delete allowed'; END IF;
  BEGIN
    INSERT INTO public.controllables_book_imports(user_id, import_id) VALUES ('10000000-0000-0000-0000-000000000001',repeat('c',64));
    RAISE EXCEPTION 'cross-owner receipt insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.save_book_loop_changes('10000000-0000-0000-0000-000000000002', '[{"kind":"track","record_key":"current","payload":"charge_40","expected_revision":0}]');

RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.controllables_book_records;
    RAISE EXCEPTION 'anonymous select allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.import_book_loop('10000000-0000-0000-0000-000000000001', repeat('d',64), '[]');
    RAISE EXCEPTION 'anonymous RPC allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
