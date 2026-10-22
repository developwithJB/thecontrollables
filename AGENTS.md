# The Dashboard repository instructions

## Canonical Controllables

These five names and emoji are product canon. Never substitute another mascot or icon:

- Awareness — 🦉
- Perspective — 🐢
- Habit — 🦈
- Wellness — 🛰️
- Environment — 🚀

Apply this mapping everywhere: UI, AI prompts, database-backed content, notifications, certificates, tests, documentation, metadata, and social graphics. In particular, Perspective is the Turtle and Wellness is the Satellite; Wellness is not a surfer.

Run `npm run test:unit -- tests/unit/controllable-emoji-contract.test.ts` after changing any Controllable presentation or copy.

## Account ownership

Use only developwithJB-owned accounts unless JB explicitly authorizes another account. On October 22, 2026, JB confirmed that the connected PostHog account is not his: do not query it, use its data, or install its project token. Keep optional PostHog analytics off until JB verifies an owned project and explicitly enables it. The existing Supabase growth sink remains the measurement path.
