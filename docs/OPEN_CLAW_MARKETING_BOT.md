# Open Claw Marketing Bot

`open-claw-marketing` is an Edge Function built for growth execution on The Dashboard.

Primary goals:
- Drive qualified traffic to the website
- Convert visitors into sign-ups
- Convert sign-ups/trials into paying customers

## Execution & Attribution Operations

Open Claw now supports admin-side operational tracking for each generated campaign:
- `execution_status`: `draft` | `generated` | `approved` | `launched`
- Spend tracking: `spend_amount_usd`
- Attribution tracking:
  - `attributed_signups`
  - `attributed_paid_conversions`
  - `attributed_revenue_usd`
  - `payment_attribution_model`
  - `payment_attribution_notes`

Channel integration health is tracked separately in `open_claw_channel_connections`:
- connection state (`connected`/`disconnected`/`error`)
- provider/account metadata
- spend sync and attribution support flags
- last checked / last sync timestamps

This makes payment attribution explicit at campaign and channel levels.

### Wallet Requirement

MetaMask (or any crypto wallet) is **not required** for Open Claw.
Open Claw runs through Supabase auth + Edge Functions + AI provider usage billing.

## Endpoint

`POST /functions/v1/open-claw-marketing`

Requires a logged-in user JWT in `Authorization: Bearer <token>`.

## Request Body

All fields are optional. The function applies defaults tuned for The Dashboard.

```json
{
  "objective": "full_funnel",
  "channel": "linkedin",
  "audience": "Founders and professionals rebuilding consistency",
  "offer": "Start a free 7-day snapshot",
  "landingPageUrl": "https://thecontrollables.lovable.app",
  "tone": "direct, practical, confident",
  "productName": "The Dashboard",
  "productDescription": "Daily accountability system for habit execution and self-trust.",
  "keyBenefits": [
    "Clear daily next actions",
    "AI guidance when stuck",
    "Visible progress and momentum"
  ],
  "proofPoints": [
    "Built around The Controllables framework",
    "Mobile-first, low-friction daily flow"
  ],
  "constraints": [
    "No fake testimonials",
    "No unrealistic guarantees"
  ],
  "budgetLevel": "medium",
  "variationCount": 3
}
```

## Response

Returns JSON with:
- `campaignSummary`
- `funnelPlan` (`traffic`, `signup`, `paidConversion`)
- `copyAssets` (social posts, ad variants, emails)
- `experiments` (ranked growth tests with KPIs)
- `next7Days` execution checklist

If the model does not return valid JSON, the function returns raw text in `content.raw`.

## Example cURL

```bash
curl -X POST "https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/open-claw-marketing" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "objective":"full_funnel",
    "channel":"linkedin",
    "offer":"Start your 7-day snapshot free",
    "variationCount":3
  }'
```

## Deploy

```bash
supabase functions deploy open-claw-marketing
```
