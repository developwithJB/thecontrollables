

# Instagram OAuth + Stories Grid — Implementation Plan

## Overview
Extend the existing Integration Hub OAuth infrastructure to support Instagram (via Facebook/Meta OAuth). Add a new "Instagram" provider that lets users connect once, then fetches their recent stories/posts and displays thumbnails in a grid. Users pick a story thumbnail to feed into the existing IG Proof AI analysis flow.

## Key Technical Consideration
Instagram's API uses **Facebook OAuth** (Meta Graph API). The Instagram Basic Display API was deprecated in 2024. The current path is the **Instagram Graph API** via a Facebook Login flow, which requires:
- A Meta App with Instagram Graph API enabled
- Facebook OAuth → exchange for Instagram user token
- `instagram_basic` and `user_media` permissions (or `instagram_content_publish` for Business accounts)

For personal/creator accounts, the **Instagram Basic Display API replacement** is the `instagram_business_login` scope on the Meta Graph API. We'll use this approach.

## Secrets Required
- `INSTAGRAM_APP_ID` — Meta App ID
- `INSTAGRAM_APP_SECRET` — Meta App Secret

These must be added before the feature works.

## Database Changes
None beyond the existing `integration_connections` table — Instagram will be stored as provider `instagram` in the same table used by Google Calendar, Gmail, etc.

## Edge Function Changes

### 1. Update `integration-oauth-start/index.ts`
Add `instagram` to `PROVIDER_CONFIG`:
- Auth URL: `https://www.instagram.com/oauth/authorize`
- Client ID env: `INSTAGRAM_APP_ID`
- Scopes: `instagram_business_basic,instagram_business_content_publish` (or `user_profile,user_media` for Basic Display replacement)
- Response type: `code`

### 2. Update `integration-oauth-callback/index.ts`
Add `instagram` to `TOKEN_ENDPOINTS` and `CLIENT_ENV`:
- Token URL: `https://api.instagram.com/oauth/access_token`
- Then exchange short-lived token for long-lived token via `https://graph.instagram.com/access_token?grant_type=ig_exchange_token`
- Fetch user profile via `https://graph.instagram.com/me?fields=id,username`
- Store `provider_account_id` as Instagram username

### 3. Create `ig-stories-fetch/index.ts` (new edge function)
- Reads the user's Instagram connection from `integration_connections`
- Calls `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=25`
- For stories: filters by `media_type` or uses the stories endpoint
- Returns array of `{ id, caption, thumbnail_url, media_type, timestamp, permalink }`
- Handles token refresh if expired (using long-lived token refresh endpoint)

## Frontend Changes

### 1. Update `useIntegrations.ts`
- Add `"instagram"` to the `Provider` type
- Add Instagram to `PROVIDER_META` with name, description, icon, color

### 2. Update `Integrations.tsx`
- Add `"instagram"` to `ALL_PROVIDERS` array so it shows in the Integrations page grid

### 3. Create `useInstagramMedia.ts` (new hook)
- Fetches media from `ig-stories-fetch` edge function
- Returns `{ media, isLoading, refresh }`
- Caches with react-query (staleTime: 5 min)

### 4. Redesign `InstagramInputCard.tsx`
Replace the current two-tab (Caption/Screenshot) layout with a three-tab layout:
- **My Posts** — grid of Instagram thumbnails from connected account (requires connection)
- **Paste Caption** — existing caption textarea
- **Screenshot** — existing file upload

The "My Posts" tab:
- If not connected: show a "Connect Instagram" button that triggers OAuth
- If connected: show a grid of thumbnails with a refresh button
- Tapping a thumbnail selects it, auto-populates the caption (if available), and triggers AI analysis
- Thumbnails are downloaded and re-uploaded to `ig-proof-images` bucket (not hotlinked from Instagram)

### 5. Update `CommandModeView.tsx`
No changes needed — already wires `InstagramInputCard`.

## File Summary

| Action | File |
|--------|------|
| Edit | `supabase/functions/integration-oauth-start/index.ts` — add instagram provider |
| Edit | `supabase/functions/integration-oauth-callback/index.ts` — add instagram token exchange + long-lived token |
| Create | `supabase/functions/ig-stories-fetch/index.ts` — fetch user's media grid |
| Edit | `src/hooks/useIntegrations.ts` — add instagram provider type + meta |
| Create | `src/hooks/useInstagramMedia.ts` — hook to fetch/cache media grid |
| Edit | `src/components/dashboard/InstagramInputCard.tsx` — add "My Posts" tab with grid |
| Edit | `src/pages/Integrations.tsx` — add instagram to providers list |
| Edit | `supabase/config.toml` — add ig-stories-fetch function config |

## Flow
1. User taps "IG Proof" → sees three tabs
2. "My Posts" tab → "Connect Instagram" button (first time)
3. OAuth redirect → Meta login → callback saves tokens
4. Back on dashboard → "My Posts" shows thumbnail grid with refresh button
5. User taps a story/post thumbnail
6. App downloads thumbnail, uploads to storage, extracts caption
7. AI analyzes → ring suggestion → user confirms → saved as IG Proof entry

