

# Fix Instagram OAuth Flow

## Root Cause

Two issues are causing the Instagram connection to hang:

1. **Iframe cookie restriction**: The app runs inside a Lovable preview iframe. When `window.location.href` redirects to Instagram's OAuth page, third-party cookie blocking prevents the session state from being maintained. After Facebook authorization, Instagram can't complete the redirect back because the flow breaks inside the iframe context.

2. **Redirect URI may not fire**: The edge function callback logs show zero requests, meaning Instagram never redirects back to the callback URL. This confirms the redirect is being blocked or the Meta App's "Valid OAuth Redirect URIs" setting is missing the callback URL.

## Solution

### 1. Switch OAuth to popup window flow

In `useIntegrations.ts`, change `useConnectProvider` to open the OAuth URL in a **popup window** instead of `window.location.href`. This escapes iframe restrictions entirely.

The popup approach:
- Call `integration-oauth-start` to get the URL (same as now)
- Open `window.open(url, 'instagram-oauth', 'width=600,height=700')` 
- Poll the popup URL to detect when it reaches the redirect URI (the `/integrations?integration_success=...` page)
- When detected, close the popup and refresh connections

### 2. Update `integration-oauth-callback` to support popup closure

Add a small HTML page response option: when the callback detects it's in a popup (via a flag in state), return an HTML page that posts a message to `window.opener` and closes itself, instead of doing a 302 redirect (which would navigate the popup to the app).

Flow becomes:
1. `integration-oauth-start` — add `popup: true` to the state
2. Instagram OAuth in popup window
3. `integration-oauth-callback` — detects `popup: true` in state, returns HTML that calls `window.opener.postMessage({type: 'oauth-complete', provider: 'instagram'})` then `window.close()`
4. Parent page listens for the message, invalidates connections query

### 3. Update `InstagramInputCard.tsx` connect button

The connect button in the Instagram card also uses `connectProvider.mutate("instagram")` — it will automatically benefit from the popup change in the hook.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useIntegrations.ts` | `useConnectProvider` → popup window + postMessage listener |
| `supabase/functions/integration-oauth-callback/index.ts` | Detect `popup` flag in state → return HTML instead of 302 |
| `supabase/functions/integration-oauth-start/index.ts` | Add `popup: true` to state object |

## Meta App Configuration Reminder

The user must also verify in the Meta Developer Portal that the **Valid OAuth Redirect URI** is set to:
`https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/integration-oauth-callback`

This is required regardless of code changes.

