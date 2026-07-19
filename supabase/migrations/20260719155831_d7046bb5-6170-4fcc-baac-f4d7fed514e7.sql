CREATE TABLE IF NOT EXISTS public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  local_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  source_type text NOT NULL CHECK (source_type IN (
    'manual', 'mission', 'planner', 'calendar', 'wearable', 'meal',
    'promise', 'daily_practice', 'goal', 'wellness', 'awareness'
  )),
  source_id text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  private_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring_status text NOT NULL DEFAULT 'scored' CHECK (scoring_status IN (
    'scored', 'neutral', 'needs_confirmation', 'excluded'
  )),
  confidence numeric(4,3) NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'anonymous', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, event_type)
);

CREATE INDEX IF NOT EXISTS timeline_events_user_date_idx
  ON public.timeline_events (user_id, local_date DESC, occurred_at DESC);

CREATE INDEX IF NOT EXISTS timeline_events_source_idx
  ON public.timeline_events (source_type, source_id);

CREATE TABLE IF NOT EXISTS public.timeline_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  controllable text NOT NULL CHECK (controllable IN (
    'awareness', 'perspective', 'habit', 'wellness', 'environment'
  )),
  delta smallint NOT NULL CHECK (delta BETWEEN -3 AND 5),
  reason_code text NOT NULL,
  explanation text NOT NULL,
  rule_version text NOT NULL DEFAULT 'v1',
  confidence numeric(4,3) NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  user_overridden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, controllable)
);

CREATE INDEX IF NOT EXISTS timeline_impacts_event_idx
  ON public.timeline_impacts (event_id);

CREATE TABLE IF NOT EXISTS public.daily_charge_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charge_date date NOT NULL,
  overall_score smallint NOT NULL DEFAULT 50 CHECK (overall_score BETWEEN 0 AND 100),
  net_impact integer NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  category_scores jsonb NOT NULL DEFAULT '{
    "awareness": 50,
    "perspective": 50,
    "habit": 50,
    "wellness": 50,
    "environment": 50
  }'::jsonb,
  rule_version text NOT NULL DEFAULT 'v1',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, charge_date)
);

CREATE INDEX IF NOT EXISTS daily_charge_snapshots_user_date_idx
  ON public.daily_charge_snapshots (user_id, charge_date DESC);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_charge_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own timeline events"
  ON public.timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create manual timeline events"
  ON public.timeline_events FOR INSERT
  WITH CHECK (auth.uid() = user_id AND source_type = 'manual');

CREATE POLICY "Users can update their own timeline events"
  ON public.timeline_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual timeline events"
  ON public.timeline_events FOR DELETE
  USING (auth.uid() = user_id AND source_type = 'manual');

CREATE POLICY "Users can read their own timeline impacts"
  ON public.timeline_impacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.timeline_events event
      WHERE event.id = timeline_impacts.event_id AND event.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own daily charge snapshots"
  ON public.daily_charge_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timeline_impacts_updated_at
  BEFORE UPDATE ON public.timeline_impacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.timeline_user_timezone(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT timezone FROM public.profiles WHERE id = target_user_id),
    'UTC'
  );
$$;

