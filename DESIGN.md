# The Dashboard UI conventions

The Dashboard helps readers turn The Controllables into private daily Christian formation practice. Preserve its calm, clear hierarchy and existing covenant-first landing page. The book path supports newcomers without competing with “Begin my covenant.”

## References and tokens

Project-owned references: `src/pages/Landing.tsx`, `src/components/ui/button.tsx`, `src/index.css`, and `tailwind.config.ts`. These existing sources define this small additive change; no outside visual reference is needed. The live reference is https://thecontrollables.lovable.app/.

Use existing semantic background, foreground, muted-foreground, primary, border and ring colors. Use font-display (Space Grotesk) for existing headings and the inherited body font. Spacing follows Tailwind's existing 4px scale; existing section padding is px-5/md:px-8, py-16/md:py-24. Keep the existing button radius, outline border, elevation and focus ring. Add no animation or new token.

## Components and responsive layout

BookLink is one fixed-destination external anchor, with target blank and noopener noreferrer. Navigation uses compact text on all widths; hero uses muted text-sm below both action buttons; book section uses the existing outline button. QuickStart reveals the link only for not_started, below the status choices. Reuse current layouts, button sizes and responsive breakpoints. Keep the covenant CTA first in the hero, with its glow variant. No new loading, empty or error state is needed: analytics failures must leave the link usable.

## Accessibility and acceptance

All links need descriptive text, visible keyboard focus and adequate contrast using existing semantic tokens. At 375px and desktop widths, navigation must fit without clipping, every new link must be visible, and the covenant CTA must stay visually primary. Check QuickStart both with and without not_started selected. Preserve all five canonical Controllable names and emoji. Reject a changed headline, covenant copy, primary CTA, new destination, layout redesign or externally loaded tracking URL.
