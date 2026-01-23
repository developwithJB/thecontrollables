-- =============================================
-- FIX 1: Add CHECK constraints to numeric inputs
-- =============================================

-- Wellness ratings: 1-5 scale or NULL
ALTER TABLE wellness_logs
ADD CONSTRAINT check_sleep_rating 
  CHECK (sleep_rating IS NULL OR (sleep_rating >= 1 AND sleep_rating <= 5)),
ADD CONSTRAINT check_movement_rating 
  CHECK (movement_rating IS NULL OR (movement_rating >= 1 AND movement_rating <= 5)),
ADD CONSTRAINT check_nutrition_rating 
  CHECK (nutrition_rating IS NULL OR (nutrition_rating >= 1 AND nutrition_rating <= 5));

-- Time logs: non-negative minutes (handle NULL default values)
ALTER TABLE time_logs
ADD CONSTRAINT check_time_invested 
  CHECK (time_invested_minutes IS NULL OR time_invested_minutes >= 0),
ADD CONSTRAINT check_time_wasted 
  CHECK (time_wasted_minutes IS NULL OR time_wasted_minutes >= 0);

-- XP: positive values only
ALTER TABLE xp_logs
ADD CONSTRAINT check_xp_positive 
  CHECK (amount > 0);

-- =============================================
-- FIX 2: Add RLS policy for app_analytics table
-- Admin-only access (no direct user access)
-- =============================================

-- Deny all access by default (RLS is already enabled)
-- Only service role can access via admin edge function
-- This explicitly documents the design decision
CREATE POLICY "No direct user access to analytics"
ON public.app_analytics
FOR ALL
TO authenticated
USING (false);

-- =============================================
-- Note: The "RLS Policy Always True" warning refers to
-- INSERT policies with WITH CHECK (true) on analytics tables.
-- This is intentional for anonymous event/error tracking.
-- These are INSERT-only and don't expose data.
-- =============================================