-- Add nudge frequency preference
ALTER TABLE profiles 
ADD COLUMN nudge_frequency TEXT DEFAULT 'daily' CHECK (nudge_frequency IN ('daily', 'weekly'));

COMMENT ON COLUMN profiles.nudge_frequency IS 'User preference for nudge emails: daily or weekly';