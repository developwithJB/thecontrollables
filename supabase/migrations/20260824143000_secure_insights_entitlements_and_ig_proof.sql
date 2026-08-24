-- Close the final critical release-gate findings discovered by the production scan.

-- Profiles are user-editable, but billing/entitlement state is server-owned.
CREATE OR REPLACE FUNCTION public.protect_profile_plan_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.plan_tier IS DISTINCT FROM 'free' THEN
      RAISE EXCEPTION 'plan_tier is server managed' USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      RAISE EXCEPTION 'plan_tier is server managed' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_plan_tier() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_plan_tier ON public.profiles;
CREATE TRIGGER protect_profile_plan_tier
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_plan_tier();

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND plan_tier = 'free');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- IG proof screenshots contain personal behavioral evidence. Keep the bucket
-- private and allow reads only from the authenticated owner's top-level folder.
UPDATE storage.buckets
SET public = false
WHERE id = 'ig-proof-images';

DROP POLICY IF EXISTS "Public can view ig proof images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own ig proof images" ON storage.objects;
CREATE POLICY "Users can view own ig proof images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ig-proof-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
