# Coach providers — draft, rollout off

PR-D adds optional bring-your-own (BYO) provider keys to the existing `ai-chat` endpoint. It does not create a new hosted tier, price, Stripe product, MCP server or deployment. JB selected OpenAI-compatible (OpenAI/OpenRouter) and Anthropic, with Supabase Vault. Users supply their own credentials. All provider verification in this PR uses synthetic credentials and mocked HTTP; no paid calls are made.

## Activation and routing

Both `coach_providers_enabled` client visibility (default false) and `coach_provider_rollout.coach_providers_enabled` server setting (default false) must be enabled for settings UI. Client flags/localStorage never authorize routing, key writes or quota changes. The authenticated edge function checks the server switch after `auth.getUser(token)`. Missing migration/flag-off/no key retains the existing Lovable gateway and its plan limits. A configured BYO key uses its selected fixed destination; failures do not silently switch providers or spend hosted credits. Remove key returns to the existing app coach.

Allowed bases are exactly `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`, and `https://api.anthropic.com`. Redirects are rejected, requests time out at 25 seconds, model identifiers are bounded, and upstream error bodies are discarded. Users select a model available to their provider account; availability and compatibility are not asserted by these mocked tests. OpenAI uses Chat Completions with `max_completion_tokens` and `store:false`; OpenRouter uses its compatible chat endpoint. Anthropic uses the Messages API with a top-level system prompt. BYO v1 is text-only: no app mutation tools are offered or executed. Existing gateway tools remain unchanged, including the second confirmation pass.

## Secrets and privacy

The owner-only key RPC writes Vault and returns only provider/last4. Named column grants exclude `vault_secret_id` and deny browser `select *`. There is no decrypt RPC. The edge uses its existing server-only `SUPABASE_DB_URL`, temporarily sets the database role to `service_role` in a transaction, and joins Vault only for the authenticated caller's user ID while the server switch is on. This environment value must be available in the target Edge runtime before an authorized rollout; its deployed presence and connectivity are not verified here. The browser never receives or caches decrypted keys. No `.env` or VITE secret is created. Removing a key prevents subsequent resolutions; an already in-flight provider request may finish.

Key writes/clear serialize on an owner advisory lock. Rotation updates the same Vault secret; clear removes it, including when rollout is off. Account deletion cascades settings and deletes the owned Vault secret. Keys remain until owner removal/account deletion. Account-scoped settings queries use no persistent cache and are cleared on unmount. The write-only password input is cleared after attempts and discarded on account change. The complete card is blocked from PostHog autocapture/session replay. No growth events, logs or storage carry credentials. Errors are generic, never provider/database error text.

The chosen provider receives conversation text and existing `ai-chat` context (including user-supplied snapshot, patterns and session history, plus server-fetched levels); choosing BYO does not create a new context source. Optional private Wellness check-ins from PR-B are not fetched by `ai-chat`. Existing memory/consent controls remain separate. Keys are never part of prompts. Settings explicitly disclose provider transmission and provider billing. This PR does not claim a provider's retention/privacy policy or modify it.

## Persona and limits

Only fixed tones balanced/warm/direct and depths concise/standard/detailed are accepted. The prompt appends locked identity/authority rules after the existing system prompt, followed by fixed style preferences. Awareness 🦉, Perspective 🐢, Habit 🦈, Wellness 🛰️ and Environment 🚀 remain canonical. The coach has no Scripture authority and cannot approve/publish content, complete circuits, close days or bypass review/auth/privacy controls. These prompt rules complement actual server authorization; they are not authorization themselves. No free-text persona is accepted.

**Assumption:** BYO has a separate cap of 100 attempted chat requests per UTC day for any authenticated tier, independent of hosted plan limits. A service-only atomic database reservation rejects request 101, fails closed on error, and increments aggregate `ai_usage_logs` without storing prompts, key material or health data. A real local concurrency test verifies exactly 100 of 105 simultaneous reservations succeed. Failed calls and invalid requests after reservation consume quota. Hosted messages retain existing plan limits and usage behavior. The existing hosted quota's read/update race and fail-open behavior on lookup error predate this PR and remain unchanged; BYO reservations do not use that path. Shared aggregate counts mean BYO usage also counts toward hosted daily limits when switching back that day.

## Deployment and rollback

Migration `20261020000200_coach_provider_settings.sql` is local only. Production needs JB's explicit authorization, security review of grants/Vault/runtime connectivity, and a separately authorized rollout. Keep the server switch off until those checks pass. Disable the server switch first to stop BYO routing; stored keys remain encrypted and removable. Do not drop Vault/settings while owners have keys. Roll back via reviewed forward-only changes. Supabase is the sole intended migration source; Drizzle cleanup waits for a separate tooling-dependency review.

JB selected existing **Pro** for future hosted coaching, with price **TBD**. PR-E is not implemented until PR-D is merged; no merge is authorized by this sequence. JB intends to read/edit Gospel framing drafts; content remains pending independent theological review and unpublished.

## Primary API references checked

- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [OpenRouter Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)
- [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
