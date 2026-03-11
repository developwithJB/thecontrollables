

# Phase 2: Daily Decision-Making Hierarchy — System-Wide Implementation

## What This Is

Encode a 4-tier daily goal hierarchy as a product rule that governs the Today page layout, AI briefing logic, dashboard intelligence prompts, and README/branding. This is a structural and prompt-engineering task — no new features, but a reorganization of existing ones plus documentation overhaul.

## The Hierarchy (for reference)

- **Tier 1 (Must Answer)**: What kind of day? How am I doing? What matters most?
- **Tier 2 (Strong Support)**: What should I eat? What should I protect? What should I simplify?
- **Tier 3 (Close the Loop)**: Did I get a win? What should I adjust tomorrow?
- **Tier 4 (Not Daily Required)**: Blessing, deep reflection, weekly patterns, broader impact

## Changes

### 1. Create Product Hierarchy Documentation
**New file**: `docs/DAILY_HIERARCHY.md`

Document the 4-tier hierarchy as a product rule. Include tier definitions, page-by-page application, AI/recommendation rules, prompt rules, and feature prioritization guidance. This becomes the canonical reference for all future feature decisions.

### 2. Reorder Home.tsx Layout to Follow Hierarchy

Current order:
1. Greeting → 2. Readiness Bar → 3. Daily Briefing → 4. Today Actions → 5. Plan vs Actual → 6. Fuel Today → 7. Compact Rings → 8. Forecast → 9. Weekly Review Teaser → 10. Ask Dashboard

New order (Tier 1 first, Tier 2 supportive, Tier 3 lighter, Tier 4 removed from daily):
1. **Greeting** (orientation)
2. **Readiness Bar** (Tier 1: How am I doing?)
3. **Daily Briefing** (Tier 1: What kind of day? What matters most?)
4. **Today Actions** (Tier 1: What matters most — actionable form)
5. **Compact Rings** (Tier 1: visual progress check)
6. **Fuel Today** (Tier 2: What should I eat?)
7. **Plan vs Actual** (Tier 1/2: schedule reality)
8. **Ask Dashboard** (utility — always available)
9. **Weekly Review Teaser** (Tier 4: only Thu–Sun, stays light)
10. **Forecast** (Tier 3/4: predictive, not daily-critical — move lower)

Key change: Move Compact Rings up (Tier 1 — "How am I doing?"), move Forecast down (predictive = Tier 3/4), keep Fuel Today in Tier 2 position.

### 3. Update `ai-briefing` System Prompt — Hierarchy-Aware

Add the tier hierarchy to the system prompt so the briefing follows this exact priority:
1. Day type label (Tier 1)
2. Interpretation: body + calendar + context synthesis (Tier 1)
3. Focus: one clear next move (Tier 1)
4. Watchout: what to protect or simplify (Tier 2)

Add explicit instruction: "Do NOT include deep reflection, impact tracking, or blessing prompts. Keep this operational and practical. One clear read, not a list of recommendations."

### 4. Update `dashboard-intelligence` System Prompt — Reduce Volume

Current prompt requests 3–4 recommended actions, 2–3 memory comparisons, 4–5 center rotations, and multi-horizon forecasts. This creates information overload.

Changes to the system prompt:
- Reduce `recommended_actions` from 3–4 to **1–2** ("prefer one strong recommendation over many weak ones")
- Add instruction: "Prioritize clarity over volume. The user should leave with ONE clear next move, not a list."
- Add: "Do not suggest deep reflection, blessing tracking, or impact storytelling as daily actions."
- Keep forecasts but note they're secondary signals, not primary daily content

### 5. Overhaul README.md — Professional Product Documentation

Remove all Lovable branding. Rewrite as a professional product README for The Dashboard by AGB Coaching.

Key changes:
- Remove `*Built with [Lovable](https://lovable.dev)*` footer
- Replace `Lovable AI` references with "Built-in AI" or "AI-powered"
- Replace `Lovable Cloud` references with "Cloud infrastructure" or just omit
- Remove `thecontrollables.lovable.app` URL — replace with `thedashboard.agbcoaching.com`
- Add the Daily Hierarchy as a prominent section in the README
- Update the "Daily Usage" section to reflect the hierarchy:
  - Morning: Review your briefing (Tier 1), check Today Actions (Tier 1)
  - Throughout: Complete planned items, check Fuel (Tier 2)
  - Evening: Close a ring, log a win (Tier 3)
- Remove overly technical internal details that aren't user-facing
- Add "Product Philosophy" section with the hierarchy baked in
- Clean up edge function table (internal detail — move to a separate `docs/ARCHITECTURE.md` or trim)

### 6. Update index.html — Remove Lovable References

The `index.html` currently has no direct Lovable branding in visible content (good). The `dns-prefetch` to Supabase is functional, not branding — keep it. No changes needed here.

### 7. Add Hierarchy Comment Headers to Home.tsx

Add clear section comment headers in the render block that reference the tier system, making it easy for future development to maintain the hierarchy:
```
{/* TIER 1 — What kind of day? How am I doing? */}
{/* TIER 2 — What should I eat? What should I protect? */}
{/* TIER 3 — Did I get a win? */}
```

## Files to Create
| File | Purpose |
|---|---|
| `docs/DAILY_HIERARCHY.md` | Canonical product rule document for the 4-tier hierarchy |

## Files to Modify
| File | Change |
|---|---|
| `src/pages/Home.tsx` | Reorder layout to follow hierarchy (Rings up, Forecast down), add tier comment headers |
| `supabase/functions/ai-briefing/index.ts` | Add hierarchy awareness to system prompt, reduce fluff |
| `supabase/functions/dashboard-intelligence/index.ts` | Reduce recommended_actions to 1–2, add "clarity over volume" instruction |
| `README.md` | Full rewrite: remove Lovable branding, add hierarchy section, professionalize |

## What Does NOT Change
- No database migrations
- No new components
- All existing features preserved — just reordered and prompt-tuned
- Weekly review, forecast, and deeper features stay — just positioned correctly per tier
- Landing page has no Lovable branding (already clean)

