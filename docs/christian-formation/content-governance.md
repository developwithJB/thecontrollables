# Content Governance

Status: required publishing and correction policy

Scope: Scripture, historical claims, tradition, formation practices, prayers, notifications, AI prompts/output framing, book-aligned material, safety guidance, and customer-facing completion copy

## Purpose

The product must let a user tell what kind of statement they are reading, where it came from, who reviewed it, and which version governed a historical attempt. It must not present paraphrase, tradition, pastoral application, AI generation, or creative reconstruction as a direct quotation from Scripture or a historical person.

Content quality is part of the domain model: published items are versioned, reviewed, attributable, and pinned to an attempt/content bundle. Editing a live CMS row must never rewrite the apparent rules or claims of a prior attempt.

## Provenance classes

Every substantive content item has exactly one primary provenance class and may link supporting sources.

| Class | Definition | Required presentation |
|---|---|---|
| `scripture` | Biblical text or an exact reference to it | Translation/edition and reference; quotation marks only for licensed exact text |
| `historical_evidence` | A claim grounded in primary or reputable secondary historical sources | Source citation, date/context, confidence/limitations where material |
| `tradition` | A teaching/practice associated with a named Christian tradition, community, or historical stream | Name the tradition/context; do not imply universal Christian agreement |
| `pastoral_application` | Reviewed application, commentary, prompt, prayer, or formation guidance created for this product | Label as guidance/reflection; author/reviewer provenance available |
| `creative_reconstruction` | An imagined scene, composite, modernized retelling, or invented dialogue | Visibly label as imaginative/creative; never use quotation styling that implies an original source |

AI-generated draft text cannot publish with “AI” as its only provenance. It must be classified into one of the above, sourced where needed, and reviewed by an accountable human.

## Content record

Recommended `formation_content_items` and `formation_content_versions` fields:

- stable content ID, slug, content type, track, circuit, season/day/chapter placement;
- locale and reading level;
- provenance class;
- title, body, source note, customer-facing label;
- Scripture reference and translation/license ID where applicable;
- citations with source type, author, title, publisher/site, date, locator, URL/archive date, and license/permission;
- book edition/chapter mapping and spoiler boundary;
- wellness/safety flags and adaptation requirements;
- author, theological reviewer, historical/fact reviewer, safety/clinical reviewer when applicable, copy editor, approver;
- review status, review notes reference, approval/publish/retire timestamps;
- semantic version, checksum, superseded version ID, correction note;
- rights owner, territory, term, allowed display/export/channel uses;
- AI-assistance disclosure in internal metadata;
- content bundle memberships and experiment/cohort eligibility.

Private user responses never live in content tables.

## Review statuses and workflow

The required enum is:

`draft → theological_review → safety_review → approved → published → retired`

Not every item needs the same specialist, but stages cannot be skipped implicitly.

1. **Draft.** Author provides provenance class, sources, audience, placement, spoiler boundary, and safety flags.
2. **Theological review.** A named qualified reviewer checks Scripture handling, doctrinal scope, coercion/legalism, salvation/approval implications, and treatment of traditions.
3. **Historical/fact review.** Required for historical claims, quotations, scientific/wellness claims, and book references. This may occur alongside theological review and must be recorded even though it is not a separate enum state.
4. **Safety review.** Required for movement, nutrition, hydration, recovery, mental-health/crisis, compulsive behavior, disability, shame/failure, or vulnerable-user implications. Use a qualified clinician or subject-matter reviewer when claims require it.
5. **Approved.** Rights/licensing, accessibility, privacy, copy, links, and tests are complete. Approval names a publisher accountable for the version.
6. **Published.** An immutable version is included in one or more signed/hashed content bundles. Assignment uses the version ID.
7. **Retired.** New assignments stop. Historical attempts retain the pinned version or a correction notice.

No author self-approves high-risk theological or wellness content. Production database access is not a publishing workflow.

## Scripture requirements

- Store canonical reference separately from displayed text.
- Record translation, edition, rights owner, license, territory, channel, and quotation limits.
- If full licensed text cannot be displayed/exported, show the reference and an approved link rather than silently substituting a paraphrase.
- Mark product paraphrases explicitly and do not put them in quotation marks as Scripture.
- Preserve verse context; avoid extracting a phrase to guarantee an outcome, shame a user, or equate app completion with faithfulness.
- Explain materially disputed translation or interpretive choices when they affect a practice.
- Do not let AI invent or autocomplete verse text. Resolve exact text from the approved content source.
- Shared exports obey translation licensing and attribution requirements.

