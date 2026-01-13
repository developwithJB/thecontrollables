-- Table: build_questions (stores assessment questions)
CREATE TABLE public.build_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  controllable text NOT NULL CHECK (controllable IN ('awareness', 'perspective', 'habit', 'wellness', 'environment')),
  question_key text NOT NULL UNIQUE,
  prompt text NOT NULL,
  order_index int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: build_assessments (one row per assessment submission)
CREATE TABLE public.build_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_days int NOT NULL DEFAULT 7,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_build_assessments_user_submitted ON public.build_assessments(user_id, submitted_at DESC);

-- Table: build_answers (stores 1-4 scale answers)
CREATE TABLE public.build_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.build_assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.build_questions(id),
  score int NOT NULL CHECK (score BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

-- Table: build_scores (computed averages per assessment)
CREATE TABLE public.build_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.build_assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  awareness numeric(3,2) NOT NULL,
  perspective numeric(3,2) NOT NULL,
  habit numeric(3,2) NOT NULL,
  wellness numeric(3,2) NOT NULL,
  environment numeric(3,2) NOT NULL,
  overall numeric(3,2) NOT NULL,
  build_archetype_key text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id)
);

-- Table: user_build_current (latest snapshot for fast dashboard reads)
CREATE TABLE public.user_build_current (
  user_id uuid PRIMARY KEY,
  awareness numeric(3,2) NOT NULL DEFAULT 0,
  perspective numeric(3,2) NOT NULL DEFAULT 0,
  habit numeric(3,2) NOT NULL DEFAULT 0,
  wellness numeric(3,2) NOT NULL DEFAULT 0,
  environment numeric(3,2) NOT NULL DEFAULT 0,
  overall numeric(3,2) NOT NULL DEFAULT 0,
  build_archetype_key text NULL,
  last_assessment_id uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.build_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_build_current ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- build_questions: read-only for authenticated users
CREATE POLICY "Authenticated users can view active questions"
ON public.build_questions FOR SELECT
TO authenticated
USING (is_active = true);

-- build_assessments: users can read/write their own
CREATE POLICY "Users can create their own assessments"
ON public.build_assessments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own assessments"
ON public.build_assessments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- build_answers: users can read/write their own (via assessment)
CREATE POLICY "Users can create answers for their assessments"
ON public.build_answers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.build_assessments
    WHERE id = assessment_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own answers"
ON public.build_answers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.build_assessments
    WHERE id = assessment_id AND user_id = auth.uid()
  )
);

-- build_scores: read-only for users (computed by function)
CREATE POLICY "Users can view their own scores"
ON public.build_scores FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- user_build_current: read-only for users (computed by function)
CREATE POLICY "Users can view their own current build"
ON public.user_build_current FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Seed 20 active questions (4 per controllable)
INSERT INTO public.build_questions (controllable, question_key, prompt, order_index) VALUES
-- Awareness
('awareness', 'A1', 'I notice my thoughts before acting on them.', 1),
('awareness', 'A2', 'I pause before reacting emotionally.', 2),
('awareness', 'A3', 'I recognize when I''m acting from fear, ego, or impulse.', 3),
('awareness', 'A4', 'I am aware of what''s actually in my control today.', 4),
-- Perspective
('perspective', 'P1', 'I can zoom out when something goes wrong.', 5),
('perspective', 'P2', 'I remind myself that setbacks are temporary.', 6),
('perspective', 'P3', 'I interpret challenges as part of a longer story.', 7),
('perspective', 'P4', 'I resist catastrophizing small problems.', 8),
-- Habit
('habit', 'H1', 'I keep small promises I make to myself.', 9),
('habit', 'H2', 'I show up even when motivation is low.', 10),
('habit', 'H3', 'I focus on reps instead of outcomes.', 11),
('habit', 'H4', 'I recover quickly after missing a day.', 12),
-- Wellness
('wellness', 'W1', 'I get enough sleep to function well.', 13),
('wellness', 'W2', 'I move my body regularly.', 14),
('wellness', 'W3', 'I fuel myself in a way that supports energy.', 15),
('wellness', 'W4', 'I allow myself real rest without guilt.', 16),
-- Environment
('environment', 'E1', 'My environment makes good choices easier.', 17),
('environment', 'E2', 'The people around me support my growth.', 18),
('environment', 'E3', 'My digital inputs are intentional, not default.', 19),
('environment', 'E4', 'My physical space supports focus and calm.', 20);

