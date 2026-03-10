

# Fix: Smooth Tab Navigation (No Full-Page Reload)

## Root Cause

Each Life OS page is individually wrapped: `<LifeOSPage><Home /></LifeOSPage>`. When navigating between tabs, React unmounts the entire layout and remounts it. `useLifeOSAuth` starts with `isLoading: true` every time, showing the `SplashScreen` on every single tab switch.

## Solution

Use React Router's `<Outlet>` pattern so `LifeOSLayout` is a **persistent parent route** that stays mounted across tab navigations. Only the inner page content swaps. Add a lightweight shimmer transition instead of the splash screen for page content.

## Changes

### 1. Convert `LifeOSLayout` to an Outlet-based layout route

**`src/components/layout/LifeOSLayout.tsx`**
- Import `Outlet` from `react-router-dom`
- Remove the `children` prop; render `<Outlet />` in place of `{children}`
- Wrap `<Outlet />` in a `<Suspense>` with a lightweight page skeleton fallback (not `SplashScreen`)

### 2. Create a `PageShimmer` component

**`src/components/layout/PageShimmer.tsx`** (new file)
- A lightweight content placeholder with 3-4 skeleton cards that shimmer
- Uses existing `Skeleton` component, fades in smoothly
- Replaces `SplashScreen` as the Suspense fallback for lazy-loaded pages

### 3. Restructure routes in `App.tsx`

**`src/App.tsx`**
- Replace individual `<LifeOSPage>` wrappers with a single parent route:
```
<Route element={<LifeOSLayout />}>
  <Route path="/home" element={<Home />} />
  <Route path="/wellness" element={<Wellness />} />
  <Route path="/growth" element={<Growth />} />
  <Route path="/planner" element={<Planner />} />
  <Route path="/wealth" element={<Money />} />
</Route>
```
- Remove the `LifeOSPage` wrapper component
- Move the outer `<Suspense>` inside `LifeOSLayout` (around `<Outlet />`) so non-layout routes keep their own fallback

### 4. Add page transition animation

**`src/components/layout/LifeOSLayout.tsx`**
- Wrap `<Outlet />` in a framer-motion `AnimatePresence` with a fast fade (150ms) keyed on `location.pathname`
- This gives an instant, smooth feel without jarring full reloads

## Result

- Auth check runs **once** on initial load, persists across all tab switches
- Header, bottom nav, and desktop rail stay mounted — no flicker
- Only the page content area transitions with a quick shimmer/fade
- Lazy-loaded pages show lightweight skeleton cards instead of the branded splash screen

## Files

| Action | File |
|--------|------|
| Create | `src/components/layout/PageShimmer.tsx` |
| Edit | `src/components/layout/LifeOSLayout.tsx` — use `Outlet` + `Suspense` + fade |
| Edit | `src/App.tsx` — restructure to nested layout route |