## Historical evidence and quotations

- Exact quotations require a verifiable source and locator. If verification is unavailable, convert to an attributed paraphrase or remove it.
- Do not turn a composite or modern wording into quotation marks around a historical person's speech.
- Distinguish primary evidence from later tradition and from scholarly inference.
- Include uncertainty when sources disagree or evidence is thin.
- Avoid presentist claims and simplistic “the early church always…” language.
- Check copyright/permission for modern books, translations, study notes, recordings, and images.
- Do not use historical claims merely to intensify strictness or guilt.

## Tradition and doctrinal breadth

The product can be explicitly Christian without pretending every Christian tradition practices formation identically.

- Name denominational/traditional context when relevant.
- Use core-product language that does not adjudicate secondary doctrinal disputes unnecessarily.
- Provide a review rubric for Christology, grace/salvation, Scripture, prayer, sanctification, body/stewardship, service, church/community, suffering, and conscience.
- Avoid substituting the application for church participation, sacraments/ordinances, pastoral care, or Christian community.
- Do not tell a user that a private algorithm has discerned God's will.
- Provide a documented escalation path for disputed claims and user reports.

## Formation and completion copy rubric

Every practice and system message is reviewed against these questions:

1. Does it clearly describe an action the user controls?
2. Does it leave room for grace, rest, health, disability, caregiving, and honest adaptation?
3. Could it be read as earning salvation, approval, maturity, masculinity/femininity, or status?
4. Does it create secrecy, compulsion, public performance, or shame pressure?
5. Does service preserve the dignity/privacy of the recipient?
6. Is a strict consequence factual, disclosed in advance, and expressed neutrally?
7. Does it recommend qualified human support when the app is outside its competence?

Approved strict-state pattern:

- “Attempt ended.”
- “Your record remains part of your history.”
- “What did this attempt teach you?”
- “Begin again when you are ready.”

Prohibited patterns include “God is disappointed,” “prove your faith,” “no excuses,” “weak,” “lazy,” “punishment,” “earn,” “spiritual score,” and manipulative loss countdowns. Existing XP, self-trust, “fully charged,” and streak copy must be reviewed in context before reuse.

## Movement and wellness content

- Do not prescribe diagnosis-specific treatment unless authored/reviewed by appropriately qualified professionals and legally supportable.
- Safe adaptations—walking, mobility, rehabilitation, recovery, and an approved indoor safety alternative—receive equal product status.
- Never encourage pain, dizziness, unsafe weather exposure, disordered eating, dehydration, compensatory exercise, or ignoring clinician advice.
- Personal covenants use user-authored boundaries rather than product-set calories, weight, fasting, macros, or medical targets.
- Prompts must say users may stop/end an attempt for safety.
- Review changes to strict movement logic as both code/rules and health content.
- Regional emergency/crisis resources are maintained as governed structured data with an owner and review cadence.

## Service content

- Service is framed as love of neighbor, not proof for an audience or repayment for spiritual standing.
- Suggested actions must respect consent, safeguarding, workplace/community boundaries, financial limits, and recipient dignity.
- Never require recipient name, image, exact location, vulnerability, or story.
- Avoid unsolicited religious pressure, unsafe stranger contact, or advice outside the user's competence.
- Private attestation is sufficient; photo/social proof is never the default.
- Suggestions involving minors, vulnerable adults, money, transportation, homes, or medical settings require explicit safeguarding review or exclusion.

## Book alignment and spoiler governance

- Define each supported book edition and stable chapter/section IDs.
- Store boundaries for orientation, current-section practice, future spoiler summary, and finished/rereading access.
- Map the current eight-section browser model to canonical chapters through a reviewed migration table. Uncertain mappings require user confirmation.
- The server sends only content the spoiler policy permits; hidden future text is not included in API payloads.
- Book excerpts and derivative guides require publisher/author rights review.
- A content correction or edition change does not move a user's progress silently.

## AI-authored or AI-personalized content

