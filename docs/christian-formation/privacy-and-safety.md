# Privacy and Safety Standard

Status: launch-blocking requirements for Christian formation features

Applies to: application UI, database, storage, analytics, AI, email/push, support/admin tools, exports, and migrations

## Safety promise

The product records practices; it does not measure salvation, divine approval, holiness, or human worth. It must not pressure a person to disclose private spiritual material, exercise through danger, follow a medically inappropriate covenant, expose a service recipient, or continue a strict attempt at the expense of health and safety.

Privacy and safety are product behavior, not only policy text. Defaults, database access, notifications, analytics, AI payloads, proof storage, and customer copy must enforce them.

## Data classification

| Class | Examples | Default access | Analytics/notification use |
|---|---|---|---|
| Restricted spiritual/private | prayers, reflection bodies, covenant text, ego signals, pastoral/application notes | Owner only; exceptional audited support access only with user authorization or legal necessity | Never include content; event metadata only with consent |
| Restricted health/wellness | movement adaptations, rehabilitation/recovery choices, nutrition/hydration covenant, wellness notes | Owner only; no public/social views | Never include content; coarse safety telemetry only |
| Restricted service/third party | recipient identity, story, location, image, contact details | Do not collect by default; owner only if voluntarily entered | Never |
| Private proof | photos, captions, attestations, source metadata | Owner only, private bucket, short-lived signed URL | Type/count only; no URL/caption/image |
| Private formation progress | track, attempt/day/circuit state, Main Promise metadata | Owner only; support/admin role sees minimum operational state | Allowlisted IDs/statuses only; message copy uses minimal state |
| Account/security | auth identifiers, email, subscriptions, device IDs, IP/security events | Strict need-to-know | Security/delivery systems only |
| Public governed content | licensed Scripture references/text, approved historical/source material, generic practices | Public/authenticated as license permits | Content ID/version, not user response |
| Shared export | a user-created derivative after preview/redaction | Possessed by user; no permanent public ACL by default | Export event only |

Data minimization rules:

- Do not require prayer text, recipient identity, exact location, photo proof, diagnosis, weight, calories, or detailed nutrition.
- Service can be a private yes/no attestation with a coarse category.
- Circuit details store typed facts. Free text belongs in a separate restricted reflection record.
- Avoid collecting date of birth when an age band or eligibility confirmation is sufficient. The current birthday prompt should be reassessed.
- Device and sync data expire when no longer needed for integrity/support.

## Default visibility and sharing

- Every new proof, reflection, promise, covenant, wellness record, service rep, and attempt is private.
- `ProofVisibility` v1 has only `private` and `shared_export`; there is no persistent “public profile” state.
- Sharing is an explicit action after a preview that identifies included fields, removes exact timestamps/location as appropriate, and excludes captions by default.
- Service exports contain no recipient information unless the user deliberately writes it into a derivative after a warning. The application never suggests tagging the recipient.
- A group/challenge join does not grant access to private formation data. Existing challenge participant policies must not be reused.
- Certificates/milestones are private by default and use neutral completion language.

## Authorization and database requirements

All formation tables must enable RLS before production data can be written.

Required policy behavior:

1. An authenticated owner can select their rows.
2. Only approved server commands can insert/update terminal or rules-sensitive rows. Direct client writes to attempts, days, completion records, covenant versions, and closeout state are denied.
3. Private text and proof metadata are owner-only. No “authenticated users can read invite records” policy applies.
4. Service-role access is limited to narrowly scoped functions and never exposed to the client.
5. Admin/support access is purpose-bound, role-checked, audited, time-limited where possible, and excludes content unless necessary and authorized.
6. Deletes use owner-scoped server commands that honor legal/audit retention without leaving public assets.
7. Cross-user foreign keys are validated in the transaction; possession of a UUID is not authorization.

Test every table/function with owner, second authenticated user, anonymous user, scheduler, and approved admin roles. A missing/invalid JWT or scheduler signature must fail closed.

### Edge-function authentication

The current repository config contains many functions with `verify_jwt = false`, some of which self-authenticate and some of which serve schedulers. Every function must declare exactly one mode:

- authenticated user JWT;
- signed internal scheduler/webhook with replay protection;
- authenticated admin with server-side role check;
- intentionally public, read-only, rate-limited configuration/content.

Do not combine public configuration retrieval and service-role bulk delivery in one endpoint. In particular, split Web Push public-key retrieval from push scheduling/delivery. Log request IDs and coarse outcomes, never private payload content.

## Proof and storage standard

The existing public `ig-proof-images` bucket is incompatible with the new promise.

For new formation proof:

