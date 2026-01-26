-- Add welcome foundation tracking and feature reveal to user_onboarding
ALTER TABLE user_onboarding 
ADD COLUMN IF NOT EXISTS welcome_foundation_progress JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS features_unlocked JSONB DEFAULT '{}';

-- Add maintenance mode and foundation level to reset_sessions
ALTER TABLE reset_sessions 
ADD COLUMN IF NOT EXISTS is_maintenance_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS foundation_level INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN user_onboarding.welcome_foundation_progress IS 'Tracks welcome foundation task completion: {"day_2_promise": true, "day_3_time": true, ...}';
COMMENT ON COLUMN user_onboarding.features_unlocked IS 'Tracks progressive feature reveal: {"time_reflection": true, "integrity": true, ...}';
COMMENT ON COLUMN reset_sessions.is_maintenance_mode IS 'True if user is in lightweight daily maintenance mode between foundations';
COMMENT ON COLUMN reset_sessions.foundation_level IS 'Level of foundation repetition (1 = first time, 2+ = repeating)';