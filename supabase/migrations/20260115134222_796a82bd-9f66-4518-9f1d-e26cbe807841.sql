
-- Drop the foreign key constraint that requires challenge_id to reference challenges table
-- This allows us to use reset_sessions IDs in the challenge_id column for certificates
ALTER TABLE completion_certificates DROP CONSTRAINT IF EXISTS completion_certificates_challenge_id_fkey;