- use a dedicated private bucket;
- generate opaque owner-prefixed object paths on the server;
- sanitize/re-encode images before upload and strip EXIF, GPS, device, and embedded thumbnail metadata;
- validate MIME by content, size, dimensions, and supported decoder, not filename;
- serve short-lived signed URLs only after owner authorization;
- scan/quarantine malformed or unsupported uploads;
- store the sanitized hash for duplicate/idempotency checks;
- create share exports as new redacted derivatives; do not flip the original object public;
- remove storage objects and derivatives on deletion according to the retention policy;
- provide a non-photo attestation path.

Legacy remediation:

1. Inventory public bucket objects and database references without exposing URLs in logs.
2. Stop new formation writes to the bucket immediately.
3. Copy and verify each owner's object into private storage; preserve source metadata.
4. Update owner-scoped records in an idempotent migration ledger.
5. Remove/rotate public objects after verified copy and a recovery window.
6. Communicate material exposure/remediation as required by policy and law.

Browser Dex data is also private but fragile. Import only after authenticated owner preview and consent. Do not clear local data until server hash/count verification and an export/recovery option are available.

## AI privacy and spiritual safety

AI is optional assistance and never a formation authority.

### Consent scopes

Add granular, revocable scopes for:

- formation progress metadata;
- reflection/prayer text;
- covenant/wellness context;
- service context;
- cross-session formation memory;
- generated notification summaries.

All are off by default except generic, non-personal content generation. Existing broad personalization consent does not imply these scopes.

### Processing rules

- Show what data will be sent before first use and provide a “continue without AI” path.
- Send the minimum selected excerpt; never bulk-load historical private records by default.
- Do not use private formation data for advertising, model training, public examples, or cross-user personalization.
- Do not label AI output as Scripture, prophecy, pastoral counsel, diagnosis, or God's message.
- Display source/content labels and a concise uncertainty notice.
- AI cannot mark circuits complete, close/end/restart attempts, change covenants, share proof, or enable notifications.
- An AI-suggested ego signal is ephemeral until the user reviews and saves it; dismissal does not become a negative signal.
- Provide memory inspection, correction, and deletion.
- Keep provider request/response logs free of raw private text where operationally possible; define retention with the provider.

Potential self-harm, abuse, eating-disorder, exercise-compulsion, or medical-danger language requires a reviewed safety response that encourages appropriate immediate/human help without pretending to diagnose. Crisis resources must be region-aware and maintained outside generative output.

## Analytics and error reporting

PostHog autocapture is currently enabled. Formation surfaces require allowlisted manual events and input masking before cohort rollout.

Allowed examples:

- `formation_path_selected` with track and onboarding version;
- `formation_circuit_recorded` with track, circuit type, rule version, adaptation category, and sync outcome;
- `formation_day_closeout_result` with day number/status/missing requirement codes;
- `formation_attempt_ended` with coarse system reason only;
- `formation_migration_completed` with counts and error categories;
- `formation_notification_preference_changed` with channel/purpose/enabled;
- `formation_content_viewed` with content ID/version/provenance.

Prohibited event properties include reflection/prayer/promise/covenant/caption text, recipient details, photo URLs/hashes, exact health facts, exact location, email, and hidden book content. User IDs may be pseudonymous in product analytics; access and retention are restricted.

Sentry must scrub request bodies, query strings, Supabase payloads, local storage, signed URLs, and user text. Breadcrumbs on sensitive forms should record control IDs/outcomes, not values. Session replay, if introduced, must be disabled on formation surfaces or comprehensively masked and separately consented.

## Notifications and communications

- Opt in separately to email and push, and separately to formation reminders versus summaries.
- Default quiet hours and timezone come from an explicit, editable setting.
- Messages contain a generic next-action label, local deadline/sync status if needed, and a deep link. They do not contain private text or proof thumbnails.
- Use neutral language: “A practice is still open,” “Sync this device,” “Your attempt ended,” and “Begin again when you are ready.”
- Never say or imply that God is disappointed, the user lacks faith, service is owed for a streak, or physical discomfort should be ignored.
- A user can disable a channel from the message and from settings. Consent changes take effect promptly and are audited.
- Deduplicate email/push with a domain-event key. Do not send an “incomplete” notice while offline events are pending reconciliation.
- Scheduler access uses signed requests/replay protection and least-privilege read models.

## Movement, nutrition, hydration, and recovery safety

The product is not medical advice. On setup and at relevant adaptations:

- tell users to follow clinician/therapist guidance and local safety conditions;
- allow walking, mobility, rehabilitation, and recovery work as equal-status adaptations;
- offer an indoor safety alternative when outdoors is unsafe or inaccessible, subject to the approved strict rule;
- do not use calorie targets, weight-loss pressure, pain-as-progress, punishment workouts, or compensatory exercise;
- let a user end or cancel an attempt for health/safety without dark patterns;
- make covenant changes possible for health/safety through an audited, future-effective process;
- avoid public streaks or scores that incentivize hiding injury or compulsive behavior;
- make proof optional and accessible without a camera.

