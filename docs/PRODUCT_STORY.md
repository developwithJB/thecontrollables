# Product guide

The Dashboard turns *The Controllables* book into private daily Christian practice. It helps a person notice what matters, choose a small action, record it honestly, and return after a difficult day. It does not measure spiritual worth or independently verify physical effort.

## The five Controllables

| Controllable | Daily purpose |
| --- | --- |
| Awareness 🦉 | Faith, Scripture, prayer, and learning the character of Jesus |
| Perspective 🐢 | Notice the story you are telling and choose a faithful response |
| Habit 🦈 | Turn an intention into one clear commitment |
| Wellness 🛰️ | Care for nutrition, hydration, movement, sleep, and rest |
| Environment 🚀 | Shape your surroundings and make room to serve |

These names and emoji are fixed across UI, content, prompts, and notifications.

## A newcomer’s path

1. Start with Read Along from the landing page.
2. Choose reading context and a practice path in Quick Start, then create an account.
3. Open Today and choose one meaningful practice. Awareness links to Scripture and reflection prompts.
4. Record the practice privately. Proof and private prayer do not have to be shared.
5. Return for another practice. At five of five, the flexible path shows a receipt; its browser acknowledgement does not award strict-day credit, XP, or promises.

Read Along is available without a card or AI subscription. The strict Fully Charged 75 path has a separate server gate: all 75 days must have independently reviewed, published effective content before enrollment. UI flags and payment cannot bypass it. The 40-Day Charge option remains unavailable; do not promise it can be started.

## What users see

| Surface | Purpose |
| --- | --- |
| Today | Five daily practice areas, one next action, and saved-practice receipts |
| Read Along | Book-connected reading progress and flexible practice |
| My Controllables | Personal profile, commitments, and separately counted formation practices |
| Evidence | Personal record of practices, promises, milestones, and reflections |
| Proof collection | Existing Controllables Dex: private proof entries with deliberate sharing controls |
| Planner, Goal, Timeline | Plans, dated goals, and personal history |
| Wellness, Money, Growth, Reflect | Optional supporting tools |
| Coach | Optional AI support, with consent, provider selection, and server limits |
| Billing, Integrations | Subscription management and optional external connections |
| Admin | Role-protected operational and content-review tools |

The app preserves older dashboard, reset, XP, and promise records alongside formation. A saved formation practice is not automatically XP or a promise kept. Personal rings and historical check-ins are self-reported; they are not reviewed strict-day completion.

## AI and plans

Free accounts can receive five hosted sample coach replies per verified account, subject to the shared allowance. The sample does not reset. Bring-your-own AI supports OpenAI-compatible providers (OpenAI/OpenRouter) and Anthropic with owner-supplied keys encrypted in Supabase Vault. Provider billing is separate; the app caps attempted chat requests at 100 per day and never silently switches to hosted AI.

Pro is $14.99/month or $119.99/year before applicable tax. It provides hosted coaching and paid planning/review/history tools, with up to 200 standard text coach replies per calendar month, at most 10 per day, subject to the shared monthly cost allowance. Long prompts, images, summaries, plans, and failed attempts can reduce the available count. Existing subscribers retain their billed rate. The server decides access and allowance; the browser never awards itself a tier.

AI can be wrong. It is assistance, not Scripture authority, therapy, or diagnosis. It cannot approve lessons, publish formation content, record circuits, or close strict days. Generated answers do not replace reviewed lesson content.

The book is a separate purchase. Pro is not required to buy or read it, and buying it does not grant an AI subscription.

## Scripture, review, and feedback

Bible.com is the Scripture reference destination. Gospel-first Awareness uses Observe, Understand, and Respond prompts. Draft framing remains labeled pending independent theological review; it is not automatically published to enrolled attempts. JB studies with the NLT and invites corrections.

YouVersion licensed-text/commercial/AI permission remains pending. Do not call YouVersion an approved official partner or enable API text/AI ingestion by implication. Translation and book rights are separate from repository access.

The GitHub feedback form is public. Ask users to omit private prayers, health information, names, account details, credentials, and signed URLs. Security reports follow [SECURITY.md](../SECURITY.md).

## Privacy and deployment

Owner-scoped authentication, RLS, private proof, and private certificate storage are server boundaries. Share only deliberately selected safe fields; never collect private reflections or provider keys in analytics. Local storage and client flags are preferences, not authority.

The hosted product combines GitHub review, Lovable frontend publication, and separately deployed Supabase schema/functions/secrets. A fork needs its own backend and external service configuration. Development-tool subscriptions do not pay app inference costs.

See [the README](../README.md) for setup, [architecture](ARCHITECTURE.md) for source locations, and [the docs index](README.md) for current guides and dated release evidence. The strict content gate, paused automatic WHOOP ingress, and unverified push scheduling retain their separate release limits.
