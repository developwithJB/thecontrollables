

# Fix: WHOOP OAuth Redirect Loop on Mobile

## Root Cause

Two issues are causing the broken flow:

1. **Callback redirects to `/` (Landing page)**: The `wearable-oauth-callback` edge function redirects to `${appUrl}/?wearable_connected=whoop`. The Landing page now has an auto-redirect for authenticated users to `/home`, but it **drops the query params** during redirect — so the success signal is lost.

2. **No handler for `wearable_connected` param**: Nothing in the app reads the `wearable_connected` or `wearable_error` query params to show a toast or trigger data refetch. The user sees no feedback and the connection appears to not have worked (even though it likely did save to the database).

## Changes

### 1. Fix callback redirect destination

**Edit:** `supabase/functions/wearable-oauth-callback/index.ts`

Change the success/error redirects from `${appUrl}/` to `${appUrl}/wellness` so users land back on the page where they initiated the connection:
- Success: `${appUrl}/wellness?wearable_connected=${provider}`
- Errors: `${appUrl}/wellness?wearable_error=...`

### 2. Preserve query params in Landing auto-redirect

**Edit:** `src/pages/Landing.tsx`

When auto-redirecting authenticated users, forward any query params (especially `wearable_connected` / `wearable_error`) so they aren't silently dropped.

### 3. Handle `wearable_connected` / `wearable_error` on Wellness page

**Edit:** `src/pages/Wellness.tsx`

Add a `useEffect` that reads `wearable_connected` and `wearable_error` from `searchParams`:
- On success: show a toast ("WHOOP connected!"), invalidate the `wearable-connections` query, clean the URL
- On error: show an error toast, clean the URL

This closes the feedback loop so the user sees confirmation and the UI refreshes.

### 4. Handle params on Home page as fallback

**Edit:** `src/pages/Home.tsx`

Same pattern — if the user somehow lands on Home with `wearable_connected`, show the toast and clean the param.

## Files Summary

| Action | File |
|--------|------|
| Edit | `supabase/functions/wearable-oauth-callback/index.ts` — redirect to `/wellness` |
| Edit | `src/pages/Landing.tsx` — preserve query params on redirect |
| Edit | `src/pages/Wellness.tsx` — handle wearable query params |
| Edit | `src/pages/Home.tsx` — fallback param handling |

