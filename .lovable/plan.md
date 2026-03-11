

# Fix: Quick Wins buttons navigating to non-existent routes (404)

## Problem
The Daily OS plan has two sources of quick wins:
1. **Hardcoded** quick wins (log wellness, open planner, review promises) — these use valid routes
2. **AI-generated** quick wins from the LLM prompt — the prompt says to use `/planner`, `/reset`, or `/dashboard` but the AI model sometimes returns arbitrary paths like `/build/environment` that don't exist

The `handleQuickAction` function blindly calls `navigate(link)` on whatever the AI returns, leading to 404s.

## Solution — Two-layer fix

### 1. Frontend: Validate links before navigating (`DailyOSCard.tsx`)
Add a whitelist of valid routes in `handleQuickAction`. If the `action_link` doesn't match a known route, fall back to `/home` instead of navigating to a 404.

```typescript
const VALID_ROUTES = ["/home", "/dashboard", "/planner", "/wellness", "/growth", "/wealth", "/reset"];

const handleQuickAction = (link: string, label: string) => {
  trackEvent("daily_os_interaction", "daily_os_quick_action_tapped", { action: label });
  if (link.startsWith("/")) {
    const target = VALID_ROUTES.includes(link) ? link : "/home";
    navigate(target);
  }
};
```

### 2. Edge function: Tighten AI prompt constraints (`daily-os-plan/index.ts`)
Update the prompt's `action_link` allowed values to include `/home`, `/growth`, `/wellness`, `/wealth` (the actual valid routes) and add an explicit instruction: "Do NOT invent routes."

## Files
| Action | File |
|---|---|
| Edit | `src/components/dashboard/DailyOSCard.tsx` — add route whitelist to `handleQuickAction` |
| Edit | `supabase/functions/daily-os-plan/index.ts` — update allowed `action_link` values in prompt |