-- Scoring function
CREATE OR REPLACE FUNCTION public.compute_build_scores(p_assessment_id uuid)
RETURNS public.build_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Check if scores already exist for this assessment
  SELECT * INTO v_result FROM public.build_scores WHERE assessment_id = p_assessment_id;
  IF FOUND THEN
    RETURN v_result;
  END IF;

  -- Get user_id from assessment
  SELECT user_id INTO v_user_id FROM public.build_assessments WHERE id = p_assessment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  -- Compute averages per controllable
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

  -- Compute overall average
  v_overall := (v_awareness + v_perspective + v_habit + v_wellness + v_environment) / 5;

  -- Determine archetype
  -- Find max and min
  v_max_score := GREATEST(v_awareness, v_perspective, v_habit, v_wellness, v_environment);
  v_min_score := LEAST(v_awareness, v_perspective, v_habit, v_wellness, v_environment);
  
  -- Determine which controllable is highest
  v_max_controllable := CASE v_max_score
    WHEN v_habit THEN 'habit'
    WHEN v_awareness THEN 'awareness'
    WHEN v_wellness THEN 'wellness'
    WHEN v_perspective THEN 'perspective'
    ELSE 'environment'
  END;
  
  -- Determine which controllable is lowest
  v_min_controllable := CASE v_min_score
    WHEN v_wellness THEN 'wellness'
    WHEN v_environment THEN 'environment'
    WHEN v_habit THEN 'habit'
    WHEN v_awareness THEN 'awareness'
    ELSE 'perspective'
  END;

  -- Assign archetype based on rules
  IF v_awareness >= 3.0 AND v_perspective >= 3.0 AND v_habit >= 3.0 AND v_wellness >= 3.0 AND v_environment >= 3.0 THEN
    v_archetype := 'stable_build';
  ELSIF v_max_controllable = 'habit' AND v_min_controllable = 'wellness' THEN
    v_archetype := 'driven_but_depleting';
  ELSIF v_max_controllable = 'awareness' AND v_min_controllable = 'environment' THEN
    v_archetype := 'clear_but_fighting_friction';
  ELSIF v_max_controllable = 'wellness' AND v_min_controllable = 'habit' THEN
    v_archetype := 'capable_but_inconsistent';
  ELSE
    v_archetype := 'custom_build';
  END IF;

  -- Insert into build_scores
  INSERT INTO public.build_scores (
    assessment_id, user_id, awareness, perspective, habit, wellness, environment, overall, build_archetype_key
  ) VALUES (
    p_assessment_id, v_user_id, v_awareness, v_perspective, v_habit, v_wellness, v_environment, v_overall, v_archetype
  )
  RETURNING * INTO v_result;

  -- Upsert into user_build_current
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
$$;

-- Trigger function to auto-compute scores when all 20 answers are submitted
CREATE OR REPLACE FUNCTION public.trigger_compute_build_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answer_count int;
BEGIN
  -- Count answers for this assessment
  SELECT COUNT(*) INTO v_answer_count
  FROM public.build_answers
  WHERE assessment_id = NEW.assessment_id;

  -- If we have all 20 answers, compute scores
  IF v_answer_count >= 20 THEN
    -- Only compute if scores don't already exist
    IF NOT EXISTS (SELECT 1 FROM public.build_scores WHERE assessment_id = NEW.assessment_id) THEN
      PERFORM public.compute_build_scores(NEW.assessment_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_build_answers_compute_scores
AFTER INSERT ON public.build_answers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_compute_build_scores();