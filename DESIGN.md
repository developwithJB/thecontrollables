# The Dashboard UI conventions

The Dashboard helps readers turn The Controllables into private daily Christian formation practice. Preserve its calm, clear hierarchy and existing covenant-first landing page. The book path supports newcomers without competing with “Begin my covenant.”

## References and tokens

Project-owned references: `src/pages/Landing.tsx`, `src/components/ui/button.tsx`, `src/index.css`, and `tailwind.config.ts`. These existing sources define this small additive change; no outside visual reference is needed. The live reference is https://thecontrollables.lovable.app/.

Use existing semantic background, foreground, muted-foreground, primary, border and ring colors. Use font-display (Space Grotesk) for existing headings and the inherited body font. Spacing follows Tailwind's existing 4px scale; existing section padding is px-5/md:px-8, py-16/md:py-24. Keep the existing button radius, outline border, elevation and focus ring. Add no animation or new token.

## Components and responsive layout

BookLink is one fixed-destination external anchor, with target blank and noopener noreferrer. Navigation uses compact text on all widths; hero uses muted text-sm below both action buttons; book section uses the existing outline button. QuickStart reveals the link only for not_started, below the status choices. Reuse current layouts, button sizes and responsive breakpoints. Keep the covenant CTA first in the hero, with its glow variant. No new loading, empty or error state is needed: analytics failures must leave the link usable.

## Accessibility and acceptance

All links need descriptive text, visible keyboard focus and adequate contrast using existing semantic tokens. At 375px and desktop widths, navigation must fit without clipping, every new link must be visible, and the covenant CTA must stay visually primary. Check QuickStart both with and without not_started selected. Preserve all five canonical Controllable names and emoji. Reject a changed headline, covenant copy, primary CTA, new destination, layout redesign or externally loaded tracking URL.

## Gospel-first Awareness

Keep the existing circuit card and semantic tokens. A compact ordered list shows Observe, Understand, Respond beside the assigned Gospel reference. Use visible labels and descriptive section names; stack on mobile without horizontal overflow. Draft previews must say pending independent theological review. Authenticated journeys render only prompts from the reviewed server content body, never substitute the bundled draft. Keep the existing One honest truth response and completion rules; do not add required writing fields or analytics of private responses.

## Sources and feedback

Use a readable note from JB and one clearly labeled GitHub feedback link in the landing footer. Gospel Awareness cards repeat a compact correction link beside the NLT source context. Preserve semantic colors, underlined links, visible keyboard focus and mobile wrapping. State that GitHub reports are public; never prefill private content, account identity or current-page query strings. Keep translation credit distinct from product guidance and retain all draft-review labels.

## Sabbath attempt setup
Reuse the existing readiness panel, labels, native select and semantic tokens. The weekday choice is made before start and shown as locked afterward; mobile controls stack. Rest-day Wellness keeps nutrition/hydration, then one description and explicit rest-or-walk attestation. No celebratory animation or competitive language. Preserve all loading, error and reviewed-content gates. Check 375px and 1280px without overflow.
