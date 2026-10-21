-- Replace arbitrary browser writes with the bounded server ingestion endpoint.
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_events,public.app_errors,public.page_views FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.app_events,public.app_errors,public.page_views TO service_role;
DROP POLICY IF EXISTS "Allow anonymous insert for events" ON public.app_events;
DROP POLICY IF EXISTS "Allow anonymous insert for errors" ON public.app_errors;
DROP POLICY IF EXISTS "Allow anonymous insert for page views" ON public.page_views;

-- Legacy reading tables are consumed by the server reminder worker. Reviewed
-- formation content has its own publication/review gates, left unchanged here.
REVOKE ALL ON public.daily_readings,public.daily_scriptures FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.daily_readings,public.daily_scriptures TO service_role;
DROP POLICY IF EXISTS "Anyone can view daily readings" ON public.daily_readings;
DROP POLICY IF EXISTS "Anyone can view scriptures" ON public.daily_scriptures;

-- Certificates may contain names and private season reflections. Existing
-- records/paths stay intact; owners use short-lived signed download URLs.
-- Set certificates.public=false through the supported Storage updateBucket
-- operation immediately after applying this migration; managed SQL cannot
-- mutate storage.buckets. See the release procedure in docs/security/.
DROP POLICY IF EXISTS "Certificates are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Certificate owners can read their files" ON storage.objects;
CREATE POLICY "Certificate owners can read their files" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='certificates' AND ((storage.foldername(name))[1]=auth.uid()::text OR name='Certificate Template.png'));

CREATE TABLE IF NOT EXISTS public.telemetry_ingest_limits(
 actor text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL CHECK(count>=0)
);
ALTER TABLE public.telemetry_ingest_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telemetry_ingest_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.telemetry_ingest_limits TO service_role;
CREATE INDEX IF NOT EXISTS telemetry_ingest_limits_window ON public.telemetry_ingest_limits(window_start);
CREATE OR REPLACE FUNCTION public.take_telemetry_ingest_slot(p_actor text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE bucket timestamptz:=date_trunc('minute',now()); taken integer;
BEGIN
 IF p_actor !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 DELETE FROM public.telemetry_ingest_limits WHERE window_start < now()-interval '1 day';
 INSERT INTO public.telemetry_ingest_limits AS t VALUES('project',bucket,1)
 ON CONFLICT(actor) DO UPDATE SET window_start=bucket,count=CASE WHEN t.window_start<bucket THEN 1 ELSE t.count+1 END
 WHERE t.window_start<bucket OR t.count<1000 RETURNING count INTO taken;
 IF taken IS NULL THEN RETURN false; END IF;
 taken:=NULL;
 INSERT INTO public.telemetry_ingest_limits AS t VALUES(p_actor,bucket,1)
 ON CONFLICT(actor) DO UPDATE SET window_start=bucket,count=CASE WHEN t.window_start<bucket THEN 1 ELSE t.count+1 END
 WHERE t.window_start<bucket OR t.count<120 RETURNING count INTO taken;
 RETURN taken IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.take_telemetry_ingest_slot(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.take_telemetry_ingest_slot(text) TO service_role;
