# YouVersion integration and partnership approval

The Dashboard can deepen Gospel-first Awareness with licensed source retrieval and exact quotation checks. Production API activation requires written clearance for our commercial app and for using Platform services in an app with open-ended AI coaching. The current [Platform FAQ](https://www.youversion.com/platform) excludes subscriptions, purchases, upgrades, advertising and indirect revenue generation. Free access to Scripture inside a paid app is not an established exception. The Dashboard offers Pro and promotes a separately sold book, so neither an app key nor a content-partner application establishes permission for this use.

## Implemented for review

The public `/scripture` companion links each selected Gospel passage to the NLT on Bible.com, identifies YouVersion as that site's provider, and offers the three Awareness prompts. Landing's sample, Read Along, reviewed Gospel cards and the optional coach link to it. It does not import text, grant XP, complete circuits, replace reviewed assignments, or claim official partnership.

`scripture-passage` is an authenticated, verified-email endpoint with `verify_jwt = true`. Its passage and quote-check operations are disabled unless all server prerequisites exist. It uses fixed `api.youversion.com/v1` routes, declines redirects, requests plain text, requires matching version/book/reference and publisher attribution, and returns safe error classifications with `Cache-Control: no-store`. No service-role credential, database migration or licensed local corpus is needed. No prayers, user identifiers, private history or pasted quotation go to YouVersion; only the reference and configured version do. Quote text is compared on our server and is not logged or stored by this feature. Platform itself may record request/engagement information; confirm privacy terms before activation.

The optional reader UI is hidden by default. Once approved, it displays returned text as escaped plain text, version abbreviation and current copyright (or `promotional_content` when copyright is absent). Source errors retain the Bible.com link; no silent substitution to another translation occurs. Quote checks compare the entire selected verse/range, preserving case and punctuation and normalizing only Unicode composition/whitespace. An excerpt, omitted negation, changed word, changed punctuation, or different source/version cannot receive an exact-match verdict. This verifies wording, not interpretation, context or theological approval.

All three coach providers now receive a locked instruction to avoid memory-based Scripture quotations and endorsement claims. Their common response boundary withholds recognizable attributed quotations and claimed verified quotations. This is a conservative pattern filter with possible false positives and undetected unmarked paraphrases. It is not an assertion that every coach statement is grounded. The approved reader/checker is a separate source tool; licensed text is **not** sent to hosted or BYO models. Automated retrieval-augmented coaching remains deferred until commercial and AI-specific rights are clear.

## Official integration instructions

The [official platform-skills](https://github.com/youversion/platform-skills/tree/afa623654165b6d53df56a250af655c76cbddd94) REST and React skills were inspected at commit `afa6236`. The [API documentation](https://developers.youversion.com/api/bibles) defines metadata and passage schemas. The server follows the REST skill; the current UI needs no new third-party SDK or MCP installation.

After written approval, the operator must register the app at [YouVersion Platform](https://platform.youversion.com), accept the applicable publisher licenses, and discover available versions using this app's catalog (`GET /v1/bibles?language_ranges[]=en`, without `all_available=true`). NLT availability is unknown. Bible.com's ID 116 is used only for the existing outbound NLT links; it is not assumed available to our app key. Record the approved version and approval scope privately; never invent catalog results.

Server configuration, all absent/off by default:

- `YOUVERSION_API_ENABLED=true` only after permission and runtime verification.
- `YOUVERSION_COMMERCIAL_APPROVAL`: internal reference to the actual written permission; this string is rollout metadata, not proof or a substitute for permission.
- `YOUVERSION_AI_APP_APPROVAL`: reference to written clearance for this app’s open-ended coaching, even if the reader never forwards Scripture to a model. Future model-context permission is a separate scope.
- `YVP_APP_KEY`: existing approved app key, entered only through server configuration. The current Platform Terms require access credentials to remain confidential; this takes precedence over the skill’s description of a public app identifier. Do not distribute it to clients or independent forks. Do not create a credential or accept terms without the required user action/approval.
- `YOUVERSION_BIBLE_ID`: numeric ID discovered in this app key's licensed catalog.
- `VITE_YOUVERSION_READER_ENABLED=true`: UI visibility only; never authorizes API access. No key or approval document belongs in a `VITE_` variable.

Do not activate production, embed the React reader, provision Sign in with YouVersion, send licensed text to any model, add Verse of the Day, or use partner logos until the relevant permissions are settled. Future SSO must link to an already authenticated Supabase identity with explicit consent; do not merge identities by email or weaken RLS. Verse of the Day, if approved, is optional discovery and must never replace assigned Gospel readings or the 75-day review gate.

## Documentation compliance audit — October 20, 2026

- [Overview](https://developers.youversion.com/overview) and [API usage](https://developers.youversion.com/api-usage): direct REST is supported; every request uses `X-YVP-App-Key` on the fixed API host. Catalog discovery is an operator prerequisite, with pagination followed until `next_page_token` is absent. A metadata response is not evidence of publisher access: a subsequent passage 403 remains a denial, with no alternate translation substituted.
- [Bible API](https://developers.youversion.com/api/bibles) and [USFM](https://developers.youversion.com/usfm-reference): bounded Gospel references map to official USFM book IDs. Current implementation requests only `format=text`. Unsupported or unavailable references fail safely.
- [Error codes](https://developers.youversion.com/error-codes): 204 is handled before parsing and becomes an empty-result response, never fabricated text. Plain-text 429 and other non-success bodies are not parsed or echoed. `Retry-After` controls an advisory per-instance cooldown and disabled browser retry buttons; there are no automatic retries. This is backoff, not a distributed rate limit. Only safe error categories are logged.
- [Copyright and attribution](https://developers.youversion.com/sdks/javascript/guides/copyright-and-attribution): metadata is fetched afresh for each passage/check, with copyright preferred over `promotional_content`; missing both fails closed. Display uses escaped plain text and visible attribution. [HTML rendering requirements](https://developers.youversion.com/guides/display-bible-html), including Bible CSS, scoped containers and Fonts API stylesheets, apply if an HTML reader is added later. No HTML rendering or self-hosted Bible fonts are present.
- [Platform Terms](https://platform.youversion.com/terms), last modified August 17, 2026, were read in the registration modal without accepting them. Commercial use, open-ended AI, credential confidentiality and brand wording require the applicable written permissions. Neither a rollout string, app registration nor a successful catalog response grants those rights. No official-partner claim is made.
- [Sign-in APIs](https://developers.youversion.com/sign-in-apis): SSO remains deferred. Any future implementation must follow the documented state validation, PKCE S256, nonce and callback sequence, request only approved scopes, and preserve explicit account-link consent. No claim of implemented YouVersion sign-in is made.

These are code and documentation checks using synthetic fixtures. Live publisher licensing, actual payloads, approved app configuration and API behavior remain unverified until registration and written approval are complete. The status operation reports configured readiness only, not a licensing verdict.

## Third party MCP assessment

[scripture-grounding-mcp](https://github.com/The-Doxa-Way/scripture-grounding-mcp) is a third-party project, not an official YouVersion server. Its retrieval/checking design is useful, but its source supports fuzzy minor-variance verdicts, cross-translation comparisons and keyless BSB corpus fallback. Those are not an NLT exact-wording guarantee. We do not install it or forward customer data to its hosted demo. Our small deterministic checker rejects all nonexact wording and has no fallback corpus. This avoids an extra public service and additional credential transport while permissions are unresolved.

## Commercial use approval request

**Status:** Submission attempted on October 20, 2026; not sent. The authenticated Platform support page rejects Contact Support because this account has no Developer ID. Fresh sign-in leads to required developer registration (legal entity, address and acceptance of Terms). Registration was left unsubmitted with Terms unchecked; awaiting JB’s registration or authorization of the alternative support-email channel. JB confirmed that no written permission exists. API and AI-source activation remain disabled; no official-partner branding is approved.

**Send through:** [YouVersion Platform support](https://platform.youversion.com/support). Ask for routing to Platform licensing/partnerships. The current Platform Terms list `platform-support@youversion.com`; that alternative channel has not been used or authorized yet. The separate [content-partner application](https://www.youversion.com/content-partners) does not itself grant commercial API, AI-processing or brand rights.

**Subject:** Written approval request for The Dashboard — paid app, book links and Scripture integration

Hello YouVersion Platform team,

I'm JB, building The Dashboard, a Christian formation app with a public GitHub codebase, connected to my book, The Controllables. Awareness 🦉 is our faith and spirituality practice: read Scripture, notice the character of Jesus, and respond through one honest action.

Our app currently links readers to Bible.com for the NLT. We have prepared an API integration for review, but it is disabled. Before using Platform Services, we want written guidance on whether our business model can be approved under a separate agreement. We understand that your published Platform FAQ excludes commercial and indirectly monetized uses; we are not assuming that keeping Bible access free creates an exception.

Our model includes free Read Along practices, optional bring-your-own AI, and a planned Pro subscription at US$14.99/month or US$119.99/year. We also promote a separately purchased book. We propose keeping Scripture access separate from any Pro purchase requirement.

Could you confirm the following, or route us to the appropriate licensing team?

1. **Commercial permission:** Can Platform Services be licensed within this paid-app/book model? If so, what agreement, restrictions, fees or publisher approvals would apply?
2. **Translations and distribution:** Is NLT available for our approved use? What are the rules for attribution, display, caching, retention, export and future open-source/self-hosted deployments? We would not distribute an app key or assume our approval covers independent forks.
3. **AI use and processing:** Your Platform Terms restrict use with open-ended AI chat. May Platform services be used in this app alongside open-ended coaching when the reader is separate and no licensed Scripture is sent to models? Separately, may licensed passages be used solely as response context and checked quotations, without model training or fine-tuning? Our proposed hosted path uses Lovable's gateway with a Google model; BYO paths support OpenAI, OpenRouter and Anthropic. Which providers, models, retention settings and user permissions would be required? No licensed Scripture is currently sent to these models.
4. **Identity and privacy:** What consent and data-handling requirements apply to Sign in with YouVersion, Verse of the Day, and Scripture engagement data? Our current source design sends only the selected reference and configured version to YouVersion; private prayer, reflection, coaching history and pasted quote text are not forwarded.
5. **Branding:** What approved attribution, logos or partnership wording may we use, and only after which approval? We will not describe YouVersion as our official Bible partner without authorization.

Separately, we would like to explore a free Gospel-first reading plan based on Fully Charged 75. Our full 75-day packet remains a draft pending independent theological review and is not ready to submit. Should we begin with a reviewed short introductory plan through your Content Partner program? Please clarify whether and how its partner page or plan may link to our app or book.

If this model cannot be approved, please let us know before we activate anything. We welcome a permitted approach that respects your mission and Bible publishers' rights.

App: https://thedashboard.agbcoaching.com/
Source and proposed integration: https://github.com/developwithJB/thecontrollables/pull/75

Thank you,
JB

## Approval record before activation

Keep the actual correspondence and agreements in the owner's private business records. Put only a non-sensitive approval reference in server rollout configuration, not the agreement or contact details in this public repository.

Record separately whether written permission covers the commercial app and book links, the specific translation/publisher license, any model processing, identity/engagement data, and brand wording. Each scope stays pending until explicitly granted. A Content Partner acceptance or app key must not be treated as blanket approval for the other scopes.

After permission, obtain the appropriate app registration and publisher licenses, verify the real version catalog and runtime behavior, and activate only the approved capabilities. The independent 75-day theological review remains a separate publication requirement.

## Release and validation

Open a draft GitHub PR. This foundation does not resolve the prior Stripe webhook handoff or authorize the pending paid launch. No new app, credential, accepted agreement, migration, model call or production deployment is performed for this foundation. The support request remains unsent until the blocked registration or alternative channel is resolved. Await commercial permission, discover actual licensed versions, verify source payloads/attribution and privacy, then separately enable and publish the reader through Lovable. Keep the API disabled if approval is declined; a public-domain source licensed directly would require a separate explicit product decision.

Run unit tests, TypeScript, build, lint and the canonical emoji contract. `npm run test:scripture:local` runs only the named localhost spec at desktop and 390×844, blocking all external traffic. Source-handler and provider fixtures use synthetic non-Scripture text. Check screenshots under `docs/screenshots/youversion-2026-10-20/`. No production Stripe specs or broad E2E suite are involved.

October 20 audit verification: 490 unit tests passed across 77 files, including 41 YouVersion/source/UI/coach-boundary tests. Four isolated local browser tests passed; root and app TypeScript, production build, both edge entry-point Deno checks and the three emoji-contract tests passed. Full lint reports the existing 402 errors and 18 warnings; the six code/test files touched in this audit have zero lint findings. The initial lint traversal raced with Playwright recreating `test-results`; the completed sequential rerun produced the counts above. Live API calls and licensing remain untested and disabled.
