-- One service-only cost authority for every hosted inference. No client flags,
-- aggregate usage logs, or localStorage can grant money or reply allowances.
CREATE TABLE public.hosted_ai_policy (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  enabled boolean NOT NULL DEFAULT false,
  daily_budget_micros integer NOT NULL DEFAULT 10000000 CHECK(daily_budget_micros BETWEEN 100000 AND 100000000),
  free_daily_budget_micros integer NOT NULL DEFAULT 1000000 CHECK(free_daily_budget_micros BETWEEN 100000 AND 10000000)
);
INSERT INTO public.hosted_ai_policy DEFAULT VALUES;
ALTER TABLE public.hosted_ai_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hosted_ai_policy FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.hosted_ai_policy TO service_role;

CREATE TABLE public.hosted_ai_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK(length(feature) BETWEEN 1 AND 64),
  chat_request_id uuid,
  free_sample boolean NOT NULL DEFAULT false,
  cost_micros integer NOT NULL CHECK(cost_micros BETWEEN 1 AND 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(chat_request_id IS NULL OR feature = 'ai-chat')
);
CREATE INDEX hosted_ai_owner_period ON public.hosted_ai_reservations(user_id, created_at);
CREATE INDEX hosted_ai_project_period ON public.hosted_ai_reservations(created_at);
ALTER TABLE public.hosted_ai_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hosted_ai_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.hosted_ai_reservations TO service_role;

