# Formation Content Editor Guide

## Operating rule

The application ships a versioned content system so Scripture assignments, formation prompts, service missions, Witness material, weekly reviews, completion language, and email guidance can change without a frontend deployment. Saving creates a new immutable content version; it never overwrites the version a historical formation record received.

Draft and in-review versions are admin-only. Production readers can query only `published` versions whose effective date has arrived.

## Roles and review flow

1. An authenticated admin creates or imports a draft in **Admin → Formation Content**.
2. Validation checks the stable identifier, slug, day range, Scripture metadata, classification, citations, and visible reconstruction labels.
3. The author submits the version for review.
4. A different authenticated admin records theological review and, where applicable, historical review. Author and reviewer accounts must be different.
5. The reviewer requests changes or approves the version. Review events remain append-only.
6. An approved version receives an effective date through the publication control.
7. Publishing updates the item’s current pointer; prior published versions remain intact.

AI may help draft content, but the `ai_assisted` marker does not relax any validation. AI-assisted content cannot publish without the same independent human review.

## Required classifications

Use one classification for every meaningful Witness/evidence block:

- **Scripture** — the biblical text or an explicit passage reference. Include the Scripture reference and configured translation/license metadata.
- **Historical Context** — historical claims outside the biblical text. Include HTTPS source citations and obtain historical review.
- **Christian Tradition** — a clearly attributed church tradition or reception history.
- **Scholarly Interpretation** — a scholar’s interpretation, visibly distinct from Scripture.
- **Creative Reconstruction** — illustrative material that is not claimed as history or Scripture. The body must visibly begin with `Creative Reconstruction:`.

Never merge categories to make an interpretation appear to be Scripture or a reconstruction appear to be history.

## Scripture and source integrity

- Enter references in a form such as `Matthew 9:9-13`.
- Add the Bible translation only when the reference is present; both fields travel together.
- Do not paste licensed Scripture text until translation rights and rendering requirements are confirmed.
- Historical content requires at least one HTTPS citation and historical approval.
- Use stable source URLs from publishers, libraries, journals, museums, or primary-source archives when possible.

## Import, export, and seed workflow

- **Export** downloads `formation-content-export-v1` JSON containing version history visible to the admin.
- **Import drafts** validates the file and always resets imported versions to `draft`, clears the reviewer, and resets theological review to `pending`. Import can never publish content.
- **Seed representative drafts** creates the requested editorial sample set: a Read Along chapter, days 1/2/25/26/27/50/51/52/75, all five circuits, all five Witness acts, season transitions, a Recovery Win, service mission, weekly review, and completion language.

The representative seed is deliberately pending human review. It is not a substitute for authoring or approving the full 75-day curriculum.

## Historical retention

Formation records store the exact `content_version_id` originally delivered. A later publication may become current for new readers, but it cannot rewrite historical assignments, circuit records, or completion snapshots.

## Editorial pre-publication checklist

- Content type and track are correct.
- Day range, season, chapter, and spoiler level are correct.
- Scripture reference and translation/license metadata are correct.
- Every evidence block has the correct visible classification.
- Historical claims have durable citations and historical approval.
- Creative reconstruction is visibly labeled.
- Wellness guidance does not prescribe a universal target or override clinical guidance.
- Prayer, covenant, reflection, service-recipient, and proof details are not requested for analytics or email.
- Completion copy does not claim earned salvation, divine approval, comparative maturity, or guaranteed transformation.
- Author and reviewer are different humans.
- Effective date and last-reviewed date are recorded.

