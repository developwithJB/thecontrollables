-- At most one pending request per owner/provider. Opaque one-use state is hashed;
-- ownership, provider and return origin are server-written, never client claims.
CREATE TABLE IF NOT EXISTS public.oauth_state_requests(
 state_hash text PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN('whoop','oura','fitbit','google_calendar','gmail','instagram')),
 return_origin text NOT NULL,
 expires_at timestamptz NOT NULL,
 UNIQUE(user_id,provider)
);
ALTER TABLE public.oauth_state_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_state_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.oauth_state_requests TO service_role;
CREATE INDEX IF NOT EXISTS oauth_state_requests_expiry ON public.oauth_state_requests(expires_at);
