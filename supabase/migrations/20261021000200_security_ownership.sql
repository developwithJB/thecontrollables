-- Retire the public first-admin bootstrap, preserving every existing UUID role.
CREATE OR REPLACE FUNCTION public.bootstrap_admin(admin_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.bootstrap_admin(uuid) FROM PUBLIC,anon,authenticated;

-- Certificate records are issued only by the authenticated server after checking
-- completion. Owner SELECT remains; no customer can fabricate/freeze a record.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.certificates,public.completion_certificates FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.certificates,public.completion_certificates TO service_role;
DROP POLICY IF EXISTS "Users can insert their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can update their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can create their own certificates" ON public.completion_certificates;

-- The legacy browser canvas/template issuer has been replaced by the server
-- generator. No shared template exception or browser certificate upload remains.
DROP POLICY IF EXISTS "Certificate owners can read their files" ON storage.objects;
CREATE POLICY "Certificate owners can read their files" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='certificates' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS "Users can upload their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own certificates" ON storage.objects;
