-- Optional private check-ins. Deliberately separate from wellness_logs, timeline,
-- analytics, AI context, strict circuits, scoring, and closeout.
CREATE TABLE public.wellness_private_checkins (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  sleep_rating smallint CHECK (sleep_rating BETWEEN 1 AND 5),
  sleep_hours numeric(4,2) CHECK (sleep_hours BETWEEN 0 AND 24),
  mood text CHECK (mood IN ('peaceful', 'okay', 'heavy', 'anxious', 'worn_out')),
  note text CHECK (char_length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);
ALTER TABLE public.wellness_private_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wellness_private_checkins FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.wellness_private_checkins TO authenticated;
GRANT INSERT (user_id, local_date, sleep_rating, sleep_hours, mood, note) ON public.wellness_private_checkins TO authenticated;
GRANT UPDATE (sleep_rating, sleep_hours, mood, note) ON public.wellness_private_checkins TO authenticated;
CREATE POLICY checkin_owner_read ON public.wellness_private_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY checkin_owner_insert ON public.wellness_private_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY checkin_owner_update ON public.wellness_private_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY checkin_owner_delete ON public.wellness_private_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Upsert only ordinary fields: callers cannot update ownership or the local date.
CREATE FUNCTION public.save_private_wellness_checkin(p_user_id uuid, p_local_date date, p_sleep_rating smallint DEFAULT NULL, p_sleep_hours numeric DEFAULT NULL, p_mood text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.wellness_private_checkins (user_id, local_date, sleep_rating, sleep_hours, mood, note)
    VALUES (auth.uid(), p_local_date, p_sleep_rating, p_sleep_hours, p_mood, p_note)
  ON CONFLICT (user_id, local_date) DO UPDATE SET sleep_rating = EXCLUDED.sleep_rating,
    sleep_hours = EXCLUDED.sleep_hours, mood = EXCLUDED.mood, note = EXCLUDED.note;
END;
$$;
REVOKE ALL ON FUNCTION public.save_private_wellness_checkin(uuid, date, smallint, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_private_wellness_checkin(uuid, date, smallint, numeric, text, text) TO authenticated;