- AI may draft, summarize selected user-provided text, or choose among approved content IDs under consent.
- It may not invent Scripture, quotations, citations, historical facts, safety rules, or an authoritative word from God.
- Retrieval is constrained to published content versions; output carries the source/provenance labels.
- Generated personalized text passes deterministic filters for forbidden claims, shame, unsafe movement/nutrition, disclosure, and unsupported quotation before display.
- High-risk content uses authored templates or a safe refusal/escalation, not unconstrained generation.
- User feedback does not publish a model output directly. Reported content enters the editorial issue queue.
- Prompts/model/version, approved source IDs, safety outcome, and coarse generation metadata are auditable without logging private user text unnecessarily.

## Notifications and channel variants

Email, push, in-app, and share copy are separate reviewed variants because their privacy and licensing constraints differ.

- Notifications contain no reflection, covenant, wellness, service-recipient, or proof content.
- Lock-screen push text remains generic.
- A link resolves to an authenticated screen and does not place sensitive state in URL parameters.
- Scripture text in email/share is used only if the license covers that channel.
- Deadline copy uses the configured timezone and does not send while sync state is unresolved.
- Every template has content/version ID and an opt-out purpose/channel.

## Accessibility and localization

- Author plain-language titles, semantic heading structure, meaningful link labels, image alternatives, and non-visual equivalents.
- Never encode circuit/status meaning only through color, icons, biblical imagery, or motion.
- Review at 200% zoom and with screen readers; avoid excessive all-caps and dense verse overlays.
- Localization is a new content version with translator/reviewer attribution, not an unreviewed runtime AI translation.
- Scripture translations, crisis resources, measurements, timezone examples, cultural assumptions, and service suggestions are locale-specific.
- Preserve provenance labels in every locale.

## Versioning and assignment

- Rules versions and content bundle versions are separate. A rules bug fix does not silently replace a user's devotional content, and a copy edit does not change completion logic.
- A content bundle is an immutable manifest of content version IDs plus a checksum and approvals.
- An attempt pins the bundle at activation. New attempts use the current approved bundle.
- Low-risk typographical corrections may publish a new version and optionally display a correction notice. Material theological, historical, safety, licensing, or rule-linked corrections require impact review.
- If continued display is unsafe or unlawful, retire the version, suppress the affected body, and show a transparent correction notice while preserving the attempt's structural history.

## Content incidents and corrections

Severity examples:

- **Critical:** fabricated Scripture/quotation, unsafe medical/exercise direction, exposed private content, coercive abuse, rights takedown.
- **High:** misleading salvation/divine-approval claim, materially false history, unsafe service suggestion, spoiler breach.
- **Moderate:** ambiguous tradition attribution, adaptation gap, broken citation/license metadata.
- **Low:** typo or style issue without changed meaning.

Response:

1. Disable assignment/display through a content kill switch when necessary.
2. Preserve the reported version and audit evidence without continuing public delivery.
3. Notify product, content owner, and the required specialist/legal/privacy reviewer.
4. Assess affected content bundles, attempts, notifications, exports, and AI outputs.
5. Publish a new reviewed version/correction notice; never edit history invisibly.
6. Communicate to affected users when safety, privacy, rights, or material trust requires it.
7. Record cause and prevention tests.

## Repository and CI controls

Recommended artifacts:

- versioned content schemas and provenance enums;
- a content manifest validator;
- citation/license completeness checks by provenance/content/channel;
- duplicate/missing stable ID and invalid lifecycle transition checks;
- spoiler-boundary fixtures;
- forbidden-claim and risky-copy lint rules with human review, not as the sole safeguard;
- snapshots for notification/export variants;
- a signed approval manifest separate from editable copy;
- content bundle diff output in pull requests.

CI must fail if published content lacks required provenance, reviewer, rights, safety fields, or references unsupported rule IDs. Production publishing is permissioned separately from ordinary content editing.

## Ownership and review cadence

Named roles are required before launch:

- product/content owner;
- theological/pastoral reviewer;
- historical/fact reviewer;
- wellness/safety reviewer;
- privacy/legal/rights reviewer;
- accessibility/localization reviewer;
- production publisher and incident owner.

Review published content at least annually and immediately after source/license changes, rule changes, credible safety reports, theological corrections, or affected-law/region changes. Crisis resources and safety links need a shorter documented cadence.

## Definition of governed content

An item is ready only when:

- provenance and sources are accurate and visible;
- rights cover every delivery/export channel;
- required human reviewers approved the exact version;
- formation, shame/legalism, privacy, service, and wellness rubrics pass;
- spoiler, accessibility, and locale metadata are valid;
- automated schemas/tests pass;
- the content version is immutable and included in an approved bundle;
- correction, retirement, and incident owners are known.
