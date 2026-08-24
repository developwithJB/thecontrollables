-- Prevent authenticated users from enumerating every invite-coded challenge.
-- Invite discovery and joining now happen through exact-code, authenticated RPCs.

DROP POLICY IF EXISTS "Anyone can view challenges by invite code" ON public.challenges;
DROP POLICY IF EXISTS "Anyone can view challenges with invite code" ON public.challenges;
DROP POLICY IF EXISTS "Authenticated users can view challenges by invite code" ON public.challenges;

-- The join RPC owns capacity and duplicate-member checks. Direct inserts remain
-- available only for a circle creator adding themselves to a new circle.
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Circle creators can add themselves"
ON public.challenge_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.challenges AS c
    WHERE c.id = challenge_id
      AND c.creator_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.lookup_challenge_by_invite_code(p_invite_code text)
RETURNS TABLE (
  id uuid,
  name text,
  journey_id text,
  duration_days integer,
  max_members integer,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  normalized_code text := upper(btrim(p_invite_code));
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_code IS NULL OR length(normalized_code) <> 6 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.journey_id,
    c.duration_days,
    c.max_members,
    count(cp.id)::bigint AS member_count
  FROM public.challenges AS c
  LEFT JOIN public.challenge_participants AS cp ON cp.challenge_id = c.id
  WHERE c.invite_code = normalized_code
    AND c.is_solo = false
  GROUP BY c.id, c.name, c.journey_id, c.duration_days, c.max_members
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_challenge_by_invite_code(
  p_invite_code text,
  p_display_name text
)
RETURNS TABLE (
  circle_name text,
  journey_id text,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  normalized_code text := upper(btrim(p_invite_code));
  normalized_name text := nullif(btrim(p_display_name), '');
  selected_challenge public.challenges%ROWTYPE;
  current_member_count bigint;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_code IS NULL OR length(normalized_code) <> 6 THEN
    RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '22023';
  END IF;

  IF normalized_name IS NULL OR length(normalized_name) > 80 THEN
    RAISE EXCEPTION 'Display name must be between 1 and 80 characters' USING ERRCODE = '22023';
  END IF;

  SELECT c.*
  INTO selected_challenge
  FROM public.challenges AS c
  WHERE c.invite_code = normalized_code
    AND c.is_solo = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.challenge_participants AS cp
    WHERE cp.challenge_id = selected_challenge.id
      AND cp.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You are already in this circle' USING ERRCODE = '23505';
  END IF;

  SELECT count(*)::bigint
  INTO current_member_count
  FROM public.challenge_participants AS cp
  WHERE cp.challenge_id = selected_challenge.id;

  IF current_member_count >= selected_challenge.max_members THEN
    RAISE EXCEPTION 'This circle is full' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.challenge_participants (
    challenge_id,
    user_id,
    display_name,
    covenant_accepted,
    covenant_accepted_at,
    start_date
  ) VALUES (
    selected_challenge.id,
    current_user_id,
    normalized_name,
    true,
    now(),
    current_date
  );

  RETURN QUERY SELECT
    selected_challenge.name,
    selected_challenge.journey_id,
    current_member_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_challenge_by_invite_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_challenge_by_invite_code(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_challenge_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_challenge_by_invite_code(text, text) TO authenticated;