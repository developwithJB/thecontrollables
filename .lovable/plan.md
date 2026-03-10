

# Fix: Google Calendar "redirect_uri_mismatch" (Error 400)

## Root Cause

Same pattern as the Instagram issue. The `redirect_uri` sent in the OAuth request is not registered in your Google Cloud Console. The edge function sends:

```
https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/integration-oauth-callback
```

Google rejects it because this URL is not in the **Authorized redirect URIs** list for your OAuth client.

## Fix (Configuration Only — No Code Changes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click on your **OAuth 2.0 Client ID** (the one whose Client ID matches your `GOOGLE_CLIENT_ID` secret)
3. Under **Authorized redirect URIs**, add exactly:
   ```
   https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/integration-oauth-callback
   ```
4. Save

**Note:** There is also a separate `planner-gcal-oauth-start` edge function that uses a *client-provided* `redirect_uri` (passed from the frontend). If you also use the Planner's Google Calendar connect button, that flow sends a different redirect URI. However, the Integrations page flow (which you're using) correctly uses the callback URL above. One redirect URI registration should fix the Integrations page flow.

