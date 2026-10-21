-- Preserve legacy events. New authenticated deliveries receive an opaque unique
-- event identity so concurrent provider retries cannot pollute integration history.
ALTER TABLE public.whoop_webhook_events ADD COLUMN IF NOT EXISTS delivery_key text;
CREATE UNIQUE INDEX IF NOT EXISTS whoop_webhook_delivery_key_unique
 ON public.whoop_webhook_events(delivery_key) WHERE delivery_key IS NOT NULL;
REVOKE ALL ON public.whoop_webhook_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.whoop_webhook_events TO service_role;
ALTER TABLE public.whoop_webhook_events ENABLE ROW LEVEL SECURITY;
