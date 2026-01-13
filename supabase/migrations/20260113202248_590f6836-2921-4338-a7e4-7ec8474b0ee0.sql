-- Create daily_readings table for editable readings content
CREATE TABLE public.daily_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number integer NOT NULL UNIQUE CHECK (day_number >= 1 AND day_number <= 7),
  controllable text NOT NULL,
  emoji text NOT NULL,
  framing_line text NOT NULL,
  prompt text NOT NULL,
  completion_button_text text NOT NULL,
  control_line text NOT NULL,
  surrender_line text NOT NULL,
  quest_action text NOT NULL,
  integrity_rep text NOT NULL,
  reflection text NOT NULL,
  reading_source text NOT NULL DEFAULT 'The Controllables',
  reading_chapter text NOT NULL,
  reading_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_readings ENABLE ROW LEVEL SECURITY;

-- Anyone can read daily readings (public content)
CREATE POLICY "Anyone can view daily readings"
  ON public.daily_readings
  FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_readings_updated_at
  BEFORE UPDATE ON public.daily_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the initial 7 readings
INSERT INTO public.daily_readings (day_number, controllable, emoji, framing_line, prompt, completion_button_text, control_line, surrender_line, quest_action, integrity_rep, reflection, reading_chapter, reading_text)
VALUES
(1, 'Choose Your Quest', '🎯', 'If you don''t choose, life chooses for you.', 'What''s the one thing that matters most right now?', 'Quest Chosen', 'Today, I control my direction.', 'I release the need to control the outcome.', 'Define or recommit to your Main Quest', 'Make one small promise you can keep today', 'What happens if you don''t choose?', 'The Quest', 'Without a chosen quest, you''re an NPC in someone else''s game. The default path isn''t wrong—it''s just not yours. Every hero''s journey starts with a choice to leave the ordinary world.'),

(2, 'Clean the Environment', '🧹', 'Your space shapes your state.', 'What in your environment drains your energy?', 'Space Cleared', 'Today, I control my inputs.', 'I release attachment to clutter.', 'Clear one physical or digital space', 'Delete or unfollow one thing that doesn''t serve you', 'How does your environment affect your momentum?', 'Environment', 'A rocket needs escape velocity to break free from gravity. Your environment is the gravity in your life. Some people fuel your launch. Others hold you to the ground. The same is true for spaces, objects, and inputs.'),

(3, 'Keep One Promise', '🤝', 'Confidence comes from kept promises.', 'What''s one promise you''ve made that you haven''t kept?', 'Promise Made', 'Today, I control my word.', 'I release over-commitment.', 'Complete one thing you''ve been putting off', 'Make only one new promise—and keep it', 'What would life look like with 100% integrity?', 'Integrity', 'Your word is your currency. Every broken promise devalues it. Every kept promise compounds. You don''t need more confidence—you need more evidence that you do what you say.'),

(4, 'Time Awareness', '⏳', 'Time is the only non-renewable resource.', 'Where does your time go without intention?', 'Time Tracked', 'Today, I control what I give my time to.', 'I release guilt about past time spent.', 'Log how you spend your waking hours', 'Protect one hour for your Main Quest', 'What would you do differently if time was money?', 'Time Currency', 'You can''t save time. You can only spend it. The question isn''t ''how much time do I have?'' but ''what am I buying with it?'' Every hour traded for scrolling is an hour not invested in the quest.'),

(5, 'Reps Over Motivation', '🦈', 'Motion matters more than magnitude.', 'What small action have you been waiting to feel ready for?', 'Rep Complete', 'Today, I control whether I start.', 'I release the need to feel motivated.', 'Do one rep toward your quest—no matter how small', 'Move your body for at least 5 minutes', 'What if motivation follows action, not the other way around?', 'Habit', 'Sharks can''t stop moving or they die. But they don''t swim fast—they swim constantly. Your habits don''t need to be heroic. They need to be happening. One rep. That''s all it takes to stay alive.'),

(6, 'Respec Check', '🔄', 'You''re allowed to change direction.', 'Is your current approach working? Be honest.', 'Build Reviewed', 'Today, I control my strategy.', 'I release attachment to the old way.', 'Evaluate your approach—adjust if needed', 'Ask for feedback from someone you trust', 'What would you try if you weren''t afraid of wasting past effort?', 'The Respec', 'Sunk cost is not spent energy—it''s released energy. Every moment you stay on the wrong path because of past investment is a moment stolen from the right path. Respecs aren''t failure. They''re wisdom.'),

(7, 'Define the Win', '🏁', 'You decide what winning means.', 'What does victory look like for your current quest?', 'Win Condition Set', 'Today, I control my definition of success.', 'I release other people''s definitions.', 'Write down your win condition—be specific', 'Celebrate one thing you''ve done this week', 'What will you feel when you complete this quest?', 'The Win Condition', 'Status symbols do not equal progress. The finish line is wherever you plant the flag. If you don''t define the win, you''ll chase someone else''s trophy forever. This is your game. You set the rules.');