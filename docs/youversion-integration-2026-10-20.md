# YouVersion integration and partnership approval

The Dashboard can deepen Gospel-first Awareness with licensed source retrieval and exact quotation checks. Production API activation requires written clearance for our commercial app. The current [Platform FAQ](https://www.youversion.com/platform) excludes subscriptions, purchases, upgrades, advertising and indirect revenue generation. Free access to Scripture inside a paid app is not an established exception. The Dashboard offers Pro and promotes a separately sold book, so neither an app key nor a content-partner application establishes permission for this use.

## Implemented for review

The public `/scripture` companion links each selected Gospel passage to the NLT on Bible.com, identifies YouVersion as that site's provider, and offers the three Awareness prompts. Landing's sample, Read Along, reviewed Gospel cards and the optional coach link to it. It does not import text, grant XP, complete circuits, replace reviewed assignments, or claim official partnership.

`scripture-passage` is an authenticated, verified-email endpoint with `verify_jwt = true`. Its passage and quote-check operations are disabled unless all server prerequisites exist. It uses fixed `api.youversion.com/v1` routes, declines redirects, requests plain text, requires matching version/book/reference and publisher attribution, and returns generic failures with `Cache-Control: no-store`. No service-role credential, database migration or licensed local corpus is needed. No prayers, user identifiers, private history or pasted quotation go to YouVersion; only the reference and configured version do. Quote text is compared on our server and is not logged or stored by this feature. Platform itself may record request/engagement information; confirm privacy terms before activation.

The optional reader UI is hidden by default. Once approved, it displays returned text as escaped plain text, version abbreviation and copyright. Source errors retain the Bible.com link; no silent substitution to another translation occurs. Quote checks compare the entire selected verse/range, preserving case and punctuation and normalizing only Unicode composition/whitespace. An excerpt, omitted negation, changed word, changed punctuation, or different source/version cannot receive an exact-match verdict. This verifies wording, not interpretation, context or theological approval.

All three coach providers now receive a locked instruction to avoid memory-based Scripture quotations and endorsement claims. Their common response boundary withholds recognizable attributed quotations and claimed verified quotations. This is a conservative pattern filter with possible false positives and undetected unmarked paraphrases. It is not an assertion that every coach statement is grounded. The approved reader/checker is a separate source tool; licensed text is **not** sent to hosted or BYO models. Automated retrieval-augmented coaching remains deferred until commercial and AI-specific rights are clear.

## Official integration instructions

The [official platform-skills](https://github.com/youversion/platform-skills/tree/afa623654165b6d53df56a250af655c76cbddd94) REST and React skills were inspected at commit `afa6236`. The [API documentation](https://developers.youversion.com/api/bibles) defines metadata and passage schemas. The server follows the REST skill; the current UI needs no new third-party SDK or MCP installation.

After written approval, the operator must register the app at [YouVersion Platform](https://platform.youversion.com), accept the applicable publisher licenses, and discover available versions using this app's catalog (`GET /v1/bibles?language_ranges[]=en`, without `all_available=true`). NLT availability is unknown. Bible.com's ID 116 is used only for the existing outbound NLT links; it is not assumed available to our app key. Record the approved version and approval scope privately; never invent catalog results.

Server configuration, all absent/off by default:

- `YOUVERSION_API_ENABLED=true` only after permission and runtime verification.
- `YOUVERSION_COMMERCIAL_APPROVAL`: internal reference to the actual written permission; this string is rollout metadata, not proof or a substitute for permission.
- `YVP_APP_KEY`: existing approved app key, entered through server configuration. Official instructions classify app keys as public identifiers; keeping ours server-side supports controlled access. Do not create a credential or accept terms without the required user action/approval.
- `YOUVERSION_BIBLE_ID`: numeric ID discovered in this app key's licensed catalog.
- `VITE_YOUVERSION_READER_ENABLED=true`: UI visibility only; never authorizes API access. No key or approval document belongs in a `VITE_` variable.

Do not activate production, embed the React reader, provision Sign in with YouVersion, send licensed text to any model, add Verse of the Day, or use partner logos until the relevant permissions are settled. Future SSO must link to an already authenticated Supabase identity with explicit consent; do not merge identities by email or weaken RLS. Verse of the Day, if approved, is optional discovery and must never replace assigned Gospel readings or the 75-day review gate.

## Third party MCP assessment

[scripture-grounding-mcp](https://github.com/The-Doxa-Way/scripture-grounding-mcp) is a third-party project, not an official YouVersion server. Its retrieval/checking design is useful, but its source supports fuzzy minor-variance verdicts, cross-translation comparisons and keyless BSB corpus fallback. Those are not an NLT exact-wording guarantee. We do not install it or forward customer data to its hosted demo. Our small deterministic checker rejects all nonexact wording and has no fallback corpus. This avoids an extra public service and additional credential transport while permissions are unresolved.

## Partnership inquiry draft for JB to review

**Recipient:** YouVersion Platform partnerships/support and the [content-partnership application](https://www.youversion.com/content-partners). This is a draft, not a submitted application or an agreement.

Hello YouVersion team,

I'm JB, building The Dashboard, an open-source Christian formation companion connected to my book, The Controllables. Awareness 🦉 is our faith and spirituality practice. We currently send readers to Bible.com for the NLT and keep private reflection separate from Scripture text and AI guidance.

We would like to explore an approved relationship for in-app Gospel reading, exact quotation checking and, if permitted, optional AI support. Our app has a free Read Along path, a bring-your-own AI option, and a planned paid Pro tier. We also link to a separately sold book. We understand the current Platform FAQ excludes commercial and indirectly monetized uses, and have left API access disabled.

Can you advise whether written permission is available for this model, which translations—including NLT—could be licensed, and whether any Scripture text may be processed by hosted or user-selected AI providers? Please clarify display attribution, caching/retention, engagement data, SSO, brand wording, and any permitted book/app referral links.

Separately, we would like to propose a free Gospel-first reading plan based on Fully Charged 75. Our 75-day packet remains a draft pending independent theological review, so it is not ready to submit or publish. Would a reviewed short introductory plan be the appropriate first step, and what content/linking requirements should it meet?

Thank you for helping us choose an approach that respects Scripture, publishers and your mission.

JB

## Release and validation

Open a draft GitHub PR. This foundation does not resolve the prior Stripe webhook handoff or authorize the pending paid launch. No new app, credential, partnership submission, migration, model call or production deployment is performed for this foundation. Await commercial permission, discover actual licensed versions, verify source payloads/attribution and privacy, then separately enable and publish the reader through Lovable. Keep the API disabled if approval is declined; a public-domain source licensed directly would require a separate explicit product decision.

Run unit tests, TypeScript, build, lint and the canonical emoji contract. `npm run test:scripture:local` runs only the named localhost spec at desktop and 390×844, blocking all external traffic. Source-handler and provider fixtures use synthetic non-Scripture text. Check screenshots under `docs/screenshots/youversion-2026-10-20/`. No production Stripe specs or broad E2E suite are involved.
