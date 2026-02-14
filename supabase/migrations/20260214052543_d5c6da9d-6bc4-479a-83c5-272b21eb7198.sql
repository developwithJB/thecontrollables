
CREATE OR REPLACE FUNCTION public.compute_build_scores(p_assessment_id uuid)
 RETURNS build_scores
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_awareness numeric(3,2);
  v_perspective numeric(3,2);
  v_habit numeric(3,2);
  v_wellness numeric(3,2);
  v_environment numeric(3,2);
  v_overall numeric(3,2);
  v_archetype text;
  v_result public.build_scores;
  v_max_score numeric(3,2);
  v_min_score numeric(3,2);
  v_max_controllable text;
  v_min_controllable text;
BEGIN
  SELECT * INTO v_result FROM public.build_scores WHERE assessment_id = p_assessment_id;
  IF FOUND THEN
    RETURN v_result;
  END IF;

  SELECT user_id INTO v_user_id FROM public.build_assessments WHERE id = p_assessment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  SELECT 
    COALESCE(AVG(CASE WHEN q.controllable = 'awareness' THEN a.score END), 0),
    COALESCE(AVG(CASE WHEN q.controllable = 'perspective' THEN a.score END), 0),
    COALESCE(AVG(CASE WHEN q.controllable = 'habit' THEN a.score END), 0),
    COALESCE(AVG(CASE WHEN q.controllable = 'wellness' THEN a.score END), 0),
    COALESCE(AVG(CASE WHEN q.controllable = 'environment' THEN a.score END), 0)
  INTO v_awareness, v_perspective, v_habit, v_wellness, v_environment
  FROM public.build_answers a
  JOIN public.build_questions q ON q.id = a.question_id
  WHERE a.assessment_id = p_assessment_id;

  v_overall := (v_awareness + v_perspective + v_habit + v_wellness + v_environment) / 5;

  v_max_score := GREATEST(v_awareness, v_perspective, v_habit, v_wellness, v_environment);
  v_min_score := LEAST(v_awareness, v_perspective, v_habit, v_wellness, v_environment);
  
  v_max_controllable := CASE v_max_score
    WHEN v_habit THEN 'habit'
    WHEN v_awareness THEN 'awareness'
    WHEN v_wellness THEN 'wellness'
    WHEN v_perspective THEN 'perspective'
    ELSE 'environment'
  END;
  
  v_min_controllable := CASE v_min_score
    WHEN v_wellness THEN 'wellness'
    WHEN v_environment THEN 'environment'
    WHEN v_habit THEN 'habit'
    WHEN v_awareness THEN 'awareness'
    ELSE 'perspective'
  END;

  -- Assign archetype based on comprehensive rules
  IF v_awareness >= 3.0 AND v_perspective >= 3.0 AND v_habit >= 3.0 AND v_wellness >= 3.0 AND v_environment >= 3.0 THEN
    v_archetype := 'stable_build';
  ELSIF v_overall <= 1.5 THEN
    v_archetype := 'momentum_rebooting';
  -- habit is strongest
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'wellness' THEN
    v_archetype := 'driven_but_depleting';
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'awareness' THEN
    v_archetype := 'grind_mode';
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'perspective' THEN
    v_archetype := 'tunnel_vision';
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'environment' THEN
    v_archetype := 'high_friction_zone';
  -- awareness is strongest
  ELSIF v_max_controllable = 'awareness' AND v_min_controllable = 'wellness' THEN
    v_archetype := 'low_battery_mode';
  ELSIF v_max_controllable = 'awareness' AND v_min_controllable = 'habit' THEN
    v_archetype := 'scattered_focus';
  ELSIF v_max_controllable = 'awareness' AND v_min_controllable = 'perspective' THEN
    v_archetype := 'tunnel_vision';
  ELSIF v_max_controllable = 'awareness' AND v_min_controllable = 'environment' THEN
    v_archetype := 'clear_but_fighting_friction';
  -- perspective is strongest
  ELSIF v_max_controllable = 'perspective' AND v_min_controllable = 'wellness' THEN
    v_archetype := 'low_battery_mode';
  ELSIF v_max_controllable = 'perspective' AND v_min_controllable = 'habit' THEN
    v_archetype := 'capable_but_inconsistent';
  ELSIF v_max_controllable = 'perspective' AND v_min_controllable = 'awareness' THEN
    v_archetype := 'strong_foundation';
  ELSIF v_max_controllable = 'perspective' AND v_min_controllable = 'environment' THEN
    v_archetype := 'clear_but_fighting_friction';
  -- wellness is strongest
  ELSIF v_max_controllable = 'wellness' AND v_min_controllable = 'habit' THEN
    v_archetype := 'capable_but_inconsistent';
  ELSIF v_max_controllable = 'wellness' AND v_min_controllable = 'awareness' THEN
    v_archetype := 'strong_foundation';
  ELSIF v_max_controllable = 'wellness' AND v_min_controllable = 'perspective' THEN
    v_archetype := 'strong_foundation';
  ELSIF v_max_controllable = 'wellness' AND v_min_controllable = 'environment' THEN
    v_archetype := 'overclocked';
  -- environment is strongest
  ELSIF v_max_controllable = 'environment' AND v_min_controllable = 'habit' THEN
    v_archetype := 'scattered_focus';
  ELSIF v_max_controllable = 'environment' AND v_min_controllable = 'awareness' THEN
    v_archetype := 'grind_mode';
  ELSIF v_max_controllable = 'environment' AND v_min_controllable = 'perspective' THEN
    v_archetype := 'grind_mode';
  ELSIF v_max_controllable = 'environment' AND v_min_controllable = 'wellness' THEN
    v_archetype := 'driven_but_depleting';
  ELSE
    v_archetype := 'unmapped_pattern';
  END IF;

  INSERT INTO public.build_scores (
    assessment_id, user_id, awareness, perspective, habit, wellness, environment, overall, build_archetype_key
  ) VALUES (
    p_assessment_id, v_user_id, v_awareness, v_perspective, v_habit, v_wellness, v_environment, v_overall, v_archetype
  )
  RETURNING * INTO v_result;

  INSERT INTO public.user_build_current (
    user_id, awareness, perspective, habit, wellness, environment, overall, build_archetype_key, last_assessment_id, updated_at
  ) VALUES (
    v_user_id, v_awareness, v_perspective, v_habit, v_wellness, v_environment, v_overall, v_archetype, p_assessment_id, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    awareness = EXCLUDED.awareness,
    perspective = EXCLUDED.perspective,
    habit = EXCLUDED.habit,
    wellness = EXCLUDED.wellness,
    environment = EXCLUDED.environment,
    overall = EXCLUDED.overall,
    build_archetype_key = EXCLUDED.build_archetype_key,
    last_assessment_id = EXCLUDED.last_assessment_id,
    updated_at = now();

  RETURN v_result;
END;
$function$;
