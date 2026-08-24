ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_plan_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_tier_check
      CHECK (plan_tier IN ('free', 'plus', 'pro', 'premium'));
  END IF;
END $$;

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