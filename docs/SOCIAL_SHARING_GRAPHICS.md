# Fully Charged 75 social sharing graphics

## Campaign copy

- Headline: `Put Jesus first.`
- Support: `Five Controllables. One honest next step.`
- Call to action: `Start the 75-Day Covenant`
- Destination: `https://thedashboard.agbcoaching.com/`

Recommended caption:

> You cannot control every outcome. You can practice what is yours: Awareness, Perspective, Habit, Wellness, and Environment. Put Jesus first for 75 days—one honest next step at a time.

Short caption:

> Five Controllables. 75 days. One honest next step. Start the covenant.

Alt text:

> Dark navy Fully Charged 75 graphic showing five glowing guide icons—an owl, turtle, shark, satellite, and rocket—representing Awareness, Perspective, Habit, Wellness, and Environment.

## Platform files

| Platform use | Size | File |
| --- | ---: | --- |
| Open Graph, Facebook/LinkedIn links, WhatsApp, Slack, Discord, iMessage, Bluesky, Mastodon | 1200 × 630 | `fully-charged-75-share-og-1200x630-v2.png` |
| X / Twitter | 1200 × 675 | `fully-charged-75-share-x-1200x675-v2.png` |
| YouTube and video community posts | 1280 × 720 | `fully-charged-75-share-youtube-1280x720-v2.png` |
| Instagram, Threads, Facebook square | 1080 × 1080 | `fully-charged-75-share-square-1080x1080-v2.png` |
| Instagram and Threads portrait feed | 1080 × 1350 | `fully-charged-75-share-feed-1080x1350-v2.png` |
| Pinterest | 1000 × 1500 | `fully-charged-75-share-pinterest-1000x1500-v2.png` |
| Instagram/Facebook Stories, Reels, TikTok | 1080 × 1920 | `fully-charged-75-share-story-1080x1920-v2.png` |

All files live in `public/social/`. Re-render them with `npm run render:social` after changing the campaign copy or layout.

The exact machine-readable mapping, shared alt text, CTA, and destination URL are in `public/social/share-manifest-v2.json`.

## Source image-generation prompts

The two text-free backgrounds were created with the built-in image-generation workflow. Exact typography and platform dimensions are applied by `scripts/render-social-card.mjs`.

Landscape and square source:

> Replace only the green dinosaur in the landscape campaign background with a friendly green turtle matching 🐢. Preserve the owl, shark, satellite, rocket, exactly five glass tiles, positions, circular covenant path, crop, lighting, colors, and glow effects. No text, logos, watermark, extra tokens, reordered tokens, dinosaur, sauropod, surfer, surfboard, or ocean wave.

Portrait and story source:

> Replace only the green dinosaur in the second portrait guide token with a friendly green turtle matching 🐢. Preserve the owl, shark, satellite, rocket, exactly five glass tiles, vertical order, positions, luminous path, crop, negative space, lighting, colors, and glow effects. No text, logos, watermark, extra tokens, reordered tokens, dinosaur, sauropod, surfer, surfboard, or ocean wave.
