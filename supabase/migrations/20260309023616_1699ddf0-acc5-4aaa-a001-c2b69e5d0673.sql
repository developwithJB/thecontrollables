
CREATE OR REPLACE FUNCTION public.get_circle_wellness_streaks(p_challenge_id uuid)
RETURNS TABLE(user_id uuid, display_name text, streak integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participant RECORD;
  v_streak integer;
  v_check_date date;
  v_found boolean;
BEGIN
  -- Verify caller is a participant
  IF NOT public.is_challenge_participant(auth.uid(), p_challenge_id) THEN
    RETURN;
  END IF;

  FOR v_participant IN
    SELECT cp.user_id, cp.display_name
    FROM public.challenge_participants cp
    WHERE cp.challenge_id = p_challenge_id
  LOOP
    v_streak := 0;
    -- Start from today, walk backwards with 1-day grace
    v_check_date := CURRENT_DATE;
    
    -- Check if logged today
    SELECT EXISTS(
      SELECT 1 FROM public.wellness_logs wl
      WHERE wl.user_id = v_participant.user_id AND wl.log_date = v_check_date
    ) INTO v_found;
    
    IF v_found THEN
      v_streak := 1;
      v_check_date := v_check_date - 1;
    ELSE
      -- Grace period: check yesterday
      v_check_date := v_check_date - 1;
      SELECT EXISTS(
        SELECT 1 FROM public.wellness_logs wl
        WHERE wl.user_id = v_participant.user_id AND wl.log_date = v_check_date
      ) INTO v_found;
      
      IF v_found THEN
        v_streak := 1;
        v_check_date := v_check_date - 1;
      END IF;
    END IF;
    
    -- Continue counting consecutive days backwards
    IF v_streak > 0 THEN
      LOOP
        SELECT EXISTS(
          SELECT 1 FROM public.wellness_logs wl
          WHERE wl.user_id = v_participant.user_id AND wl.log_date = v_check_date
        ) INTO v_found;
        
        EXIT WHEN NOT v_found;
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
        
        -- Safety limit
        EXIT WHEN v_streak >= 60;
      END LOOP;
    END IF;
    
    user_id := v_participant.user_id;
    display_name := v_participant.display_name;
    streak := v_streak;
    RETURN NEXT;
  END LOOP;
END;
$$;
