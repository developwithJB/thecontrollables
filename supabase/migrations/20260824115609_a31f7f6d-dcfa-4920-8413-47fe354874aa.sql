-- Make the billing boundary explicit at the privilege layer. Profile rows are
-- created by the auth trigger; clients may update only ordinary profile fields.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM anon, authenticated;

GRANT UPDATE (
  display_name,
  avatar_url,
  email_nudge_enabled,
  email_nudge_time,
  timezone,
  nudge_frequency,
  meal_preferences
) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Keep the trigger as defense in depth for any future broad table grant.
DROP TRIGGER IF EXISTS protect_profile_plan_tier ON public.profiles;
CREATE TRIGGER protect_profile_plan_tier
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_plan_tier();