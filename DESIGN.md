# The Dashboard UI conventions

The Dashboard helps readers turn The Controllables into private daily Christian formation practice. Preserve its calm, clear hierarchy and existing covenant-first landing page. The book path supports newcomers without competing with “Begin my covenant.”

## References and tokens

Project-owned references: `src/pages/public/LandingPage.tsx`, `src/components/ui/button.tsx`, `src/index.css`, and `tailwind.config.ts`. These existing sources define this small additive change; no outside visual reference is needed. The live reference is https://thecontrollables.lovable.app/.

Use existing semantic background, foreground, muted-foreground, primary, border and ring colors. Use font-display (Space Grotesk) for existing headings and the inherited body font. Spacing follows Tailwind's existing 4px scale; existing section padding is px-5/md:px-8, py-16/md:py-24. Keep the existing button radius, outline border, elevation and focus ring. Add no animation or new token.

## Components and responsive layout

BookLink is one fixed-destination external anchor, with target blank and noopener noreferrer. Navigation uses compact text on all widths; hero uses muted text-sm below both action buttons; book section uses the existing outline button. QuickStart reveals the link only for not_started, below the status choices. Reuse current layouts, button sizes and responsive breakpoints. Keep the covenant CTA first in the hero, with its glow variant. No new loading, empty or error state is needed: analytics failures must leave the link usable.

## Accessibility and acceptance

All links need descriptive text, visible keyboard focus and adequate contrast using existing semantic tokens. At 375px and desktop widths, navigation must fit without clipping, every new link must be visible, and the covenant CTA must stay visually primary. Check QuickStart both with and without not_started selected. Preserve all five canonical Controllable names and emoji. Reject a changed headline, covenant copy, primary CTA, new destination, layout redesign or externally loaded tracking URL.

## Gospel-first Awareness

Keep the existing circuit card and semantic tokens. A compact ordered list shows Observe, Understand, Respond beside the assigned Gospel reference. Use visible labels and descriptive section names; stack on mobile without horizontal overflow. Draft previews must say pending independent theological review. Authenticated journeys render only prompts from the reviewed server content body, never substitute the bundled draft. Keep the existing One honest truth response and completion rules; do not add required writing fields or analytics of private responses.

## Sources and feedback

Use a readable note from JB and one clearly labeled GitHub feedback link in the landing footer. Gospel Awareness cards repeat a compact correction link beside the NLT source context. Preserve semantic colors, underlined links, visible keyboard focus and mobile wrapping. State that GitHub reports are public; never prefill private content, account identity or current-page query strings. Keep translation credit distinct from product guidance and retain all draft-review labels.

## Coach settings (server-controlled rollout)
Reuse the settings card, Input, Label, Button and native select conventions. Stack fields on mobile, with visible labels and focus rings. The entire card is excluded from replay/autocapture; API keys use a write-only password input and are cleared after any save attempt or account switch. Show only provider and last four characters after save, never the stored key. Inline loading, generic error and saved states must not echo entered values. Hide the card unless both client visibility and server rollout are enabled. No new colors, icons or animation.
## Sabbath attempt setup
Reuse the existing readiness panel, labels, native select and semantic tokens. The weekday choice is made before start and shown as locked afterward; mobile controls stack. Rest-day Wellness keeps nutrition/hydration, then one description and explicit rest-or-walk attestation. No celebratory animation or competitive language. Preserve all loading, error and reviewed-content gates. Check 375px and 1280px without overflow.

Coach secondary actions use futureOutline so hover retains readable foreground contrast instead of interpolating light text to dark text while the background also changes.

## Pro hosted coach
Reuse the private settings card and futureOutline secondary actions. Show the hosted card only when its client flag and server rollout are on. Use the server-returned entitlement for selection controls; non-entitled users get the existing /billing link. Show the current offer to prospects; existing subscribers use their billed rate in the Stripe portal. Hosted selection preserves a saved BYO key; saving a new BYO key switches back explicitly. Busy, success and generic error states stay within the card, with no private data in telemetry. Check free/Plus/Pro, flag-off, keyboard focus and mobile wrapping.

