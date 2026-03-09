

# Responsive Layout Overhaul — Desktop, Tablet, and Large Screen Support

## Problem

Every page and component uses `max-w-md` (448px) as its container width. On anything larger than a phone, this creates a narrow strip of content floating in empty space. The app looks broken on tablets, laptops, and especially large screens / smart displays.

## Strategy

Rather than redesigning every component, we make the **container widths responsive** and add **multi-column layouts at breakpoints** where cards can flow side-by-side. The mobile experience stays identical.

### Breakpoint Tiers

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile (default) | < 768px | Single column, current behavior |
| Tablet (`md`) | 768px–1279px | Wider container, 2-column card grid |
| Desktop (`lg`) | 1280px–1919px | Sidebar nav + 2-col content area |
| Large/TV (`xl`) | 1920px+ | 3-column dashboard, bigger type |

## Changes

### 1. Dashboard Page (`src/pages/Dashboard.tsx`)

**Header / Tab bar / Main / Footer**: Replace all `max-w-md` with `max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl`.

**Dashboard tab content**: Wrap the card stack in a responsive grid:
- Mobile: single column (`space-y-4`)
- Tablet: `md:grid md:grid-cols-2 md:gap-4` — cards flow into two columns
- Desktop: `lg:grid-cols-3` — three columns for information-dense view

Group cards into "primary" (Today Actions, Daily OS, Greeting) that span full width, and "secondary" (Planner, Money, Wellness, Brain/Body, etc.) that fill the grid.

**Experience tab**: Similar 2-col grid for history cards at `md`.

**Insights 2x2 grid**: Already grid-cols-2; at `lg` expand to grid-cols-4 (all four modules in one row).

### 2. Landing Page (`src/pages/Landing.tsx`)

- Nav: `max-w-md md:max-w-3xl lg:max-w-5xl`
- Hero section: wider container, larger text at `md` and `lg` (`md:text-4xl lg:text-5xl`)
- Controllables grid: stays 2-col on mobile, becomes `md:grid-cols-3 lg:grid-cols-5` (all five in one row on desktop)
- Remove the awkward centered 5th card — at `md+` all five fit in one row

### 3. Landing Sub-Sections

**`HowItWorksSection.tsx`**, **`FeatureGrid.tsx`**, **`WhyStartSection.tsx`**, **`PhilosophySection.tsx`**, **`TrustDisclosure.tsx`**: Replace `max-w-md` with `max-w-md md:max-w-3xl lg:max-w-5xl`.

**FeatureGrid**: Items go `md:grid-cols-2 lg:grid-cols-3` instead of stacked.

### 4. Money Page (`src/pages/Money.tsx`)

Replace `max-w-lg` with `max-w-lg md:max-w-4xl lg:max-w-6xl`. Tab content areas use `md:grid md:grid-cols-2 md:gap-4` where applicable (e.g., overview + controllables side by side, bills + subscriptions side by side).

### 5. Planner Page (`src/pages/Planner.tsx`)

Already has a week grid view. At `lg+`, give the day view and week grid more horizontal room by widening the container.

### 6. Integrations Page (`src/pages/Integrations.tsx`)

Provider card grid: `md:grid-cols-2 lg:grid-cols-4` so all four providers show in one row on desktop.

### 7. Auth Page

Widen auth container slightly at `md` for a more balanced look.

### 8. Global CSS / Tailwind Config

No config changes needed — standard Tailwind breakpoints are sufficient.

### 9. Typography Scaling

Add responsive text sizes to key headings:
- Hero: `text-2xl md:text-4xl lg:text-5xl`
- Section headings: `text-xl md:text-2xl`
- Body/descriptions: `text-sm md:text-base`

This ensures large screens don't feel like zoomed-in phone screens.

## Files to Modify

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Responsive containers + multi-column card grid |
| `src/pages/Landing.tsx` | Wider hero, responsive controllables grid |
| `src/components/landing/HowItWorksSection.tsx` | Wider container + grid |
| `src/components/landing/FeatureGrid.tsx` | Wider container + multi-col grid |
| `src/components/landing/WhyStartSection.tsx` | Wider container |
| `src/components/landing/PhilosophySection.tsx` | Wider container |
| `src/components/landing/TrustDisclosure.tsx` | Wider container |
| `src/pages/Money.tsx` | Wider container + 2-col tab content |
| `src/pages/Planner.tsx` | Wider container |
| `src/pages/Integrations.tsx` | Responsive provider grid |
| `src/pages/Auth.tsx` | Slightly wider at md |

## Design Principles

- Mobile layout is untouched — no regression risk
- Cards themselves don't need internal redesign; they already use relative widths
- The grid system handles distribution automatically
- Large screens show more information density, not just bigger whitespace
- Smart display / kitchen TV use case benefits from the 3-col layout with larger text

