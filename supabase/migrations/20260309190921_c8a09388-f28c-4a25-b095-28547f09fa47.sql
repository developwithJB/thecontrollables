
-- Create user_recipes table for saved meal library
CREATE TABLE public.user_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🍽️',
  calories INTEGER,
  prep_minutes INTEGER,
  meal_type TEXT DEFAULT 'any',
  tags TEXT[] DEFAULT '{}',
  ingredients JSONB DEFAULT '[]',
  instructions TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own recipes"
  ON public.user_recipes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