CREATE FUNCTION public.hosted_ai_plan(p_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT COALESCE((SELECT COALESCE(e.plan_tier,'lifetime') FROM public.user_entitlements e
 WHERE e.user_id = p_user_id AND e.entitlement_type = 'full_access'
   AND (e.expires_at IS NULL OR e.expires_at > now())
   AND (e.source = 'manual' OR e.subscription_status = 'active'
     OR (e.source IN ('stripe','promo','webhook') AND e.subscription_status IS NULL))
   AND (e.plan_tier IN ('plus','pro','premium','lifetime') OR (e.plan_tier IS NULL AND e.source='manual')) LIMIT 1), 'free');
$$;
REVOKE ALL ON FUNCTION public.hosted_ai_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hosted_ai_plan(uuid) TO service_role;

-- Keep the nominal daily limits of existing paid offers while introducing a
-- shared monthly cost ceiling. New Pro offers use 10/day.
CREATE FUNCTION public.hosted_ai_daily_limit(p_user_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT CASE
   WHEN public.hosted_ai_plan(p_user_id)='free' THEN 5
   WHEN public.hosted_ai_plan(p_user_id)='plus' THEN 15
   WHEN EXISTS(SELECT 1 FROM public.user_entitlements WHERE user_id=p_user_id
      AND entitlement_type='full_access'
      AND (price_id='price_1Sty37IrFORWV7K43PkIVSJx' OR plan_tier IN ('premium','lifetime') OR source='manual')) THEN 25
   ELSE 10 END;
$$;
REVOKE ALL ON FUNCTION public.hosted_ai_daily_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hosted_ai_daily_limit(uuid) TO service_role;

CREATE FUNCTION public.reserve_hosted_ai(
  p_user_id uuid, p_feature text, p_cost_micros integer, p_chat_request_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  tier text; month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  spent bigint; replies integer; daily_replies integer; budget integer; reply_limit integer;
  is_new_chat boolean; reservation uuid; global_spent bigint; free_spent bigint; global_limit integer; free_limit integer; policy_enabled boolean;
BEGIN
  IF p_cost_micros IS NULL OR p_cost_micros NOT BETWEEN 1 AND 100000
    OR p_feature IS NULL OR p_feature NOT IN (
      'ai-chat','ai-reflect','ai-briefing','dashboard-intelligence','generate-insights',
      'admin-insights','generate-weekly-review','ai-grocery-list','generate-certificate',
      'ai-meal-plan','ai-meal-analyze','generate-snapshot-insight','daily-os-plan',
      'generate-predictions','ig-proof-analyze','operator-console','ai-orchestrator')
    OR (p_feature = 'ai-chat') IS DISTINCT FROM (p_chat_request_id IS NOT NULL) THEN
    RAISE EXCEPTION 'invalid_ai_reservation';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.hosted_ai_policy WHERE id AND enabled) THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'hosted_ai_unavailable');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL) THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'verified_email_required');
  END IF;
  -- Lifetime and monthly paths share the SAME owner lock, including upgrade and
  -- downgrade races. Reservations never expire/refund after timeouts or failures.
  PERFORM pg_advisory_xact_lock(hashtextextended('hosted-ai-global:' || day_start::text,0));
  SELECT enabled,daily_budget_micros,free_daily_budget_micros INTO policy_enabled,global_limit,free_limit FROM public.hosted_ai_policy WHERE id;
  IF policy_enabled IS DISTINCT FROM true THEN RETURN jsonb_build_object('allowed',false,'code','hosted_ai_unavailable'); END IF;
  SELECT COALESCE(sum(cost_micros),0),COALESCE(sum(cost_micros) FILTER (WHERE free_sample),0)
    INTO global_spent,free_spent FROM public.hosted_ai_reservations WHERE created_at>=day_start;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':hosted-ai-budget',0));
  tier := public.hosted_ai_plan(p_user_id);
  IF global_spent+p_cost_micros>global_limit OR (tier='free' AND free_spent+p_cost_micros>free_limit) THEN
    RETURN jsonb_build_object('allowed',false,'code','hosted_ai_project_budget_reached');
  END IF;
  IF tier = 'free' AND p_feature <> 'ai-chat' THEN
    RETURN jsonb_build_object('allowed',false,'code','hosted_ai_requires_paid');
  END IF;
  budget := CASE WHEN tier='free' THEN 100000 ELSE 2500000 END;
  reply_limit := CASE WHEN tier='free' THEN 5 ELSE 200 END;
  SELECT COALESCE(sum(cost_micros),0), count(DISTINCT chat_request_id),
    count(DISTINCT chat_request_id) FILTER (WHERE created_at >= day_start)
  INTO spent, replies, daily_replies FROM public.hosted_ai_reservations
  WHERE user_id=p_user_id AND (tier='free' OR created_at>=month_start);
  is_new_chat := p_chat_request_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.hosted_ai_reservations WHERE user_id=p_user_id AND chat_request_id=p_chat_request_id);
  IF spent + p_cost_micros > budget THEN
    RETURN jsonb_build_object('allowed',false,'code','hosted_ai_budget_reached');
  END IF;
  IF is_new_chat AND (replies >= reply_limit OR daily_replies >= public.hosted_ai_daily_limit(p_user_id)) THEN
    RETURN jsonb_build_object('allowed',false,'code','hosted_ai_reply_limit');
  END IF;
  INSERT INTO public.hosted_ai_reservations(user_id,feature,cost_micros,chat_request_id,free_sample)
  VALUES(p_user_id,p_feature,p_cost_micros,p_chat_request_id,tier='free') RETURNING id INTO reservation;
  RETURN jsonb_build_object('allowed',true,'reservationId',reservation,'remainingMicros',budget-spent-p_cost_micros);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_hosted_ai(uuid,text,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_hosted_ai(uuid,text,integer,uuid) TO service_role;

CREATE FUNCTION public.get_hosted_ai_allowance() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  owner_id uuid := auth.uid(); tier text; spent bigint; replies integer; daily_replies integer;
  month_start timestamptz := date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  tier := public.hosted_ai_plan(owner_id);
  SELECT COALESCE(sum(cost_micros),0), count(DISTINCT chat_request_id),
    count(DISTINCT chat_request_id) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
  INTO spent,replies,daily_replies FROM public.hosted_ai_reservations
  WHERE user_id=owner_id AND (tier='free' OR created_at>=month_start);
  RETURN jsonb_build_object('enabled',COALESCE((SELECT enabled FROM public.hosted_ai_policy WHERE id),false),
    'byoActive',EXISTS(SELECT 1 FROM public.coach_provider_settings s WHERE s.user_id=owner_id AND s.last4 IS NOT NULL
      AND NOT s.hosted_coach_selected AND EXISTS(SELECT 1 FROM public.coach_provider_rollout WHERE id AND coach_providers_enabled)),
    'byoRemaining',GREATEST(0,100-COALESCE((SELECT message_count FROM public.coach_byo_usage WHERE user_id=owner_id AND usage_date=(now() AT TIME ZONE 'UTC')::date),0)),
    'plan',tier,'repliesRemaining',GREATEST(0,CASE WHEN tier='free' THEN 5 ELSE 200 END-replies),
    'dailyRemaining',GREATEST(0,public.hosted_ai_daily_limit(owner_id)-daily_replies),
    'budgetPercentRemaining',GREATEST(0,round(100*(1-spent::numeric/CASE WHEN tier='free' THEN 100000 ELSE 2500000 END))),
    'resetsAt',CASE WHEN tier='free' THEN NULL ELSE month_start + interval '1 month' END);
END;
$$;
REVOKE ALL ON FUNCTION public.get_hosted_ai_allowance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_hosted_ai_allowance() TO authenticated;
COMMENT ON TABLE public.hosted_ai_reservations IS 'Conservative reserved inference cost, not Stripe billing or an invoice. Failed calls retain reservations. Fixed Gemini 3.1 Flash Lite policy version 2026-10.';

-- The legacy count-only RPC is superseded by reservations for each inference.
DROP FUNCTION IF EXISTS public.reserve_hosted_coach_usage(uuid);

CREATE FUNCTION public.disable_hosted_ai_after_mismatch() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE public.hosted_ai_policy SET enabled=false WHERE id;
$$;
REVOKE ALL ON FUNCTION public.disable_hosted_ai_after_mismatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.disable_hosted_ai_after_mismatch() TO service_role;

-- Provider selection presentation uses the same current billing authority.
CREATE OR REPLACE FUNCTION public.get_hosted_coach_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'enabled',EXISTS(SELECT 1 FROM public.hosted_ai_policy WHERE id AND enabled)
      AND EXISTS(SELECT 1 FROM public.coach_provider_rollout WHERE id AND hosted_coach_enabled),
    'entitled',public.hosted_ai_plan(auth.uid()) IN ('pro','premium','lifetime'),
    'selected',COALESCE((SELECT hosted_coach_selected FROM public.coach_provider_settings WHERE user_id=auth.uid()),false));
END;
$$;
REVOKE ALL ON FUNCTION public.get_hosted_coach_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_hosted_coach_status() TO authenticated;
CREATE OR REPLACE FUNCTION public.select_hosted_coach(p_selected boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  IF p_selected IS NULL THEN RAISE EXCEPTION 'invalid_coach_selection'; END IF;
  IF p_selected AND (NOT EXISTS(SELECT 1 FROM public.hosted_ai_policy WHERE id AND enabled)
    OR NOT EXISTS(SELECT 1 FROM public.coach_provider_rollout WHERE id AND hosted_coach_enabled)) THEN
    RAISE EXCEPTION 'hosted_coach_disabled' USING ERRCODE='42501';
  END IF;
  IF p_selected AND public.hosted_ai_plan(auth.uid()) NOT IN ('pro','premium','lifetime') THEN
    RAISE EXCEPTION 'hosted_coach_requires_pro' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':coach-key',0));
  INSERT INTO public.coach_provider_settings(user_id,hosted_coach_selected) VALUES(auth.uid(),p_selected)
  ON CONFLICT(user_id) DO UPDATE SET hosted_coach_selected=p_selected,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.select_hosted_coach(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.select_hosted_coach(boolean) TO authenticated;
