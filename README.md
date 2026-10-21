# The Dashboard

Private daily Christian practice, connected to *The Controllables* book.

[Use the app](https://thedashboard.agbcoaching.com/) · [Plans](https://thedashboard.agbcoaching.com/pricing) · [Product guide](docs/PRODUCT_STORY.md) · [Contributor guide](CONTRIBUTING.md)

The Dashboard helps people practice five Controllables: **Awareness 🦉, Perspective 🐢, Habit 🦈, Wellness 🛰️, and Environment 🚀**. Awareness is where faith, Scripture, prayer, and the character of Jesus live. The app supports private reflection, small commitments, movement and rest, and service. Recording a practice does not measure anyone’s standing with God.

## What can I use?

- **Read Along:** a flexible book companion and daily practice path. Begin without a card, work at your own pace, and keep your records private.
- **Today:** one next action, five practice areas, and a receipt when all five are recorded. Closing a Read Along day acknowledges it in that browser; it does not award strict-day credit, XP, or promises.
- **My Controllables and Evidence:** personal history, practices, and existing promise/XP records. Formation practices are counted separately from legacy rewards.
- **Optional tools:** planning, goals, reflection, wellness, money, integrations, and AI coaching.
- **Fully Charged 75:** the strict 75-day path. Enrollment stays closed until all 75 days have reviewed, published content. Paying for Pro never opens this gate.

The book is purchased separately. You do not need Pro or an AI provider to use Read Along.

## Free, bring your own AI, or Pro

| Option | What it includes | AI limits |
| --- | --- | --- |
| Free | Read Along and private daily practice | Five hosted coach sample replies per verified account, subject to the shared sample allowance; the sample does not reset |
| Bring your own AI | Connect your OpenAI, OpenRouter, or Anthropic key; no platform AI fee | Up to 100 attempted chat requests per day; your provider bills you directly |
| Pro | Hosted coach and paid planning, history, and review tools | Up to 200 standard text coach replies per calendar month, at most 10 per day, subject to a shared monthly cost allowance |

Pro is **$14.99/month or $119.99/year**, before any applicable taxes. Existing subscriptions retain their billed rate. Plans, images, long conversations, summaries, and failed attempts can consume the shared AI allowance; there are no overage charges or unlimited-AI promises. The server is the authority for access and remaining allowance.

Stripe hosts checkout. Apple Pay appears on supported devices with an eligible Wallet card. A subscription to ChatGPT, Codex, Cursor, or another development tool does not pay this app’s inference bills.

## Run locally

Use **Node.js 22.13+** and npm. The existing GitHub Pages workflow uses Node 20; Node 22.13+ is the local baseline for the unit-test tooling.

```sh
git clone https://github.com/developwithJB/thecontrollables.git
cd thecontrollables
npm ci
cp .env.example .env.local
```

The repository currently includes a project-specific `.env` containing public client configuration. Set `.env.local` to your own development project; Vite gives it precedence. Never copy a service-role key or provider secret into it.

For a local UI review without a real account:

```sh
VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 5174
```

Open [local Today](http://127.0.0.1:5174/formation/today). The visible **Dev QA mock auth active** banner identifies a development-only session. It is not a Supabase login, does not authorize protected server operations, and cannot enable mock auth in a production build. Use synthetic data. Local UI review is not proof that billing, email, AI, or integrations are configured.

For real authentication, point `.env.local` at your own development Supabase project, configure its redirect URLs, and run `npm run dev`. Frontend configuration is documented in [.env.example](.env.example). Supabase schema and Edge Functions need a separately configured backend; a frontend build alone does not install them.

## Check a change

```sh
npm run test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm run lint
npm run test:unit -- tests/unit/controllable-emoji-contract.test.ts
```

Lint has an existing backlog; report errors and warnings rather than claiming the check is green. See [Testing](docs/TESTING.md) for named, localhost-only browser checks and isolated database/handler tests. Do not run an unfiltered E2E suite: the repository also contains production-targeting Stripe specs.

## Find your way around

```text
src/
  pages/          Route components, grouped by product area; files end in Page.tsx
  components/     Shared UI and feature components
  hooks/          React auth, query, and interaction hooks
  domain/         Formation rules and content models
  data/           Typed book, coach, and formation data access
  lib/            Shared product rules and adapters
  integrations/   Supabase client and generated database types
supabase/
  functions/      Deployed Edge Functions and shared server helpers
  migrations/     Canonical, ordered database history
scripts/          Local test harnesses, social-image rendering, and operator SQL
tests/           Unit, browser, Edge Function, and database checks
docs/            Product, architecture, testing, content governance, and release evidence
```

[Architecture and naming](docs/ARCHITECTURE.md) explains where code belongs and which names are stable contracts. [The docs index](docs/README.md) separates current guidance from dated release evidence.

## Customizing and contributing

Product copy lives with its page or component. Formation rules live in `src/domain/formation`; data access belongs in `src/data`; AI instructions and budgets run in `supabase/functions`. Read [CONTRIBUTING.md](CONTRIBUTING.md), [DESIGN.md](DESIGN.md), and [AGENTS.md](AGENTS.md) before editing.

GitHub is the code-review source; Lovable is connected to it for the hosted app. A fork or merge is not a complete backend deployment. Database migrations, function deployments, server secrets, and frontend publication are separate release steps. Do not replay applied migrations or treat generated Drizzle transport files as a second schema history.

Contributions must preserve owner-based access, private proof, server-owned billing/rewards, AI cost limits, and the independent content-review gate. Canonical Controllable names and emoji are fixed. Never rename database tables, RPCs, deployed function folders, event names, or persisted keys just to improve their appearance.

## Trust and release limits

- Personal check-ins are self-reported. They do not independently verify physical effort or grant strict 75-day completion.
- AI is optional assistance. It cannot approve Scripture guidance, publish lessons, complete circuits, or close strict days.
- Bible.com is a Scripture reference destination. YouVersion commercial/licensed-text/AI permission remains pending; do not describe an approved partnership or enable licensed-text integration by implication.
- The latest payment/security evidence records sandbox Apple Pay, signed webhook replay/cancellation, deployment verification, and known limitations. It is evidence from a specific date, not a permanent security guarantee.
- Strict content review, automatic WHOOP delivery, and push scheduling have separate release limits. Consult the [release evidence](docs/security/customer-launch-2026-10-21.md) before promising availability.

For private security reports, read [SECURITY.md](SECURITY.md). For ordinary improvements, use the [public feedback form](https://github.com/developwithJB/thecontrollables/issues/new?template=feedback.yml); leave out account details, health information, private reflections, credentials, and signed URLs.

## License

The source is public, but this repository does not yet contain a `LICENSE` file. A public repository alone does not grant a general reuse license. License selection is pending the owner’s decision. Book text, Bible translations, third-party assets, and dependencies may have separate rights; do not assume repository access grants rights to them.
