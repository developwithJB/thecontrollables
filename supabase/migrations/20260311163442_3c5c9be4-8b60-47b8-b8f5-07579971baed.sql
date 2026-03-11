CREATE TABLE public.saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  emoji text DEFAULT '🍽️',
  image_url text,
  prep_minutes integer,
  est_calories integer,
  est_protein integer,
  est_carbs integer,
  est_fat integer,
  meal_type text NOT NULL DEFAULT 'dinner',
  tags text[] DEFAULT '{}',
  ingredients jsonb DEFAULT '[]',
  instructions jsonb DEFAULT '[]',
  source text DEFAULT 'swiper',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recipes" ON public.saved_recipes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);