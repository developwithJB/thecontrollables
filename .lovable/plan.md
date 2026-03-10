

# Fix: "Invalid redirect_uri" on Instagram OAuth

## Root Cause

The error `Invalid redirect_uri` comes from Instagram/Meta rejecting the `redirect_uri` parameter in the OAuth request. This happens when the URL sent in the request doesn't **exactly** match a URL registered in the Meta App's settings.

The redirect URI your app sends is:
```
https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/integration-oauth-callback
```

## Required Actions

### 1. Meta App Configuration (you must do this manually)

In the [Meta for Developers](https://developers.facebook.com/) dashboard:

1. Open your app → **Use cases** → **Instagram Business Login** → **Settings**
2. Under **Valid OAuth Redirect URIs**, add exactly:
   ```
   https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/integration-oauth-callback
   ```
3. Make sure there's no trailing slash mismatch — it must be character-for-character identical
4. Save changes

### 2. Code Fix — URL encoding issue

Instagram's OAuth is sensitive to how `redirect_uri` is encoded in the query string. `URLSearchParams` double-encodes certain characters. The fix is to ensure the `redirect_uri` is passed cleanly. Additionally, the Instagram auth URL should use `https://api.instagram.com/oauth/authorize` (the newer endpoint) as a fallback if `www.instagram.com` is rejected by your app type.

**File**: `supabase/functions/integration-oauth-start/index.ts`
- No code logic change needed — `URLSearchParams` handles encoding correctly. The issue is purely the Meta App configuration.

### 3. Published domain redirect URI

If you're also testing from the published app (`thecontrollables.lovable.app`), note that the redirect URI goes to the **edge function** URL, not the app URL. So only one redirect URI needs to be registered — the Supabase function URL above. This is already correct in the code.

## Summary

This is a **configuration-only fix** — add the exact callback URL to your Meta App's Valid OAuth Redirect URIs. No code changes required.

