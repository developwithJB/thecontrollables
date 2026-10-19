-- LOCAL ONLY. BYO rollout defaults OFF; no credentials are seeded.
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE TABLE public.coach_provider_rollout (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  coach_providers_enabled boolean NOT NULL DEFAULT false
);
REVOKE ALL ON public.coach_provider_rollout FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.coach_provider_rollout TO service_role;
ALTER TABLE public.coach_provider_rollout ENABLE ROW LEVEL SECURITY;
INSERT INTO public.coach_provider_rollout (id) VALUES (true);

CREATE TABLE public.coach_provider_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'lovable_gateway' CHECK (provider IN ('lovable_gateway','openai_compatible','anthropic')),
  base_url text CHECK (base_url IN ('https://api.openai.com/v1','https://openrouter.ai/api/v1','https://api.anthropic.com')),
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash' CHECK (length(model) BETWEEN 1 AND 120 AND model ~ '^[A-Za-z0-9._:/-]+$'),
  persona_tone text NOT NULL DEFAULT 'balanced' CHECK (persona_tone IN ('balanced','warm','direct')),
  depth text NOT NULL DEFAULT 'standard' CHECK (depth IN ('concise','standard','detailed')),
  vault_secret_id uuid,
  last4 text CHECK (last4 IS NULL OR length(last4) = 4),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((provider = 'lovable_gateway' AND base_url IS NULL AND vault_secret_id IS NULL AND last4 IS NULL)
    OR (provider = 'openai_compatible' AND base_url IS NOT NULL AND base_url IN ('https://api.openai.com/v1','https://openrouter.ai/api/v1') AND vault_secret_id IS NOT NULL AND last4 IS NOT NULL)
    OR (provider = 'anthropic' AND base_url IS NOT NULL AND base_url = 'https://api.anthropic.com' AND vault_secret_id IS NOT NULL AND last4 IS NOT NULL))
);
CREATE TRIGGER coach_settings_updated_at BEFORE UPDATE ON public.coach_provider_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
REVOKE ALL ON public.coach_provider_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (user_id, provider, base_url, model, persona_tone, depth, last4, updated_at) ON public.coach_provider_settings TO authenticated;
GRANT UPDATE (model, persona_tone, depth) ON public.coach_provider_settings TO authenticated;
GRANT SELECT ON public.coach_provider_settings TO service_role;
ALTER TABLE public.coach_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY coach_settings_owner_select ON public.coach_provider_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY coach_settings_owner_update ON public.coach_provider_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE FUNCTION public.coach_providers_available() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND coach_providers_enabled);
$$;
REVOKE ALL ON FUNCTION public.coach_providers_available() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_providers_available() TO authenticated;

CREATE FUNCTION public.set_coach_api_key(p_provider text, p_key text, p_base_url text, p_model text) RETURNS jsonb
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
    model = EXCLUDED.model, vault_secret_id = EXCLUDED.vault_secret_id, last4 = EXCLUDED.last4, updated_at = now();
  RETURN jsonb_build_object('provider', p_provider, 'last4', right(p_key,4));
END;
$$;
REVOKE ALL ON FUNCTION public.set_coach_api_key(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_coach_api_key(text,text,text,text) TO authenticated;

CREATE FUNCTION public.clear_coach_api_key() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE owner_id uuid := auth.uid(); secret_id uuid;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text || ':coach-key', 0));
  SELECT vault_secret_id INTO secret_id FROM public.coach_provider_settings WHERE user_id = owner_id FOR UPDATE;
  UPDATE public.coach_provider_settings SET provider = 'lovable_gateway', base_url = NULL,
    vault_secret_id = NULL, last4 = NULL, model = 'google/gemini-2.5-flash', updated_at = now() WHERE user_id = owner_id;
  DELETE FROM vault.secrets WHERE id = secret_id;
  RETURN jsonb_build_object('provider','lovable_gateway','last4',NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.clear_coach_api_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_coach_api_key() TO authenticated;

CREATE FUNCTION public.delete_coach_vault_secret() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN DELETE FROM vault.secrets WHERE id = OLD.vault_secret_id; RETURN OLD; END;
$$;
REVOKE ALL ON FUNCTION public.delete_coach_vault_secret() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER delete_coach_secret BEFORE DELETE ON public.coach_provider_settings FOR EACH ROW EXECUTE FUNCTION public.delete_coach_vault_secret();

-- Race-safe independent BYO cap. Reserve before a provider call; failures still count.
CREATE TABLE public.coach_byo_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  message_count integer NOT NULL CHECK (message_count BETWEEN 1 AND 100),
  PRIMARY KEY (user_id, usage_date)
);
REVOKE ALL ON public.coach_byo_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.coach_byo_usage TO service_role;
ALTER TABLE public.coach_byo_usage ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.reserve_coach_byo_usage(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE used_count integer;
BEGIN
  -- EXECUTE is restricted to service_role, independently of caller-supplied claims.
  IF NOT EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND coach_providers_enabled) THEN
    RAISE EXCEPTION 'coach_providers_disabled' USING ERRCODE = '42501';
  END IF;
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

CREATE FUNCTION public.save_coach_preferences(p_model text, p_tone text, p_depth text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.coach_providers_available() THEN RAISE EXCEPTION 'coach_providers_disabled' USING ERRCODE = '42501'; END IF;
  IF p_model IS NULL OR length(p_model) NOT BETWEEN 1 AND 120 OR p_model !~ '^[A-Za-z0-9._:/-]+$'
    OR p_tone IS NULL OR p_tone NOT IN ('balanced','warm','direct') OR p_depth IS NULL OR p_depth NOT IN ('concise','standard','detailed') THEN
    RAISE EXCEPTION 'invalid_coach_preferences' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':coach-key', 0));
  INSERT INTO public.coach_provider_settings (user_id,persona_tone,depth)
  VALUES (auth.uid(),p_tone,p_depth)
  ON CONFLICT (user_id) DO UPDATE SET persona_tone=p_tone, depth=p_depth,
    model=CASE WHEN coach_provider_settings.provider = 'lovable_gateway' THEN 'google/gemini-2.5-flash' ELSE p_model END, updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.save_coach_preferences(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_coach_preferences(text,text,text) TO authenticated;
