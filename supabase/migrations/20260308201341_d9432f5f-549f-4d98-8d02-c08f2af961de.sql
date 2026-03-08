
-- Add unique constraint for upsert on meal_plans (user_id, plan_date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_user_id_plan_date_key'
  ) THEN
    ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_user_id_plan_date_key UNIQUE (user_id, plan_date);
  END IF;
END $$;

-- Allow users to update their own meal plans
CREATE POLICY "Users can update their own meal plans"
ON public.meal_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own meal plans  
CREATE POLICY "Users can delete their own meal plans"
ON public.meal_plans
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
