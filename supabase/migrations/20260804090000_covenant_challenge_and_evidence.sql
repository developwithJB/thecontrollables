-- A durable 75-day Christian covenant and lifetime evidence record.

CREATE TABLE public.covenant_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '75-Day Covenant',
  mission text,
  duration_days integer NOT NULL DEFAULT 75 CHECK (duration_days BETWEEN 1 AND 365),
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'ended')),
  rules jsonb NOT NULL DEFAULT '["jesus_first","bible_read","alcohol_free","workout","nutrition","water","service"]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX covenant_challenges_one_active_per_user
  ON public.covenant_challenges(user_id)
  WHERE status = 'active';

CREATE INDEX covenant_challenges_user_started_idx
  ON public.covenant_challenges(user_id, started_on DESC);

ALTER TABLE public.covenant_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their covenant challenges"
  ON public.covenant_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their covenant challenges"
  ON public.covenant_challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their covenant challenges"
  ON public.covenant_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.covenant_daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.covenant_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  jesus_first boolean NOT NULL DEFAULT false,
  bible_read boolean NOT NULL DEFAULT false,
  alcohol_free boolean NOT NULL DEFAULT false,
  workout_count integer NOT NULL DEFAULT 0 CHECK (workout_count >= 0),
  miles numeric(8,2) NOT NULL DEFAULT 0 CHECK (miles >= 0),
  nutrition_kept boolean NOT NULL DEFAULT false,
  water_goal boolean NOT NULL DEFAULT false,
  service_count integer NOT NULL DEFAULT 0 CHECK (service_count >= 0),
  people_encouraged integer NOT NULL DEFAULT 0 CHECK (people_encouraged >= 0),
  journal_entry boolean NOT NULL DEFAULT false,
  scripture_memorized_count integer NOT NULL DEFAULT 0 CHECK (scripture_memorized_count >= 0),
  reflection text,
  day_complete boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, checkin_date)
);

CREATE INDEX covenant_daily_checkins_user_date_idx
  ON public.covenant_daily_checkins(user_id, checkin_date DESC);

ALTER TABLE public.covenant_daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their covenant checkins"
  ON public.covenant_daily_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their covenant checkins"
  ON public.covenant_daily_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.covenant_challenges challenge
      WHERE challenge.id = challenge_id AND challenge.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their covenant checkins"
  ON public.covenant_daily_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.grace_evidence_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.covenant_challenges(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('answered_prayer', 'journal_moment', 'shaping_scripture', 'milestone', 'testimony', 'person_impacted')),
  title text NOT NULL,
  story text,
  scripture_reference text,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX grace_evidence_entries_user_date_idx
  ON public.grace_evidence_entries(user_id, occurred_on DESC);

ALTER TABLE public.grace_evidence_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their grace evidence"
  ON public.grace_evidence_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their grace evidence"
  ON public.grace_evidence_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their grace evidence"
  ON public.grace_evidence_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their grace evidence"
  ON public.grace_evidence_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_covenant_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_covenant_challenges_updated_at
  BEFORE UPDATE ON public.covenant_challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_covenant_updated_at();

CREATE TRIGGER set_covenant_daily_checkins_updated_at
  BEFORE UPDATE ON public.covenant_daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_covenant_updated_at();

CREATE TRIGGER set_grace_evidence_entries_updated_at
  BEFORE UPDATE ON public.grace_evidence_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_covenant_updated_at();
