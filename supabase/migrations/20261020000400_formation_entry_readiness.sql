-- Public aggregate readiness; never exposes unpublished content or account data.
ALTER TABLE public.formation_rule_rollouts
  ADD COLUMN IF NOT EXISTS formation_email_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_formation_entry_status(p_start_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE ready_days integer; ready_versions integer; sample jsonb;
BEGIN
  IF p_start_date IS NULL OR p_start_date < CURRENT_DATE - 1 OR p_start_date > CURRENT_DATE + 31 THEN
    RAISE EXCEPTION 'invalid_start_date' USING ERRCODE = '22023';
  END IF;
  SELECT count(DISTINCT v.day_start), count(*) INTO ready_days, ready_versions
  FROM public.formation_content_items i
  JOIN public.formation_content_versions v ON v.id = i.current_published_version_id
  WHERE v.formation_track = 'fully_charged_75'
    AND v.day_start = v.day_end AND v.day_start BETWEEN 1 AND 75
    AND v.publication_status = 'published' AND v.theological_review_status = 'approved'
    AND v.evidence_classification = 'Scripture' AND v.scripture_reference IS NOT NULL
    AND v.reviewer_user_id IS NOT NULL AND v.reviewer_user_id IS DISTINCT FROM v.author_user_id
    AND v.effective_date <= p_start_date;

  SELECT jsonb_build_object('title',v.title,'body',v.body,'scriptureReference',v.scripture_reference)
  INTO sample FROM public.formation_content_items i
  JOIN public.formation_content_versions v ON v.id = i.current_published_version_id
  WHERE v.formation_track = 'fully_charged_75' AND v.day_start = 1 AND v.day_end = 1
    AND v.publication_status = 'published' AND v.theological_review_status = 'approved'
    AND v.evidence_classification = 'Scripture' AND v.scripture_reference IS NOT NULL
    AND v.reviewer_user_id IS NOT NULL AND v.reviewer_user_id IS DISTINCT FROM v.author_user_id
    AND v.effective_date <= CURRENT_DATE
  ORDER BY v.published_at DESC LIMIT 1;
  RETURN jsonb_build_object('strictReady', ready_days = 75 AND ready_versions = 75, 'reviewedDays',ready_days,
    'emailDeliveryReady',COALESCE((SELECT formation_email_verified FROM public.formation_rule_rollouts WHERE id),false),
    'sample',sample);
END;
$$;
REVOKE ALL ON FUNCTION public.get_formation_entry_status(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_formation_entry_status(date) TO anon, authenticated, service_role;
COMMENT ON COLUMN public.formation_rule_rollouts.formation_email_verified IS
  'Enable only after authorized scheduler and sender delivery verification; not a user preference.';
