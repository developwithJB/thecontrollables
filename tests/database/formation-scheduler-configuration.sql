-- LOCAL ONLY, disposable database without pg_cron installed. All fixtures roll back.
BEGIN;
CREATE SCHEMA cron;
CREATE TABLE cron.job(jobid bigserial PRIMARY KEY,jobname text,command text,schedule text);
CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobid=$1 RETURNING true $$;
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3) RETURNING jobid $$;
INSERT INTO cron.job(jobname,schedule,command) VALUES
 ('send-morning-nudges','0 * * * *','SELECT net.http_post(url:=''https://example.supabase.co/functions/v1/send-daily-nudge'',headers:=''{"Authorization":"Bearer e30.eyJyb2xlIjoiYW5vbiJ9.test"}''::jsonb);'),
 ('send-evening-nudges','0 * * * *','fixture');
SELECT vault.create_secret(repeat('a',64),'formation_scheduler_token');
\ir ../../scripts/ops/configure-formation-scheduler.sql
DO $$ DECLARE job cron.job; BEGIN
 IF (SELECT count(*) FROM cron.job) <> 1 THEN RAISE EXCEPTION 'duplicate_scheduler'; END IF;
 SELECT * INTO job FROM cron.job;
 IF job.jobname <> 'send-morning-nudges' OR job.schedule <> '5 * * * *' THEN RAISE EXCEPTION 'wrong_schedule'; END IF;
 IF job.command NOT LIKE '%vault.decrypted_secrets%' OR job.command NOT LIKE '%x-formation-scheduler-token%' THEN RAISE EXCEPTION 'missing_vault_auth'; END IF;
 IF position(repeat('a',64) IN job.command) > 0 THEN RAISE EXCEPTION 'secret_embedded_in_job'; END IF;
 IF job.command NOT LIKE '%"scheduled":true%' THEN RAISE EXCEPTION 'wrong_payload'; END IF;
END $$;
ROLLBACK;