REVOKE ALL ON FUNCTION public.timeline_user_timezone(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.refresh_daily_charge_snapshot(
  target_user_id uuid,
  target_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_delta integer := 0;
  scored_events integer := 0;
  awareness_delta integer := 0;
  perspective_delta integer := 0;
  habit_delta integer := 0;
  wellness_delta integer := 0;
  environment_delta integer := 0;
BEGIN
  SELECT
    COALESCE(SUM(impact.delta), 0)::integer,
    COUNT(DISTINCT event.id)::integer,
    COALESCE(SUM(impact.delta) FILTER (WHERE impact.controllable = 'awareness'), 0)::integer,
    COALESCE(SUM(impact.delta) FILTER (WHERE impact.controllable = 'perspective'), 0)::integer,
    COALESCE(SUM(impact.delta) FILTER (WHERE impact.controllable = 'habit'), 0)::integer,
    COALESCE(SUM(impact.delta) FILTER (WHERE impact.controllable = 'wellness'), 0)::integer,
    COALESCE(SUM(impact.delta) FILTER (WHERE impact.controllable = 'environment'), 0)::integer
  INTO
    total_delta,
    scored_events,
    awareness_delta,
    perspective_delta,
    habit_delta,
    wellness_delta,
    environment_delta
  FROM public.timeline_events event
  LEFT JOIN public.timeline_impacts impact ON impact.event_id = event.id
  WHERE event.user_id = target_user_id
    AND event.local_date = target_date
    AND event.scoring_status = 'scored';

  INSERT INTO public.daily_charge_snapshots (
    user_id,
    charge_date,
    overall_score,
    net_impact,
    event_count,
    category_scores,
    rule_version,
    calculated_at
  ) VALUES (
    target_user_id,
    target_date,
    LEAST(100, GREATEST(0, 50 + LEAST(50, GREATEST(-20, total_delta)))),
    total_delta,
    scored_events,
    jsonb_build_object(
      'awareness', LEAST(100, GREATEST(0, 50 + LEAST(20, GREATEST(-10, awareness_delta)))),
      'perspective', LEAST(100, GREATEST(0, 50 + LEAST(20, GREATEST(-10, perspective_delta)))),
      'habit', LEAST(100, GREATEST(0, 50 + LEAST(20, GREATEST(-10, habit_delta)))),
      'wellness', LEAST(100, GREATEST(0, 50 + LEAST(20, GREATEST(-10, wellness_delta)))),
      'environment', LEAST(100, GREATEST(0, 50 + LEAST(20, GREATEST(-10, environment_delta))))
    ),
    'v1',
    now()
  )
  ON CONFLICT (user_id, charge_date) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    net_impact = EXCLUDED.net_impact,
    event_count = EXCLUDED.event_count,
    category_scores = EXCLUDED.category_scores,
    rule_version = EXCLUDED.rule_version,
    calculated_at = EXCLUDED.calculated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_daily_charge_snapshot(uuid, date) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.refresh_timeline_snapshot_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_daily_charge_snapshot(OLD.user_id, OLD.local_date);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.user_id <> NEW.user_id OR OLD.local_date <> NEW.local_date) THEN
    PERFORM public.refresh_daily_charge_snapshot(OLD.user_id, OLD.local_date);
  END IF;

  PERFORM public.refresh_daily_charge_snapshot(NEW.user_id, NEW.local_date);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_timeline_snapshot_from_impact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event_id uuid;
  target_user_id uuid;
  target_date date;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  SELECT user_id, local_date INTO target_user_id, target_date
  FROM public.timeline_events
  WHERE id = target_event_id;

  IF target_user_id IS NOT NULL THEN
    PERFORM public.refresh_daily_charge_snapshot(target_user_id, target_date);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_timeline_snapshot_on_event
  AFTER INSERT OR UPDATE OR DELETE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.refresh_timeline_snapshot_from_event();

CREATE TRIGGER refresh_timeline_snapshot_on_impact
  AFTER INSERT OR UPDATE OR DELETE ON public.timeline_impacts
  FOR EACH ROW EXECUTE FUNCTION public.refresh_timeline_snapshot_from_impact();

CREATE OR REPLACE FUNCTION public.upsert_timeline_source_event(
  target_user_id uuid,
  target_source_type text,
  target_source_id text,
  target_event_type text,
  target_title text,
  target_occurred_at timestamptz,
  target_local_date date,
  target_timezone text,
  target_scoring_status text,
  target_confidence numeric,
  target_metadata jsonb,
  target_impacts jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event_id uuid;
  impact jsonb;
BEGIN
  INSERT INTO public.timeline_events (
    user_id,
    occurred_at,
    recorded_at,
    local_date,
    timezone,
    source_type,
    source_id,
    event_type,
    title,
    private_metadata,
    scoring_status,
    confidence
  ) VALUES (
    target_user_id,
    target_occurred_at,
    now(),
    target_local_date,
    target_timezone,
    target_source_type,
    target_source_id,
    target_event_type,
    target_title,
    COALESCE(target_metadata, '{}'::jsonb),
    target_scoring_status,
    target_confidence
  )
  ON CONFLICT (user_id, source_type, source_id, event_type) DO UPDATE SET
    occurred_at = EXCLUDED.occurred_at,
    recorded_at = now(),
    local_date = EXCLUDED.local_date,
    timezone = EXCLUDED.timezone,
    title = EXCLUDED.title,
    private_metadata = public.timeline_events.private_metadata || EXCLUDED.private_metadata,
    scoring_status = CASE
      WHEN public.timeline_events.scoring_status = 'excluded' THEN 'excluded'
      ELSE EXCLUDED.scoring_status
    END,
    confidence = EXCLUDED.confidence
  RETURNING id INTO target_event_id;

  DELETE FROM public.timeline_impacts
  WHERE timeline_impacts.event_id = target_event_id
    AND user_overridden = false;

  FOR impact IN SELECT value FROM jsonb_array_elements(COALESCE(target_impacts, '[]'::jsonb))
  LOOP
    INSERT INTO public.timeline_impacts (
      event_id,
      controllable,
      delta,
      reason_code,
      explanation,
      rule_version,
      confidence,
      user_overridden
    ) VALUES (
      target_event_id,
      impact->>'controllable',
      (impact->>'delta')::smallint,
      impact->>'reason_code',
      impact->>'explanation',
      COALESCE(impact->>'rule_version', 'v1'),
      COALESCE((impact->>'confidence')::numeric, target_confidence),
      false
    )
    ON CONFLICT (event_id, controllable) DO UPDATE SET
      delta = EXCLUDED.delta,
      reason_code = EXCLUDED.reason_code,
      explanation = EXCLUDED.explanation,
      rule_version = EXCLUDED.rule_version,
      confidence = EXCLUDED.confidence,
      updated_at = now()
    WHERE public.timeline_impacts.user_overridden = false;
  END LOOP;

  PERFORM public.refresh_daily_charge_snapshot(target_user_id, target_local_date);
  RETURN target_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_timeline_source_event(
  uuid, text, text, text, text, timestamptz, date, text, text, numeric, jsonb, jsonb
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.create_manual_timeline_event(
  event_title text,
  event_type text,
  target_controllable text,
  occurred_at timestamptz,
  local_date date,
  timezone text DEFAULT 'UTC'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  impact_delta smallint;
  impact_reason text;
  impact_explanation text;
  new_event_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(trim(event_title)) < 1 OR length(event_title) > 120 THEN
    RAISE EXCEPTION 'Event title must be between 1 and 120 characters';
  END IF;
  IF target_controllable NOT IN ('awareness', 'perspective', 'habit', 'wellness', 'environment') THEN
    RAISE EXCEPTION 'Invalid Controllable';
  END IF;

  impact_delta := CASE event_type
    WHEN 'workout' THEN 2
    WHEN 'promise_kept' THEN 3
    WHEN 'recovery' THEN 2
    WHEN 'environment_reset' THEN 2
    WHEN 'reflection' THEN 1
    ELSE 0
  END;
  impact_reason := CASE event_type
    WHEN 'workout' THEN 'manual_workout'
    WHEN 'promise_kept' THEN 'manual_promise_kept'
    WHEN 'recovery' THEN 'manual_recovery'
    WHEN 'environment_reset' THEN 'manual_environment_reset'
    WHEN 'reflection' THEN 'manual_reflection'
    ELSE 'manual_neutral'
  END;
  impact_explanation := CASE event_type
    WHEN 'workout' THEN 'You completed a real-world training rep.'
    WHEN 'promise_kept' THEN 'You followed through on a promise you chose.'
    WHEN 'recovery' THEN 'You protected your capacity before demanding more.'
    WHEN 'environment_reset' THEN 'You improved the conditions around you.'
    WHEN 'reflection' THEN 'You paused long enough to notice what is true.'
    ELSE 'This moment is recorded without judging it.'
  END;

  INSERT INTO public.timeline_events (
    user_id,
    occurred_at,
    local_date,
    timezone,
    source_type,
    source_id,
    event_type,
    title,
    scoring_status,
    confidence
  ) VALUES (
    current_user_id,
    occurred_at,
    local_date,
    timezone,
    'manual',
    gen_random_uuid()::text,
    event_type,
    trim(event_title),
    CASE WHEN impact_delta = 0 THEN 'needs_confirmation' ELSE 'scored' END,
    1
  ) RETURNING id INTO new_event_id;

  IF impact_delta <> 0 THEN
    INSERT INTO public.timeline_impacts (
      event_id,
      controllable,
      delta,
      reason_code,
      explanation,
      user_overridden
    ) VALUES (
      new_event_id,
      target_controllable,
      impact_delta,
      impact_reason,
      impact_explanation,
      true
    );
  END IF;

  RETURN new_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_manual_timeline_event(
  text, text, text, timestamptz, date, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.assess_timeline_event(
  target_event_id uuid,
  assessment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  target_event public.timeline_events%ROWTYPE;
  assessment_delta smallint;
BEGIN
  IF assessment NOT IN ('supported', 'neutral', 'worked_against_plan') THEN
    RAISE EXCEPTION 'Invalid assessment';
  END IF;

  SELECT * INTO target_event
  FROM public.timeline_events
  WHERE id = target_event_id AND user_id = current_user_id;

  IF target_event.id IS NULL THEN
    RAISE EXCEPTION 'Timeline event not found';
  END IF;
  IF target_event.event_type NOT IN ('meal_logged', 'meal', 'planner_skipped', 'promise_unkept', 'manual_note') THEN
    RAISE EXCEPTION 'This event does not support assessment';
  END IF;

  DELETE FROM public.timeline_impacts
  WHERE event_id = target_event_id AND user_overridden = true;

  assessment_delta := CASE assessment
    WHEN 'supported' THEN 1
    WHEN 'worked_against_plan' THEN -2
    ELSE 0
  END;

  IF assessment_delta <> 0 THEN
    INSERT INTO public.timeline_impacts (
      event_id,
      controllable,
      delta,
      reason_code,
      explanation,
      user_overridden
    ) VALUES (
      target_event_id,
      CASE
        WHEN target_event.event_type IN ('planner_skipped', 'promise_unkept') THEN 'habit'
        ELSE 'wellness'
      END,
      assessment_delta,
      'user_assessment',
      CASE assessment
        WHEN 'supported' THEN 'You confirmed this moment supported the plan.'
        ELSE 'You confirmed this moment worked against the plan you chose.'
      END,
      true
    );
  END IF;

  UPDATE public.timeline_events
  SET
    scoring_status = CASE WHEN assessment = 'neutral' THEN 'neutral' ELSE 'scored' END,
    private_metadata = private_metadata || jsonb_build_object('user_assessment', assessment)
  WHERE id = target_event_id;

  PERFORM public.refresh_daily_charge_snapshot(target_event.user_id, target_event.local_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assess_timeline_event(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_completed_action_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  target_controllable text;
BEGIN
  target_controllable := CASE lower(COALESCE(NEW.controllable, ''))
    WHEN 'awareness' THEN 'awareness'
    WHEN 'perspective' THEN 'perspective'
    WHEN 'habit' THEN 'habit'
    WHEN 'wellness' THEN 'wellness'
    WHEN 'environment' THEN 'environment'
    ELSE 'habit'
  END;

  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    CASE WHEN lower(NEW.action_text) LIKE '%mission%' THEN 'mission' ELSE 'daily_practice' END,
    NEW.id::text,
    CASE WHEN lower(NEW.action_text) LIKE '%mission%' THEN 'mission_completed' ELSE 'action_completed' END,
    NEW.action_text,
    NEW.completed_at,
    (NEW.completed_at AT TIME ZONE user_timezone)::date,
    user_timezone,
    'scored',
    1,
    jsonb_build_object('xp_awarded', NEW.xp_awarded),
    jsonb_build_array(jsonb_build_object(
      'controllable', target_controllable,
      'delta', CASE WHEN lower(NEW.action_text) LIKE '%mission%' THEN 3 ELSE 2 END,
      'reason_code', CASE WHEN lower(NEW.action_text) LIKE '%mission%' THEN 'mission_completed' ELSE 'action_completed' END,
      'explanation', CASE WHEN lower(NEW.action_text) LIKE '%mission%'
        THEN 'You completed the mission you chose for today.'
        ELSE 'You completed a real rep in this Controllable.'
      END
    ))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_completed_action_to_timeline
  AFTER INSERT OR UPDATE ON public.completed_actions
  FOR EACH ROW EXECUTE FUNCTION public.sync_completed_action_timeline();

CREATE OR REPLACE FUNCTION public.sync_planner_item_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  event_time timestamptz;
BEGIN
  IF NEW.status = 'done' THEN
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type IN ('planner', 'calendar')
      AND source_id = NEW.id::text
      AND (
        event_type = 'planner_skipped'
        OR source_type <> CASE WHEN NEW.external_event_id IS NULL THEN 'planner' ELSE 'calendar' END
      );
    event_time := COALESCE(NEW.completed_at, NEW.updated_at);
    PERFORM public.upsert_timeline_source_event(
      NEW.user_id,
      CASE WHEN NEW.external_event_id IS NULL THEN 'planner' ELSE 'calendar' END,
      NEW.id::text,
      'planner_completed',
      NEW.title,
      event_time,
      NEW.scheduled_date,
      user_timezone,
      'scored',
      1,
      jsonb_build_object('item_type', NEW.item_type),
      jsonb_build_array(jsonb_build_object(
        'controllable', 'habit',
        'delta', 1,
        'reason_code', 'planner_completed',
        'explanation', 'You completed something you intentionally planned.'
      ))
    );
  ELSIF NEW.status = 'skipped' THEN
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type IN ('planner', 'calendar')
      AND source_id = NEW.id::text
      AND (
        event_type = 'planner_completed'
        OR source_type <> CASE WHEN NEW.external_event_id IS NULL THEN 'planner' ELSE 'calendar' END
      );
    event_time := COALESCE(NEW.skipped_at, NEW.updated_at);
    PERFORM public.upsert_timeline_source_event(
      NEW.user_id,
      CASE WHEN NEW.external_event_id IS NULL THEN 'planner' ELSE 'calendar' END,
      NEW.id::text,
      'planner_skipped',
      'Plan changed',
      event_time,
      NEW.scheduled_date,
      user_timezone,
      'needs_confirmation',
      0.75,
      jsonb_build_object('item_type', NEW.item_type),
      '[]'::jsonb
    );
  ELSE
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type IN ('planner', 'calendar')
      AND source_id = NEW.id::text AND event_type IN ('planner_completed', 'planner_skipped');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_planner_item_to_timeline
  AFTER INSERT OR UPDATE ON public.planner_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_planner_item_timeline();

CREATE OR REPLACE FUNCTION public.sync_integrity_log_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'promise',
    NEW.id::text,
    'promise_made',
    'Promise set',
    NEW.promised_at,
    (NEW.promised_at AT TIME ZONE user_timezone)::date,
    user_timezone,
    'neutral',
    1,
    '{}'::jsonb,
    '[]'::jsonb
  );

  IF NEW.kept = true THEN
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type = 'promise'
      AND source_id = NEW.id::text AND event_type = 'promise_unkept';
    PERFORM public.upsert_timeline_source_event(
      NEW.user_id,
      'promise',
      NEW.id::text,
      'promise_kept',
      'Promise kept',
      COALESCE(NEW.kept_at, now()),
      (COALESCE(NEW.kept_at, now()) AT TIME ZONE user_timezone)::date,
      user_timezone,
      'scored',
      1,
      '{}'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'controllable', 'habit',
        'delta', 3,
        'reason_code', 'promise_kept',
        'explanation', 'You followed through on a promise you chose.'
      ))
    );
  ELSIF NEW.kept = false THEN
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type = 'promise'
      AND source_id = NEW.id::text AND event_type = 'promise_kept';
    PERFORM public.upsert_timeline_source_event(
      NEW.user_id,
      'promise',
      NEW.id::text,
      'promise_unkept',
      'Promise needs a read',
      COALESCE(NEW.kept_at, NEW.promised_at),
      (COALESCE(NEW.kept_at, NEW.promised_at) AT TIME ZONE user_timezone)::date,
      user_timezone,
      'needs_confirmation',
      1,
      '{}'::jsonb,
      '[]'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_integrity_log_to_timeline
  AFTER INSERT OR UPDATE ON public.integrity_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_integrity_log_timeline();

CREATE OR REPLACE FUNCTION public.sync_meal_log_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'meal',
    NEW.id::text,
    'meal_logged',
    initcap(NEW.meal_type) || ' logged',
    NEW.created_at,
    NEW.log_date,
    user_timezone,
    'needs_confirmation',
    1,
    jsonb_build_object(
      'has_description', NEW.description IS NOT NULL,
      'has_image', NEW.image_path IS NOT NULL
    ),
    '[]'::jsonb
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_meal_log_to_timeline
  AFTER INSERT OR UPDATE ON public.meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_meal_log_timeline();

CREATE OR REPLACE FUNCTION public.sync_whoop_workout_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  event_time timestamptz := COALESCE(NEW.start_time, NEW.created_at);
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'wearable',
    'whoop_workout:' || NEW.whoop_id,
    'workout',
    COALESCE(NULLIF(initcap(NEW.activity_type), ''), 'Workout'),
    event_time,
    (event_time AT TIME ZONE user_timezone)::date,
    user_timezone,
    'scored',
    0.98,
    jsonb_build_object('provider', 'whoop', 'strain', NEW.strain),
    jsonb_build_array(
      jsonb_build_object(
        'controllable', 'habit',
        'delta', 2,
        'reason_code', 'workout_completed',
        'explanation', 'You showed up for a physical training rep.'
      ),
      jsonb_build_object(
        'controllable', 'wellness',
        'delta', 2,
        'reason_code', 'movement_completed',
        'explanation', 'Movement supported your physical capacity.'
      )
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_whoop_workout_to_timeline
  AFTER INSERT OR UPDATE ON public.whoop_workouts
  FOR EACH ROW EXECUTE FUNCTION public.sync_whoop_workout_timeline();

CREATE OR REPLACE FUNCTION public.sync_whoop_recovery_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  event_time timestamptz := COALESCE(NEW.recorded_at, NEW.created_at);
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'wearable',
    'whoop_recovery:' || NEW.whoop_id,
    'recovery_recorded',
    'Recovery recorded',
    event_time,
    (event_time AT TIME ZONE user_timezone)::date,
    user_timezone,
    'neutral',
    0.98,
    jsonb_build_object('provider', 'whoop', 'recovery_score', NEW.recovery_score),
    '[]'::jsonb
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_whoop_recovery_to_timeline
  AFTER INSERT OR UPDATE ON public.whoop_recoveries
  FOR EACH ROW EXECUTE FUNCTION public.sync_whoop_recovery_timeline();

CREATE OR REPLACE FUNCTION public.sync_whoop_sleep_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  event_time timestamptz := COALESCE(NEW.end_time, NEW.created_at);
  sleep_delta smallint := CASE
    WHEN NEW.sleep_performance_pct >= 85 THEN 3
    WHEN NEW.sleep_performance_pct >= 70 THEN 1
    ELSE 0
  END;
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'wearable',
    'whoop_sleep:' || NEW.whoop_id,
    'sleep_recorded',
    'Sleep recorded',
    event_time,
    (event_time AT TIME ZONE user_timezone)::date,
    user_timezone,
    CASE WHEN sleep_delta > 0 THEN 'scored' ELSE 'neutral' END,
    0.98,
    jsonb_build_object('provider', 'whoop', 'sleep_performance_pct', NEW.sleep_performance_pct),
    CASE WHEN sleep_delta > 0 THEN jsonb_build_array(jsonb_build_object(
      'controllable', 'wellness',
      'delta', sleep_delta,
      'reason_code', 'sleep_target',
      'explanation', CASE WHEN sleep_delta = 3
        THEN 'Your sleep met the recovery target.'
        ELSE 'Your sleep supported some recovery capacity.'
      END
    )) ELSE '[]'::jsonb END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_whoop_sleep_to_timeline
  AFTER INSERT OR UPDATE ON public.whoop_sleeps
  FOR EACH ROW EXECUTE FUNCTION public.sync_whoop_sleep_timeline();

CREATE OR REPLACE FUNCTION public.sync_daily_ring_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  impacts jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'controllable', move.controllable,
    'delta', 1,
    'reason_code', 'daily_practice',
    'explanation', move.explanation
  )), '[]'::jsonb)
  INTO impacts
  FROM (VALUES
    ('awareness', NEW.notice_completed, 'You named what was true.'),
    ('perspective', NEW.choose_completed, 'You chose a more useful perspective.'),
    ('habit', NEW.prove_completed, 'You completed the promise move.'),
    ('environment', NEW.align_completed, 'You adjusted the conditions around you.'),
    ('wellness', NEW.charge_completed, 'You protected your physical capacity.')
  ) AS move(controllable, completed, explanation)
  WHERE move.completed = true;

  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'daily_practice',
    NEW.id::text,
    'daily_practice',
    'Daily Charge practice',
    NEW.updated_at,
    NEW.ring_date,
    user_timezone,
    CASE WHEN jsonb_array_length(impacts) > 0 THEN 'scored' ELSE 'neutral' END,
    1,
    '{}'::jsonb,
    impacts
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_daily_ring_to_timeline
  AFTER INSERT OR UPDATE ON public.daily_rings
  FOR EACH ROW EXECUTE FUNCTION public.sync_daily_ring_timeline();

CREATE OR REPLACE FUNCTION public.sync_dated_goal_log_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  wellness_delta smallint := (CASE WHEN NEW.strength_completed THEN 1 ELSE 0 END)
    + (CASE WHEN NEW.fueling_completed = true THEN 1 ELSE 0 END);
  impacts jsonb := '[]'::jsonb;
BEGIN
  IF NEW.status IN ('completed', 'modified') THEN
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type = 'goal'
      AND source_id = NEW.id::text AND event_type = 'planner_skipped';
    impacts := jsonb_build_array(jsonb_build_object(
      'controllable', 'habit',
      'delta', CASE WHEN NEW.status = 'completed' THEN 2 ELSE 1 END,
      'reason_code', 'goal_training_logged',
      'explanation', CASE WHEN NEW.status = 'completed'
        THEN 'You completed the work assigned to your dated goal.'
        ELSE 'You adapted the plan and still completed an honest rep.'
      END
    ));
    IF wellness_delta > 0 THEN
      impacts := impacts || jsonb_build_array(jsonb_build_object(
        'controllable', 'wellness',
        'delta', wellness_delta,
        'reason_code', 'goal_recovery_support',
        'explanation', 'You supported the work with strength or fueling.'
      ));
    END IF;

    PERFORM public.upsert_timeline_source_event(
      NEW.user_id,
      'goal',
      NEW.id::text,
      'goal_training',
      initcap(NEW.session_type) || ' session logged',
      NEW.updated_at,
      NEW.log_date,
      user_timezone,
      'scored',
      1,
      jsonb_build_object('status', NEW.status, 'actual_miles', NEW.actual_miles),
      impacts
    );
  ELSE
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type = 'goal'
      AND source_id = NEW.id::text AND event_type = 'goal_training';
    PERFORM public.upsert_timeline_source_event(
      NEW.user_id,
      'goal',
      NEW.id::text,
      'planner_skipped',
      'Training plan changed',
      NEW.updated_at,
      NEW.log_date,
      user_timezone,
      'needs_confirmation',
      1,
      jsonb_build_object('session_type', NEW.session_type),
      '[]'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_dated_goal_log_to_timeline
  AFTER INSERT OR UPDATE ON public.dated_goal_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_dated_goal_log_timeline();

CREATE OR REPLACE FUNCTION public.sync_notice_entry_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'awareness',
    NEW.id::text,
    'awareness_checkin',
    'Awareness check-in',
    NEW.created_at,
    NEW.entry_date,
    user_timezone,
    'scored',
    1,
    jsonb_build_object('mood', NEW.mood, 'energy_level', NEW.energy_level, 'stress_level', NEW.stress_level),
    jsonb_build_array(jsonb_build_object(
      'controllable', 'awareness',
      'delta', 1,
      'reason_code', 'truth_named',
      'explanation', 'You paused to name what was true.'
    ))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_notice_entry_to_timeline
  AFTER INSERT OR UPDATE ON public.notice_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_notice_entry_timeline();

CREATE OR REPLACE FUNCTION public.sync_health_summary_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
  event_time timestamptz := (NEW.sync_date::timestamp + time '07:00') AT TIME ZONE user_timezone;
  sleep_delta smallint := CASE
    WHEN NEW.sleep_minutes >= 480 THEN 3
    WHEN NEW.sleep_minutes >= 420 THEN 1
    ELSE 0
  END;
BEGIN
  IF lower(NEW.source) = 'whoop' OR NEW.sleep_minutes IS NULL THEN
    DELETE FROM public.timeline_events
    WHERE user_id = NEW.user_id AND source_type = 'wearable'
      AND source_id = 'health_summary:' || NEW.id::text AND event_type = 'sleep_recorded';
    RETURN NEW;
  END IF;

  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'wearable',
    'health_summary:' || NEW.id::text,
    'sleep_recorded',
    'Sleep recorded',
    event_time,
    NEW.sync_date,
    user_timezone,
    CASE WHEN sleep_delta > 0 THEN 'scored' ELSE 'neutral' END,
    0.9,
    jsonb_build_object('provider', NEW.source, 'sleep_minutes', NEW.sleep_minutes),
    CASE WHEN sleep_delta > 0 THEN jsonb_build_array(jsonb_build_object(
      'controllable', 'wellness',
      'delta', sleep_delta,
      'reason_code', 'sleep_target',
      'explanation', CASE WHEN sleep_delta = 3
        THEN 'Your sleep met the recovery target.'
        ELSE 'Your sleep supported some recovery capacity.'
      END
    )) ELSE '[]'::jsonb END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_health_summary_to_timeline
  AFTER INSERT OR UPDATE ON public.health_sync_data
  FOR EACH ROW EXECUTE FUNCTION public.sync_health_summary_timeline();

CREATE OR REPLACE FUNCTION public.sync_wellness_log_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_timezone text := public.timeline_user_timezone(NEW.user_id);
BEGIN
  PERFORM public.upsert_timeline_source_event(
    NEW.user_id,
    'wellness',
    NEW.id::text,
    'wellness_checkin',
    'Wellness check-in',
    NEW.created_at,
    NEW.log_date,
    user_timezone,
    'scored',
    1,
    jsonb_build_object(
      'sleep_rating', NEW.sleep_rating,
      'movement_rating', NEW.movement_rating,
      'nutrition_rating', NEW.nutrition_rating
    ),
    jsonb_build_array(jsonb_build_object(
      'controllable', 'awareness',
      'delta', 1,
      'reason_code', 'body_truth_named',
      'explanation', 'You checked in with what your body was actually saying.'
    ))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_wellness_log_to_timeline
  AFTER INSERT OR UPDATE ON public.wellness_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_wellness_log_timeline();

CREATE OR REPLACE FUNCTION public.delete_timeline_events_for_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.timeline_events
  WHERE user_id = OLD.user_id
    AND source_id = COALESCE(TG_ARGV[1], '') || COALESCE(to_jsonb(OLD)->>'whoop_id', OLD.id::text)
    AND source_type = ANY(string_to_array(TG_ARGV[0], ','));
  RETURN OLD;
END;
$$;

CREATE TRIGGER delete_completed_action_timeline
  AFTER DELETE ON public.completed_actions
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('mission,daily_practice');

CREATE TRIGGER delete_planner_item_timeline
  AFTER DELETE ON public.planner_items
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('planner,calendar');

CREATE TRIGGER delete_integrity_log_timeline
  AFTER DELETE ON public.integrity_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('promise');

CREATE TRIGGER delete_meal_log_timeline
  AFTER DELETE ON public.meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('meal');

CREATE TRIGGER delete_whoop_workout_timeline
  AFTER DELETE ON public.whoop_workouts
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('wearable', 'whoop_workout:');

CREATE TRIGGER delete_whoop_recovery_timeline
  AFTER DELETE ON public.whoop_recoveries
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('wearable', 'whoop_recovery:');

CREATE TRIGGER delete_whoop_sleep_timeline
  AFTER DELETE ON public.whoop_sleeps
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('wearable', 'whoop_sleep:');

CREATE TRIGGER delete_daily_ring_timeline
  AFTER DELETE ON public.daily_rings
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('daily_practice');

CREATE TRIGGER delete_dated_goal_log_timeline
  AFTER DELETE ON public.dated_goal_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('goal');

CREATE TRIGGER delete_notice_entry_timeline
  AFTER DELETE ON public.notice_entries
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('awareness');

CREATE TRIGGER delete_health_summary_timeline
  AFTER DELETE ON public.health_sync_data
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('wearable', 'health_summary:');

CREATE TRIGGER delete_wellness_log_timeline
  AFTER DELETE ON public.wellness_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_timeline_events_for_source('wellness');

UPDATE public.completed_actions
SET action_text = action_text
WHERE completed_at >= now() - interval '30 days';

UPDATE public.integrity_logs
SET promise_text = promise_text
WHERE promised_at >= now() - interval '30 days';

UPDATE public.meal_logs
SET meal_type = meal_type
WHERE created_at >= now() - interval '30 days';

UPDATE public.whoop_workouts
SET whoop_id = whoop_id
WHERE COALESCE(start_time, created_at) >= now() - interval '30 days';

UPDATE public.whoop_recoveries
SET whoop_id = whoop_id
WHERE COALESCE(recorded_at, created_at) >= now() - interval '30 days';

UPDATE public.whoop_sleeps
SET whoop_id = whoop_id
WHERE COALESCE(end_time, created_at) >= now() - interval '30 days';

UPDATE public.notice_entries
SET mood = mood
WHERE created_at >= now() - interval '30 days';

UPDATE public.health_sync_data
SET source = source
WHERE sync_date >= current_date - 30;

UPDATE public.wellness_logs
SET log_date = log_date
WHERE log_date >= current_date - 30;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_planner_items_updated_at') THEN
    ALTER TABLE public.planner_items DISABLE TRIGGER update_planner_items_updated_at;
    UPDATE public.planner_items SET status = status WHERE scheduled_date >= current_date - 30;
    ALTER TABLE public.planner_items ENABLE TRIGGER update_planner_items_updated_at;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_rings_updated_at') THEN
    ALTER TABLE public.daily_rings DISABLE TRIGGER update_daily_rings_updated_at;
    UPDATE public.daily_rings SET ring_date = ring_date WHERE ring_date >= current_date - 30;
    ALTER TABLE public.daily_rings ENABLE TRIGGER update_daily_rings_updated_at;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dated_goal_daily_logs_updated_at') THEN
    ALTER TABLE public.dated_goal_daily_logs DISABLE TRIGGER update_dated_goal_daily_logs_updated_at;
    UPDATE public.dated_goal_daily_logs SET status = status WHERE log_date >= current_date - 30;
    ALTER TABLE public.dated_goal_daily_logs ENABLE TRIGGER update_dated_goal_daily_logs_updated_at;
  END IF;
END;
$$;

INSERT INTO public.daily_charge_snapshots (user_id, charge_date)
SELECT id, (now() AT TIME ZONE COALESCE(timezone, 'UTC'))::date
FROM public.profiles
ON CONFLICT (user_id, charge_date) DO NOTHING;