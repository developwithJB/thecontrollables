-- Add snapshot columns to certificates for frozen memory
ALTER TABLE public.certificates 
ADD COLUMN badges_earned jsonb DEFAULT '[]'::jsonb,
ADD COLUMN total_xp integer DEFAULT 0,
ADD COLUMN level integer DEFAULT 1;