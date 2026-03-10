

# Plan: Fix Google Calendar OAuth Callback in Planner

## Root Cause

The Planner's "Connect Google Calendar" button correctly initiates OAuth by calling `planner-gcal-oauth-start`, which redirects to Google with `redirect_uri` set to `/planner?gcal_callback=true`. Google then redirects back to that URL with `?code=xxx&state=userId` appended. But **no code in Planner.tsx reads those URL params or calls the `planner-gcal-oauth-callback` edge function** to exchange the code for tokens. The OAuth flow dead-ends silently.

The Integrations page works because it uses a different OAuth mechanism (popup window + dedicated edge function callback).

## Fix

Add a `useEffect` in `Planner.tsx` that detects the `gcal_callback=true` + `code` search params on mount, calls the `planner-gcal-oauth-callback` edge function with the code and matching `redirect_uri`, cleans the URL, and shows a toast on success/failure.

## Changes

### `src/pages/Planner.tsx`
- Import `useSearchParams` (already imported but unused for this)
- Add a `useEffect` that:
  1. Checks for `searchParams.get("gcal_callback")` and `searchParams.get("code")`
  2. Calls `planner-gcal-oauth-callback` edge function with `{ code, redirect_uri }` where `redirect_uri` matches exactly what was sent to Google (`${origin}/planner?gcal_callback=true`)
  3. On success: shows "Google Calendar connected" toast, invalidates `planner-connections` query
  4. On error: shows error toast
  5. Cleans URL params via `setSearchParams` or `navigate("/planner", { replace: true })`

### `src/hooks/usePlanner.ts`
- The `redirect_uri` sent to Google currently is `${window.location.origin}/planner?gcal_callback=true`. However, Google requires the redirect URI used during token exchange to match exactly. The problem is Google appends `&code=xxx&state=yyy` to the redirect URI, but the token exchange must use the **original** redirect URI (without the code/state params). This is correct as-is — just need to ensure the callback function receives the same base URI.

No edge function changes needed — the callback function already accepts `code` and `redirect_uri` in the request body.

## Files

| Action | File |
|--------|------|
| Edit | `src/pages/Planner.tsx` — add useEffect to handle OAuth callback params |

