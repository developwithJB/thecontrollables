
-- Create meal_logs table
CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  description text,
  image_path text,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal logs" ON public.meal_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal logs" ON public.meal_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal logs" ON public.meal_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create meal_plans table
CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by text DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date)
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plans" ON public.meal_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" ON public.meal_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create meal-photos storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', false);

-- Storage RLS: users can upload their own photos
CREATE POLICY "Users can upload meal photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own meal photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
