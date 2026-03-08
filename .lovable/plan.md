

# Smart Push Nudges

Native web push notifications for installed PWA users with shame-free, context-aware messages.

## Architecture Overview

```text
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Client PWA  │────▶│  push_subscriptions │◀───│  send-push-nudge     │
│  (subscribe) │     │  table (DB)        │     │  edge function       │
└──────────────┘     └──────────────────┘     └──────────────────────┘
                                                        │
                                                        ▼
                                               Web Push API (VAPID)
```

## What Gets Built

### 1. Database: `push_subscriptions` table
Store Web Push subscription objects per user. Columns: `id`, `user_id`, `endpoint`, `p256dh_key`, `auth_key`, `created_at`, `updated_at`. RLS: users can insert/update/delete/select their own rows only.

### 2. VAPID Key Pair (Secret)
Generate a VAPID key pair. The **public key** goes in the frontend code. The **private key** gets stored as a backend secret (`VAPID_PRIVATE_KEY`). We'll also store `VAPID_PUBLIC_KEY` as a secret for the edge function, and a `VAPID_SUBJECT` (mailto: email).

### 3. Service Worker: Push event handler
Add `push` and `notificationclick` event listeners to `public/sw.js`. On push, display a notification with the message payload. On click, open the dashboard and focus the window.

### 4. Client: Push subscription flow
New `src/lib/pushNotifications.ts` utility:
- `subscribeToPush()`: requests `Notification.permission`, calls `registration.pushManager.subscribe()` with the VAPID public key, saves the subscription to `push_subscriptions` table.
- `unsubscribeFromPush()`: unsubscribes and deletes from DB.
- `isPushSupported()`: checks `'PushManager' in window`.
- `isPushSubscribed()`: checks current subscription state.

### 5. Profile Settings: Push toggle
Add a new "Push Notifications" option in the Reminders section of `ProfileSettingsModal.tsx`, between Calendar Reminder and Daily Alignment. Shows:
- A toggle switch for enabling/disabling push
- Label: "Push Reminders" with a "Free" badge
- Description: "A quiet nudge on your device. No email, no guilt."
- Only visible when `isPushSupported()` returns true (i.e., installed PWA or supported browser)

### 6. Edge Function: `send-push-nudge`
New edge function that:
- Queries `push_subscriptions` joined with `profiles` (for timezone) and `reset_sessions` (for context)
- For each user where it's their local morning (7 AM), builds a context-aware message:
  - Active snapshot, actions remaining → "One action left today. You're closer than you think."
  - No active snapshot → "Ready to start your next Snapshot?"
  - Returning after absence → "Welcome back. Pick the light version today."
- Sends via Web Push protocol using the `web-push` npm library (available via esm.sh)
- Handles expired subscriptions (HTTP 410) by deleting them from DB
- Logs to `email_nudge_logs` with status `push_sent` for unified monitoring

### 7. Config
Add `[functions.send-push-nudge]` with `verify_jwt = false` to `supabase/config.toml` (it will be called by a cron/scheduler, not directly by users).

## Nudge Copy (Shame-Free)
Every push includes one of these permission lines rotated:
- "Nothing is required today."
- "No pressure. Just a quiet check-in."
- "You don't have to open this."
- "Just a reminder that your Dashboard is here."
- "Show up if you want. Skip if you need to."

## What Does NOT Change
- Email nudge system remains as-is
- Calendar reminder remains as-is
- No changes to existing pages or routing

## Implementation Order
1. Request VAPID secrets from user
2. Create `push_subscriptions` table migration
3. Add push handlers to `sw.js`
4. Create `src/lib/pushNotifications.ts`
5. Add push toggle to `ProfileSettingsModal.tsx`
6. Create `send-push-nudge` edge function
7. Update `supabase/config.toml`

