# Privacy-Safe Formation Analytics

## Contract

Formation events pass through `src/lib/formationAnalytics.ts`, which provides a typed event-name list and a runtime property allowlist. Unsupported keys, sensitive-key patterns, long strings, URLs, data URLs, and email-like values are rejected before they reach PostHog or the optional Supabase analytics sink.

Allowed properties are limited to aggregate product context:

`track`, `circuit`, `day_number`, `season`, `outcome`, `source`, `chapter_id`, `witness_act`, `email_kind`, `deep_link_kind`, `experiment_id`, `variant`, `reason_category`, `count`, `is_recovery`, and `sync_state`.

## Event catalog

| Journey area | Events |
| --- | --- |
| Entry | `landing_page_viewed`, `path_selected`, `book_status_selected`, `onboarding_completed`, `starting_charge_completed`, `covenant_created` |
| Daily formation | `formation_journey_started`, `formation_day_opened`, `circuit_started`, `circuit_completed`, `day_completed`, `recovery_win_recorded` |
| Attempts and seasons | `attempt_ended`, `new_attempt_started`, `formation_season_reached`, `journey_completed` |
| Reading and Witness | `read_along_chapter_completed`, `witness_act_started`, `witness_act_completed`, `weekly_review_completed` |
| Sharing | `share_previewed`, `milestone_shared` |
| Messaging | `email_delivered`, `email_opened`, `deep_link_opened` |

Email-open measurement may be enabled only where legally and technically appropriate, with documented consent and retention policy.

## Never collect

Prayer text, reflection text, proof contents or URLs, health disclosures, covenant text, nutrition or hydration details, service-recipient information, Witness notes, gratitude entries, Control / Release / Move text, Ego Signal responses, Scripture annotations, or user-selected milestone quotes.

Formation pages also use `ph-no-capture` and Sentry masking attributes as defense in depth. Those attributes do not replace the typed allowlist.

## Funnel definitions

- **Landing → path selection:** unique users with `path_selected` divided by `landing_page_viewed`.
- **Path selection → journey start:** `formation_journey_started` divided by `path_selected`, segmented by track.
- **Journey start → first completed day:** users with their first `day_completed` divided by journey starters.
- **Continuation:** users with a completed/opened formation day at day 1, 7, 40, and 75, using server-authoritative day numbers when available.
- **Circuit friction:** `circuit_started` without `circuit_completed`, aggregated by circuit and track; never inspect field contents.
- **Read Along progression:** distinct `chapter_id` completions per reader cohort.
- **Recovery usage:** aggregate `recovery_win_recorded` and the next non-sensitive return event.
- **Attempt restart:** `new_attempt_started` after `attempt_ended`, using reason categories rather than reflections.
- **Email → Today:** `deep_link_opened` followed by `formation_day_opened` within an agreed attribution window.
- **Witness engagement:** act starts and completions by stable act identifier.
- **Completion continuation:** a non-sensitive formation event after `journey_completed`, segmented by selected next-step category only when the user chose to share that category analytically.

## Dashboard guidance

Create aggregate PostHog or warehouse dashboards for activation, continuation, circuit friction, recovery, Witness engagement, email conversion, completion, and post-completion continuation. Apply minimum cohort thresholds before exposing segmented results. Do not build user-level spiritual-performance views.

## Ethical optimization boundary

Do not optimize for maximum daily app time, public performance, compulsive reopening, shame-driven restart rates, unsafe movement completion, or increased disclosure. Product experiments may change layout, navigation, copy density, or guidance timing. They may not change theological claims, privacy defaults, completion authority, or safety requirements.

## Retention expectation

Event-level retention remains a product-owner/legal decision. Until approved, use the shortest operational retention supported by the analytics provider, restrict access to authorized product operators, avoid exports containing stable user identifiers, and document any production retention change before enabling it.

