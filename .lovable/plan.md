

# Fitbit Secrets + Landing Page Reframe

## 1. Store Fitbit Secrets

The `wearable-oauth-start` and `wearable-oauth-callback` edge functions already handle Fitbit (client ID, token exchange). The only missing piece is storing the credentials:

- Use `add_secret` to store `FITBIT_CLIENT_ID` and `FITBIT_CLIENT_SECRET` with the values the user provides.

No code changes needed for Fitbit OAuth — it's already wired up.

---

## 2. Landing Page — Reframe Hero Visual

Current hero has: **Plan → Live → Learn** with Calendar → Dashboard → Wearable icons.

The user wants the Dashboard to sit **in the middle** with arrows coming in from both sides: **Plan → Learn ← Live**. The Dashboard (Learn) receives data from both the calendar (Plan) and the wearable (Live).

### `src/pages/Landing.tsx`

- Reorder the three-icon visual to: **Plan** (Calendar) → **Learn** (Dashboard, center) ← **Live** (Wearable)
- Use `→` after Plan and `←` before Live to show data flowing **into** the Dashboard from both sides
- Update the hero tagline to emphasize the Dashboard as the passive intelligence layer sitting between your tools — minimal data entry, maximum insight
- Add a small "Wearables" badge row beneath the icon triad showing WHOOP, Oura, Fitbit logos/names

### `src/components/landing/HowItWorksSection.tsx`

- Update the "Connect Your Tools" step to explicitly list WHOOP, Oura, and Fitbit alongside Google Calendar
- Refine descriptions to reinforce the "Dashboard sits in the middle" messaging — your tools push data in, the Dashboard surfaces what matters

---

## Files Summary

| Action | File |
|--------|------|
| Secret | `FITBIT_CLIENT_ID` + `FITBIT_CLIENT_SECRET` — store via add_secret |
| Edit | `src/pages/Landing.tsx` — reorder hero icons to Plan → Learn ← Live, update tagline |
| Edit | `src/components/landing/HowItWorksSection.tsx` — add WHOOP/Oura/Fitbit to integrations step |