If the strict outdoor rule has no approved safe alternative, that limitation must be disclosed before opt-in and the UI must prioritize safety over completion. The preferable product decision is a documented honest indoor safety alternative.

## Spiritual and behavioral safety

Prohibited patterns:

- treating completion as salvation, sanctification proof, divine favor, masculinity/femininity, or superiority;
- quoting creative reconstruction as Jesus, Scripture, a historical person, or a church tradition;
- coercive covenant language or forced confession;
- “failure,” “weak,” “lazy,” punishment, red-alert, loss-framing, or escalating shame after drift;
- service counts, photos, or public feeds that turn recipients into content;
- AI claims to discern sin, God's will, demonic activity, diagnosis, or the user's spiritual state;
- pressure to remain in strict mode when Read Along, 40-Day Charge, pause, adaptation, or exit is safer.

Required language patterns:

- “Attempt ended,” “Begin again,” and “What did this attempt teach you?”
- “Adaptation is an honest form of stewardship.”
- “Completion records a practice; it does not measure your standing with God.”
- “Keep recipient details private.”

Content governance and qualified human review are defined in [content-governance.md](./content-governance.md).

## Children, vulnerable users, and regional scope

Minimum age and regional launch are blocking legal/product decisions. Until they are resolved:

- do not intentionally market to or onboard children;
- avoid collecting full birth dates solely for motivational perspective;
- do not add guardian/community visibility features;
- provide clear routes to account deletion and human support;
- review applicable privacy, consumer-protection, biometric/image, health, marketing, and auto-renewal requirements for launch regions.

This document is an engineering/product standard, not a substitute for legal review.

## Accessibility and inclusive safety

- Every required practice must have a keyboard/screen-reader path and a non-photo alternative.
- Status is conveyed by text and semantics, not only color, rings, sound, or motion.
- Honor reduced motion throughout, not just global CSS.
- Support 200% zoom, large text, touch targets, switch control, and landscape.
- Do not time out private forms without saving an encrypted/local draft warning and recovery path.
- Adaptation language includes disability, chronic illness, pregnancy/postpartum, age, caregiving, environment, and temporary injury without requiring disclosure.
- Notifications and closeout times must not demand action during worship, work, sleep, caregiving, or crisis; users control reminders.

## Retention, export, correction, and deletion

Before launch, publish a retention schedule by class. Recommended starting points:

- private reflections/covenants/proof: retained while the account exists unless the user deletes them; support verified deletion and export;
- signed URLs: minutes, not permanent;
- share-export derivatives: explicit expiry or user-controlled deletion;
- offline device-event inbox: short operational window after reconciliation, retaining only an audit digest if required;
- analytics: shortest useful aggregate window, with no content;
- notification payload/log body: do not retain sensitive content; retain delivery metadata only;
- immutable attempt/completion audit: retain minimal status/integrity facts, with a policy for account deletion and legal obligations.

Exports separate private content from progress metadata, include provenance/version, and avoid exposing raw storage paths. Corrections to strict history create a visible audited correction; support never silently changes a day. Deletion propagates to database, storage, exports controlled by the service, AI memory, analytics identifiers where supported, and queued notifications.

## Incident and abuse controls

- Rate-limit uploads, public content, auth, telemetry, AI, and notification endpoints.
- Detect object-path traversal, content-type spoofing, replayed scheduler/webhook requests, idempotency-key misuse, clock rollback, and timezone manipulation.
- Maintain kill switches for formation writes, closeout scheduler, notifications, AI context, imports, and proof uploads independently.
- Alert on cross-user RLS denials, unexpected service-role scans, public object access, closeout conflict spikes, and duplicate notifications.
- Run a privacy incident playbook that can stop access, preserve evidence, identify affected owners, rotate URLs/credentials, and communicate.

## Launch privacy/safety checklist

- [ ] Private proof bucket and signed URL policies verified; no new formation writes to public buckets.
- [ ] Owner/other-user/anonymous/admin/scheduler authorization tests pass for every table and endpoint.
- [ ] Sensitive-page analytics autocapture/replay disabled; Sentry scrubbing verified with canary secrets/text.
- [ ] AI scopes default off and payload inspection tests pass.
- [ ] Reflection, covenant, wellness, and service text absent from notifications and analytics.
- [ ] Movement adaptations have equal completion semantics and reviewed safe copy.
- [ ] Offline/late events cannot silently backfill; conflict messaging is neutral.
- [ ] Export, correction, proof deletion, account deletion, and AI-memory deletion tested.
- [ ] Content has provenance, licensing, theological, and safety approval.
- [ ] Accessibility and assistive-technology flows pass on required actions.
- [ ] Minimum age, regions, retention, incident owner, and support escalation are approved.
