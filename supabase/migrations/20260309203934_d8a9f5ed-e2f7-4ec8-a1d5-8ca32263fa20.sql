
-- 1. DELETE RLS policy for daily_rings
CREATE POLICY "Users can delete their own daily rings"
ON public.daily_rings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. updated_at trigger reusing existing function
CREATE TRIGGER update_daily_rings_updated_at
  BEFORE UPDATE ON public.daily_rings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
