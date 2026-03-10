

# Multi-fix: OAuth popup, integrations cleanup, IG Proof access, and planner visibility

## 1. OAuth popup not closing (especially mobile)

**Problem**: The popup relies on `window.opener.postMessage()` which fails in mobile browsers (many open OAuth in a new tab, not a popup, so `window.opener` is null). The window hangs open.

**Fix**: In the `integration-oauth-callback` edge function, add a **redirect fallback**. If `window.close()` doesn't work after 1 second, redirect the page back to `/integrations?integration_success=<provider>` so on mobile the tab navigates back to the app instead of hanging. Also increase the close delay and add a "Close this tab" manual link as a last resort.

**File**: `supabase/functions/integration-oauth-callback/index.ts`

## 2. Remove Todoist and Notion from integrations

**Changes**:
- `src/pages/Integrations.tsx` — Remove `"todoist"` and `"notion"` from `ALL_PROVIDERS` array
- `src/hooks/useIntegrations.ts` — Remove `"todoist"` and `"notion"` from the `Provider` type and `PROVIDER_META`
- `supabase/functions/integration-oauth-start/index.ts` — Remove todoist/notion from `PROVIDER_CONFIG`
- `supabase/functions/integration-oauth-callback/index.ts` — Remove todoist/notion from `TOKEN_ENDPOINTS` and `CLIENT_ENV`

## 3. IG Proof access from dashboard after connection

**Problem**: Once IG is connected, there's no persistent entry point to use IG Proof from the dashboard. It's buried behind a quick-access button that only shows as a fallback.

**Fix**: In `CommandModeView.tsx`, surface the IG Proof button more prominently — move it out of the fallback section into a persistent quick-access row below the Daily Rings. Only show it when the user has an active Instagram connection (query `integration_connections` for `instagram` with status `active`).

**File**: `src/components/dashboard/CommandModeView.tsx`

## 4. Clear navigation to Planner from the dashboard

**Problem**: Planner is only accessible via a small quick-access button hidden in the fallback section. Planning is a core daily action.

**Fix**: Add a persistent "Plan Your Day" card/button below the Daily Rings alongside IG Proof. This ensures the Planner is always one tap away from the focus view, not buried in AI recommendations fallback.

**File**: `src/components/dashboard/CommandModeView.tsx`

## Summary of file changes

| File | Change |
|------|--------|
| `supabase/functions/integration-oauth-callback/index.ts` | Add redirect fallback for mobile; remove todoist/notion |
| `supabase/functions/integration-oauth-start/index.ts` | Remove todoist/notion config |
| `src/hooks/useIntegrations.ts` | Remove todoist/notion from type and meta |
| `src/pages/Integrations.tsx` | Remove todoist/notion from provider list |
| `src/components/dashboard/CommandModeView.tsx` | Add persistent Planner + IG Proof buttons below rings |

