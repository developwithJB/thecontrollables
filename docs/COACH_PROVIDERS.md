# Bring your own AI provider

Users may connect their own OpenAI, OpenRouter, or Anthropic key for coach chat. They pay the selected provider directly; the Dashboard charges no platform AI fee for this path. Up to 100 attempted requests per day are reserved server-side. There is no automatic switch to paid hosted AI.

This is the current code guide, not a claim that every external provider was exercised live. Earlier PR-D rollout plans are historical; see the [release evidence](security/customer-launch-2026-10-21.md) for dated observations.

## Supported configuration

OpenAI-compatible and Anthropic adapters use supported provider configuration; this feature does not accept arbitrary model hosts or install an MCP server. Fixed tone options are balanced/warm/direct; fixed depth options are concise/standard/detailed. No free-text system persona can override locked identity or authority rules.

The settings UI requires client visibility and independent server rollout. Frontend defaults currently enable coach visibility; the server setting, authenticated owner, and configured backend remain authoritative. Do not assume a fork is ready to call providers just because the card renders.

## Key lifecycle

Keys are stored encrypted in Supabase Vault. Owner-scoped settings return the provider and last four characters, never a decrypted key or Vault reference. Browser `select *` and decrypt RPCs are not exposed. The server resolves only the authenticated owner’s selected key while its rollout is enabled.

The write-only password field is cleared after attempts and account changes. The settings card excludes replay/autocapture; prompts, logs, local storage, growth events, and error messages must not carry key material. Named server credentials such as `SUPABASE_DB_URL` belong in Edge Function secrets, never `VITE_` values.

Writes and deletion serialize on an owner lock. Rotation updates the owned Vault secret. Clearing a key prevents subsequent resolution, though an already running request may finish. Account deletion cascades owned settings and Vault cleanup. Do not drop settings/Vault data as a rollback strategy.

## Routing, cost, and consent

The selected provider receives the conversation and the existing coach context disclosed in settings. Choosing a provider does not create a new private context source or imply any provider retention promise. A server-only atomic reservation caps attempted requests; failed requests consume quota. The current hosted budget is a separate authority described in [Hosted AI](HOSTED_COACH.md). Do not rely on historical aggregate logs as quota authority.

Saving a new personal key explicitly deselects hosted mode. Hosted selection preserves a saved key; deselection does not delete it. Disabled or missing selection fails clearly instead of routing private text to another provider.

Awareness 🦉, Perspective 🐢, Habit 🦈, Wellness 🛰️, and Environment 🚀 remain canonical. The coach cannot approve Scripture guidance, publish lessons, complete circuits, or close strict days. Its prompt rules complement actual server permissions; prompts alone are not authorization.

## Source and verification

- `src/components/settings/CoachSettingsCard.tsx`: private settings UI.
- `src/data/coach/coachSettings.ts`: typed settings requests.
- `supabase/functions/_shared/coachProvider.ts` and `coachCredentials.ts`: provider routing and server key resolution.
- `supabase/functions/ai-chat/index.ts`: authenticated chat entrypoint.
- `supabase/migrations/20261020000200_coach_provider_settings.sql`: original provider settings history.

Verify source paths against the repository when changing the adapter. Use mocked provider tests; never create a key or send a real private conversation just to verify naming/copy. Migration/configuration changes need separate review. Supabase is the canonical migration source; generated Drizzle transport SQL is not a second stream to apply.

Primary API references: [OpenAI](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [OpenRouter](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion), [Anthropic](https://platform.claude.com/docs/en/api/messages/create), [Supabase Vault](https://supabase.com/docs/guides/database/vault). These are external references, not permission to transmit user data.
