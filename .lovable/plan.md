

# Fix Instagram "Insufficient Developer Role" + Build Errors

## Instagram Issue

The "Insufficient Developer Role" error is a **Meta App configuration issue**, not a code bug. From your screenshot, the "Instagram Testers" tab shows **0 testers**. Being a Meta App Administrator does not automatically grant Instagram API access in Development mode.

**You need to do this in the Meta Developer Portal:**
1. Go to **App Roles** → click the **Instagram Testers** tab
2. Click **Add People** and enter your Instagram username
3. Then on Instagram, go to **Settings → Apps and Websites → Tester Invites** and accept the invitation
4. Retry the connection

No code changes needed for this.

## Build Errors (must fix)

Two TypeScript errors unrelated to Instagram:

### 1. `ErrorBoundary.tsx` line 111
`process.env.NODE_ENV` doesn't exist in Vite. Replace with `import.meta.env.DEV`.

### 2. `OnboardingFlow.tsx` line 76
`NodeJS.Timeout` type doesn't exist in browser. Replace with `ReturnType<typeof setTimeout>`.

## Files to Change

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.tsx:111` | `process.env.NODE_ENV === "development"` → `import.meta.env.DEV` |
| `src/components/onboarding/OnboardingFlow.tsx:76` | `NodeJS.Timeout` → `ReturnType<typeof setTimeout>` |

