-- Performance indexes for frequently queried tables
-- These indexes significantly speed up user-specific queries

-- reset_sessions: queried on every dashboard load for active session
CREATE INDEX IF NOT EXISTS idx_reset_sessions_user_status 
ON public.reset_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_reset_sessions_user_id 
ON public.reset_sessions(user_id);

-- daily_resets: queried for reset history and current day
CREATE INDEX IF NOT EXISTS idx_daily_resets_user_session 
ON public.daily_resets(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_daily_resets_session_day 
ON public.daily_resets(session_id, day_number);

-- xp_logs: queried for total XP calculation
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_id 
ON public.xp_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_xp_logs_user_created 
ON public.xp_logs(user_id, created_at DESC);

-- main_quests: queried for active quest
CREATE INDEX IF NOT EXISTS idx_main_quests_user_status 
ON public.main_quests(user_id, status);

-- integrity_logs: queried for pending promises
CREATE INDEX IF NOT EXISTS idx_integrity_logs_user_kept 
ON public.integrity_logs(user_id, kept);

-- time_logs: queried for today's log
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date 
ON public.time_logs(user_id, log_date DESC);

-- user_badges: queried for earned badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id 
ON public.user_badges(user_id);

-- user_build_current: queried for build stats
CREATE INDEX IF NOT EXISTS idx_user_build_current_user_id 
ON public.user_build_current(user_id);

-- certificates: queried for completed certificates
CREATE INDEX IF NOT EXISTS idx_certificates_user_id 
ON public.certificates(user_id);