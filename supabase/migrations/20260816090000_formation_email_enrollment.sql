-- Make a selected formation path durable and use that explicit choice to start
-- the morning email loop. Users can still disable email in Settings at any time.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS formation_track text
    CHECK (formation_track IS NULL OR formation_track IN ('read_along', 'charge_40', 'fully_charged_75')),
  ADD COLUMN IF NOT EXISTS formation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS formation_email_opt_in_at timestamptz;

COMMENT ON COLUMN public.profiles.formation_track IS
  'The formation path explicitly selected by the user during onboarding or in the formation experience.';
COMMENT ON COLUMN public.profiles.formation_email_opt_in_at IS
  'Timestamp of the user-disclosed morning formation email opt-in. Email can be disabled in profile settings.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_track text := NULLIF(new.raw_user_meta_data ->> 'formation_track', '');
  selected_timezone text := COALESCE(NULLIF(new.raw_user_meta_data ->> 'formation_timezone', ''), 'America/New_York');
  formation_email_enabled boolean := lower(COALESCE(new.raw_user_meta_data ->> 'formation_email_enabled', 'false')) IN ('true', '1', 'yes', 'on');
BEGIN
  IF selected_track NOT IN ('read_along', 'charge_40', 'fully_charged_75') THEN
    selected_track := NULL;
    formation_email_enabled := false;
  END IF;

  INSERT INTO public.profiles (
    id,
    display_name,
    timezone,
    email_nudge_enabled,
    email_nudge_time,
    nudge_frequency,
    formation_track,
    formation_started_at,
    formation_email_opt_in_at
  )
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    selected_timezone,
    formation_email_enabled,
    'morning',
    'daily',
    selected_track,
    CASE WHEN selected_track IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN formation_email_enabled THEN now() ELSE NULL END
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_formation_path(
  p_track text,
  p_email_enabled boolean DEFAULT NULL,
  p_timezone text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  saved_profile public.profiles;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF p_track NOT IN ('read_along', 'charge_40', 'fully_charged_75') THEN
    RAISE EXCEPTION 'invalid_formation_track' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (
    id,
    formation_track,
    formation_started_at,
    timezone,
    email_nudge_enabled,
    email_nudge_time,
    nudge_frequency,
    formation_email_opt_in_at
  )
  VALUES (
    current_user_id,
    p_track,
    now(),
    COALESCE(NULLIF(p_timezone, ''), 'America/New_York'),
    COALESCE(p_email_enabled, false),
    'morning',
    'daily',
    CASE WHEN p_email_enabled IS TRUE THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    formation_started_at = CASE
      WHEN profiles.formation_track IS DISTINCT FROM EXCLUDED.formation_track THEN now()
      ELSE COALESCE(profiles.formation_started_at, now())
    END,
    formation_track = EXCLUDED.formation_track,
    timezone = COALESCE(NULLIF(p_timezone, ''), profiles.timezone, 'America/New_York'),
    email_nudge_enabled = COALESCE(p_email_enabled, profiles.email_nudge_enabled, false),
    email_nudge_time = CASE WHEN p_email_enabled IS NOT NULL THEN 'morning' ELSE profiles.email_nudge_time END,
    nudge_frequency = CASE WHEN p_email_enabled IS NOT NULL THEN 'daily' ELSE profiles.nudge_frequency END,
    formation_email_opt_in_at = CASE
      WHEN p_email_enabled IS TRUE THEN COALESCE(profiles.formation_email_opt_in_at, now())
      WHEN p_email_enabled IS FALSE THEN NULL
      ELSE profiles.formation_email_opt_in_at
    END
  RETURNING * INTO saved_profile;

  RETURN saved_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_formation_path(text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_formation_path(text, boolean, text) TO authenticated;
