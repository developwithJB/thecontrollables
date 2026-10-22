-- Read-only operator verification. Review the target before running.
-- Aggregate counts are delivery checks, not cohort conversion rates.
BEGIN READ ONLY;
SELECT event_name,
       count(*) AS received_events,
       count(DISTINCT session_id) AS browser_sessions,
       count(DISTINCT user_id) AS authenticated_accounts,
       max(created_at) AS latest_received_at
FROM public.app_events
WHERE event_type = 'growth'
  AND created_at >= now() - interval '24 hours'
  AND event_name IN (
    'landing_view', 'signup_submitted', 'authenticated_visit',
    'first_circuit_completed', 'day7_return',
    'pro_offer_viewed', 'pro_offer_clicked', 'pro_offer_dismissed',
    'checkout_requested', 'checkout_opened', 'checkout_failed'
  )
GROUP BY event_name ORDER BY event_name;
-- Separately verify signed webhook processing; never count a browser success URL.
-- This returns no event payload, customer details, email, or payment identifiers.
SELECT type, count(*) AS processed_receipts, max(created_at) AS latest_received_at
FROM public.stripe_webhook_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY type ORDER BY type;
ROLLBACK;
