-- Pro hosted coach rollout remains OFF. No Stripe objects, price or billing edits.
ALTER TABLE public.coach_provider_rollout ADD COLUMN hosted_coach_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.coach_provider_settings ADD COLUMN hosted_coach_selected boolean NOT NULL DEFAULT false;
GRANT SELECT (hosted_coach_selected) ON public.coach_provider_settings TO authenticated;

CREATE FUNCTION public.get_hosted_coach_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'enabled', EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND hosted_coach_enabled),
    'entitled', EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND plan_tier IN ('pro','premium','lifetime')),
    'selected', COALESCE((SELECT hosted_coach_selected FROM public.coach_provider_settings WHERE user_id=auth.uid()),false)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_hosted_coach_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_hosted_coach_status() TO authenticated;

CREATE FUNCTION public.select_hosted_coach(p_selected boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_selected IS NULL THEN RAISE EXCEPTION 'invalid_coach_selection' USING ERRCODE = '22023'; END IF;
  IF p_selected AND NOT EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND hosted_coach_enabled) THEN
    RAISE EXCEPTION 'hosted_coach_disabled' USING ERRCODE = '42501';
  END IF;
  IF p_selected AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND plan_tier IN ('pro','premium','lifetime')) THEN
    RAISE EXCEPTION 'hosted_coach_requires_pro' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':coach-key',0));
  INSERT INTO public.coach_provider_settings (user_id,hosted_coach_selected) VALUES (auth.uid(),p_selected)
  ON CONFLICT (user_id) DO UPDATE SET hosted_coach_selected=p_selected,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.select_hosted_coach(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_hosted_coach(boolean) TO authenticated;

-- The newly selected personal provider becomes active when its new key is saved.
CREATE OR REPLACE FUNCTION public.set_coach_api_key(p_provider text, p_key text, p_base_url text, p_model text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE owner_id uuid := auth.uid(); secret_id uuid;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF NOT public.coach_providers_available() THEN RAISE EXCEPTION 'coach_providers_disabled' USING ERRCODE = '42501'; END IF;
  IF p_provider IS NULL OR p_base_url IS NULL OR NOT ((p_provider = 'openai_compatible' AND p_base_url IN ('https://api.openai.com/v1','https://openrouter.ai/api/v1'))
    OR (p_provider = 'anthropic' AND p_base_url = 'https://api.anthropic.com')) THEN
    RAISE EXCEPTION 'invalid_coach_provider' USING ERRCODE = '22023';
  END IF;
  IF p_key IS NULL OR length(p_key) NOT BETWEEN 12 AND 512 OR p_key !~ '^[A-Za-z0-9._-]+$'
    OR p_model IS NULL OR length(p_model) NOT BETWEEN 1 AND 120 OR p_model !~ '^[A-Za-z0-9._:/-]+$' THEN
    RAISE EXCEPTION 'invalid_coach_credentials' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text || ':coach-key', 0));
  SELECT vault_secret_id INTO secret_id FROM public.coach_provider_settings WHERE user_id = owner_id FOR UPDATE;
  IF secret_id IS NULL THEN
    secret_id := vault.create_secret(p_key, 'coach:' || owner_id::text, 'Owner-managed coach credential');
  ELSE
    PERFORM vault.update_secret(secret_id, p_key);
  END IF;
  INSERT INTO public.coach_provider_settings (user_id, provider, base_url, model, vault_secret_id, last4)
  VALUES (owner_id, p_provider, p_base_url, p_model, secret_id, right(p_key,4))
  ON CONFLICT (user_id) DO UPDATE SET provider = EXCLUDED.provider, base_url = EXCLUDED.base_url,
    hosted_coach_selected = false, model = EXCLUDED.model, vault_secret_id = EXCLUDED.vault_secret_id, last4 = EXCLUDED.last4, updated_at = now();
  RETURN jsonb_build_object('provider', p_provider, 'last4', right(p_key,4));
END;
$$;
REVOKE ALL ON FUNCTION public.set_coach_api_key(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_coach_api_key(text,text,text,text) TO authenticated;


-- Quota authority must not use the legacy client-writable aggregate log.
CREATE TABLE public.coach_hosted_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  message_count integer NOT NULL CHECK (message_count BETWEEN 1 AND 25),
  PRIMARY KEY (user_id,usage_date)
);
REVOKE ALL ON public.coach_hosted_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.coach_hosted_usage TO service_role;
ALTER TABLE public.coach_hosted_usage ENABLE ROW LEVEL SECURITY;

-- Serialize BYO/hosted reservations together, preserving the existing BYO cap.
CREATE OR REPLACE FUNCTION public.reserve_coach_byo_usage(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE used_count integer;
BEGIN
  -- EXECUTE is restricted to service_role, independently of caller-supplied claims.
  IF NOT EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND coach_providers_enabled) THEN
    RAISE EXCEPTION 'coach_providers_disabled' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':coach-usage:' || (now() AT TIME ZONE 'UTC')::date::text,0));
  INSERT INTO public.coach_byo_usage (user_id,usage_date,message_count)
  VALUES (p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT (user_id,usage_date) DO UPDATE SET message_count = coach_byo_usage.message_count + 1
  WHERE coach_byo_usage.message_count < 100 RETURNING message_count INTO used_count;
  IF used_count IS NULL THEN RETURN jsonb_build_object('allowed',false,'used',100,'remaining',0,'dailyLimit',100); END IF;
  INSERT INTO public.ai_usage_logs (user_id,usage_date,message_count)
  VALUES (p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT (user_id,usage_date) DO UPDATE SET message_count = ai_usage_logs.message_count + 1, updated_at = now();
  RETURN jsonb_build_object('allowed',true,'used',used_count,'remaining',100-used_count,'dailyLimit',100);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_coach_byo_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_coach_byo_usage(uuid) TO service_role;


-- New hosted path fails closed and uses the existing Pro daily chat limit (25).
CREATE FUNCTION public.reserve_hosted_coach_usage(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE used_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND hosted_coach_enabled) THEN
    RAISE EXCEPTION 'hosted_coach_disabled' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id AND plan_tier IN ('pro','premium','lifetime'))
    OR NOT EXISTS (SELECT 1 FROM public.coach_provider_settings WHERE user_id=p_user_id AND hosted_coach_selected) THEN
    RAISE EXCEPTION 'hosted_coach_requires_pro_selection' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':coach-usage:' || (now() AT TIME ZONE 'UTC')::date::text,0));
  used_count := COALESCE((SELECT message_count FROM public.coach_hosted_usage WHERE user_id=p_user_id AND usage_date=(now() AT TIME ZONE 'UTC')::date),0)
    + COALESCE((SELECT message_count FROM public.coach_byo_usage WHERE user_id=p_user_id AND usage_date=(now() AT TIME ZONE 'UTC')::date),0);
  IF used_count>=25 THEN RETURN jsonb_build_object('allowed',false,'used',used_count,'remaining',0,'dailyLimit',25); END IF;
  INSERT INTO public.coach_hosted_usage (user_id,usage_date,message_count)
  VALUES (p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT (user_id,usage_date) DO UPDATE SET message_count=coach_hosted_usage.message_count+1;
  INSERT INTO public.ai_usage_logs (user_id,usage_date,message_count)
  VALUES (p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT (user_id,usage_date) DO UPDATE SET message_count=ai_usage_logs.message_count+1,updated_at=now();
  RETURN jsonb_build_object('allowed',true,'used',used_count+1,'remaining',24-used_count,'dailyLimit',25);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_hosted_coach_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_hosted_coach_usage(uuid) TO service_role;
