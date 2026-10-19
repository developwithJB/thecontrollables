-- Hosted default privileges may grant more than the revision contract needs.
-- Clients need nextval for saves, never setval or direct sequence reads.
REVOKE ALL ON SEQUENCE public.book_record_revision_seq FROM authenticated;
GRANT USAGE ON SEQUENCE public.book_record_revision_seq TO authenticated;
-- The trigger runs on row updates; it is not a client-callable RPC.
REVOKE ALL ON FUNCTION public.bump_book_record_revision() FROM PUBLIC, anon, authenticated;