## Newcomer and first-week experience
Preserve the Controllables-first headline and existing semantic tokens. Awareness 🦉 explicitly owns faith and spirituality; Perspective 🐢 applies truth without changing stored completion rules. Add a small disposable Scripture practice, truthful server readiness and enrollment states, a durable confirmation screen, and one next-action panel on Today. Keep unavailable paths visible with an explanation and a Read Along alternative. Email is opt-in; pending preferences are never described as delivered or active before persistence. Show fixed-timezone deadlines before strict start. Use quiet closeout receipts and private week-one reflection; no rankings, forced sharing, confetti, automatic AI calls or upsell. Private input regions exclude replay and analytics. At 375px and 1280px, stack actions, allow wrapping, retain 44px targets and visible keyboard focus. Loading, offline/unavailable, retry, saved, scheduled, ended and closed states must explain a next action. Reduced-motion users receive no entrance or looping mascot animation.

## QA completion and readiness
Until strictReady is true, primary landing actions offer Read Along and explain the review gate. Non-strict 5/5 receipts use existing quiet panels, date and action labels; browser acknowledgement never grants credit. Keep legacy figures beside separately labeled formation counts. Browser import is dismissible and never blocks the shell. Preserve canonical emoji, private regions and existing focus targets.

## Freemium and bounded AI (2026-10-20)

Reuse semantic cards, quiet borders, native billing-interval radios, visible labels, 44px actions and readable links. `/pricing` compares Free, BYO and Pro without blocking Read Along. Pro is $119.99/year or $14.99/month; the annual equivalent is $10.00/month rounded, never a monthly offer. Existing subscribers see their current rate in Stripe's portal rather than an assumed new rate. The strict content-review gate remains independent of payment.

`/coach` is optional support beside Today. Awareness's Scripture source stays Bible.com; AI output never becomes reviewed lesson content. Billing and chat show server-returned remaining replies, daily availability, shared-budget percentage, reset date or a lifetime-sample explanation. No local counters, daily-reset promises for free samples, unlimited AI claims, automatic model calls or forced upsells. The provider editor stays private and write-only; neither tier choice nor client visibility grants authorization. Failed requests retain reserved allowance. Free/BYO paths keep practice available at all limits. Apple Pay copy is conditional on the user's supported device and eligible Wallet card, not a guaranteed button.

## QA polish
Use the existing BookLink in Formation headers, readable underlined text with a 44px target. Profile menu and mobile navigation expose Sign Out using the same handler as Settings. Keep six mobile items legible at 390px. Formation renders its shell and page skeleton immediately after auth; authenticated book context stays intact while optional book data loads independently. Password guidance belongs only to signup.

## Legacy billing access
Reuse the existing Billing card and secondary badge. A server-classified historical grant without a recorded tier says “Legacy app access” and “Access granted,” preserves existing app features and shows the separate server AI allowance. It must not imply an active recurring subscription, renewal or portal action. Explain the support path before an upgrade that could replace a legacy grant. Keep ordinary Free/BYO/Pro offers unchanged; no automatic upgrade or record backfill.

## Readability cleanup

Keep existing layouts, routes, interactions, semantic colors, and responsive behavior. Expand unexplained abbreviations in visible labels, define the existing Dex as the private proof collection, and describe optional AI without claiming model training or reviewed Scripture authority. Repository licensing copy must match the actual license status. Preserve all privacy/review/AI-limit qualifications. Check Today, pricing, proof collection, and public entry at mobile and desktop widths after file moves; do not redesign them.

## Launch funnel (October 2026)

The first-week review and exhausted free AI sample may now show a quiet, dismissible Pro offer. This supersedes the earlier no-upsell direction only for these two moments. Reuse semantic bordered cards, existing buttons and shared prices; no modal, automatic checkout, urgency claim, discount, or subscription promise. Keep free practice and BYO alternatives visible. Offer eligibility uses server-returned allowance and billing state; loading, errors, a paused hosted service, Pro, and exhausted BYO requests must not be treated as an exhausted free sample. The sample is lifetime, never a daily reset. Keep private inputs excluded from replay and analytics; send only allowlisted placement events. Check 390px and desktop, wrapping, focus and dismissal. Campaign entry always selects Read Along and preserves only sanitized attribution. New and reset passwords require eight characters; existing passwords remain usable at sign-in.

Social footer links use the existing underlined primary-color anchors and 44px targets. JB supplied YouTube @thcontrollables and X @developwithjb; do not invent a brand X account. Keep external links labeled by platform and allow wrapping at 390px and desktop.
