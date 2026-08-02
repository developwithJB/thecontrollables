# Christian Formation Product Specification

Status: proposed

Audience: product, engineering, design, content, pastoral/safety reviewers

Scope: the migration from the current Life OS to The Controllables Christian formation companion

## Product promise

> Put Jesus first. Train what you can control. Keep your word. Steward your body. Serve others.

The Controllables is a guided Christian formation companion. It helps a person practice awareness, perspective, habit, wellness, and environment in ordinary life. Completion is evidence that a practice was recorded; it is never evidence of salvation, God's approval, moral worth, or comparative spiritual maturity.

The experience must be disciplined without being punitive. It must support honest adaptation, privacy, rest, recovery, and beginning again. Customer-facing copy must not reference or imitate the name, voice, or failure language of “75 Hard.”

## Product principles

1. **Formation before gamification.** Progress clarifies the next faithful practice. Points, streak pressure, leaderboards, spiritual ranks, and “perfect Christian” metaphors do not belong in the formation experience.
2. **Truth without shame.** Strict rules are explicit before opt-in. A missed strict day is recorded accurately as “Attempt ended,” followed by reflection and a voluntary “Begin again” path.
3. **Private by default.** Prayer, reflections, covenants, wellness, service recipients, and proof are private unless a person takes a separate, informed sharing action.
4. **Safe stewardship.** Movement may be walking, mobility, rehabilitation, or recovery work when that is the honest and safe choice. The product never diagnoses, prescribes, or encourages a person to override medical guidance.
5. **Service is not performance.** The app records that service or encouragement occurred without requiring the recipient's identity, image, or story.
6. **Source integrity.** Scripture, historical evidence, tradition, pastoral application, and creative reconstruction are visibly distinct and reviewable.
7. **One account, several paths.** A person may read, train for 40 days, or opt into a strict 75-day attempt without losing prior activity or being forced through new-user onboarding again.
8. **History is append-only where integrity matters.** Ended attempts, completed days, and completion records are not silently rewritten. Corrections are auditable.

## Users and jobs

### Reader

“Help me understand and apply the book without revealing later material.”

- May not own, may be reading, may have finished, or may be rereading/leading.
- Wants chapter-aligned practices with optional reflection and proof.
- Needs pause-friendly progress and spoiler-safe content.

### Guided trainee

“Help me practice all Five Controllables consistently, recover honestly, and serve each week.”

- Chooses 40-Day Charge.
- Benefits from a daily structure but not restart rules.
- Needs adaptations, Recovery Wins, weekly review, and a compassionate return after missed work.

### Strict trainee

“I knowingly want a clear, consecutive 75-day commitment with an honest record.”

- Explicitly chooses Fully Charged: 75 Days and accepts the current covenant/rules version.
- Needs unambiguous local-day boundaries, daily closeout, offline safety, immutable attempt history, and a clean restart model.
- May need movement adaptation and should never be nudged to trade health for a completion mark.

### Returning Life OS user

“Show me what is changing, preserve my history, and let me choose what is next.”

- Must retain book progress, reflections, missions/promises, proof, snapshots, and completed Controllable activity.
- Must not be treated as a brand-new user or be sent through the existing full first-run flow.

## The three paths

### Read Along

- No deadline and no restart behavior.
- Progress is aligned to book chapters or approved sections, not an arbitrary daily streak.
- Practices attach to the current visible chapter.
- Reflections and proof are optional.
- Pause and resume have no penalty.
- Content after the reader's current progress is hidden or summarized according to book status.
- Finishing the book produces a reading milestone, not a spiritual achievement certificate.

### 40-Day Charge

- Forty formation days; the canonical product decision must define whether these are calendar days or completed training days before implementation.
- All Five Controllables are trained across the journey.
- A missed circuit or day never erases or restarts the journey.
- Recovery Wins recognize an honest return after drift.
- Movement can adapt for health, ability, recovery, environment, and safety.
- A private service or encouragement mission is offered weekly.
- The language is “continue,” “return,” and “recover,” not “failed.”
- Weekly reviews emphasize learning and grace, not a performance score.

### Fully Charged: 75 Days

- Seventy-five consecutive local calendar days.
- Strict mode requires separate, informed opt-in. It is never the default recommendation for a new user.
- Every day requires all five circuits:
  - **Awareness:** prayerful notice and honest attention.
  - **Perspective:** Scripture-informed reframing or reflection.
  - **Habit:** one recorded Main Promise and the day's promise practice.
  - **Wellness:** two movement blocks, at least one outdoors, plus the user's personal nutrition and hydration covenant. Safe adapted movement is valid when selected honestly.
  - **Environment:** preparation of the physical or digital environment plus a private service or encouragement action.
- Day completion is an explicit, server-confirmed closeout. Individual circuit marks alone do not imply the day is complete.
- If a required day remains incomplete at its authoritative closeout boundary, the attempt ends. The record remains visible and unchanged.
- “Begin again” creates a new attempt linked to, but never overwriting, the previous attempt.
- Seasons provide content framing, not tiers of spiritual worth:
  - Days 1–25: Be With Jesus
  - Days 26–50: Become Like Jesus
  - Days 51–75: Do What Jesus Did

## Core experience

### Entry and path choice

New users receive a short orientation to the promise, privacy, safety, and paths before choosing. Returning users receive a migration invitation that recognizes their history, previews what has changed, and offers Read Along, 40-Day Charge, Fully Charged, or “decide later.”

Strict-mode setup adds a readiness check, timezone confirmation, movement adaptation explanation, personal covenant, Main Promise, environment preparation, privacy notice, current rules version, and explicit acceptance. The app must make the consequences of an incomplete day understandable before starting.

### Formation home

Home is path-aware. It presents:

- the active path, local day, and formation season where applicable;
- the next recommended action rather than every Life OS module;
- today's five circuits or chapter practice;
- Main Promise and environment preparation;
- safe movement/adaptation controls;
- a private service action without recipient details;
- evening closeout when eligible;
- a quiet link to history, reflections, book progress, and settings;
- neutral offline/synchronization state.

Legacy Life OS data remains reachable during migration through a clearly named history/archive area. It is not deleted to simplify navigation.

### Proof

Proof is optional except where a rule explicitly requires evidence classification. Even then, the default evidence can be a private attestation; a photo is not automatically required.

- New proof assets use private storage and expiring signed URLs.
- Exact location and unnecessary image metadata are removed.
- Sharing is a separate export action with preview and redaction.
- Service proof must not identify a recipient by default.
- The existing public legacy proof flow is quarantined and migrated before it can back the new system.

### Reflection and review

Reflections are private, skippable except when a user explicitly chose a covenant requiring one, and excluded from analytics payloads. Weekly reviews ask what helped, what caused drift, what to adapt, and what to carry forward. The product does not generate a spiritual grade.

### AI assistance

AI can suggest a next practice, summarize user-selected material, or help phrase a reflection only after granular consent. Formation reflections, prayers, covenant text, wellness context, and service details are excluded by default. AI output is clearly labeled, never presented as Scripture or pastoral authority, and cannot autonomously complete, close, end, restart, or share an attempt.

### Notifications

Email and push are opt-in by channel and purpose. Copy is timezone-aware, quiet-hour aware, non-shaming, and contains no sensitive reflection, health, covenant, or service text. A strict-day reminder communicates the user's configured boundary and synchronization state without using fear or divine-approval language.

## Existing-user migration experience

1. **Inventory silently.** A read-only migration service discovers existing book progress, daily rings, completed actions, missions, promises, reflections, proof, snapshots, reset sessions, and relevant browser-only records.
2. **Invite, do not reset.** Existing authenticated users see a versioned “The Controllables is evolving” invitation. Their prior onboarding remains complete.
3. **Explain preservation.** Show counts and categories found, including records that remain in the legacy archive and browser-only items that need consent to import.
4. **Choose a path.** Offer all three paths and “decide later.” Do not infer strict-mode consent from old reset or challenge participation.
5. **Confirm private browser imports.** Read Along, My Controllables, Dex, daily reading, and Control/Release/Move data currently in local storage are previewed and imported only for the signed-in owner. Import operations are idempotent and retain source metadata.
6. **Map, do not fabricate.** Existing activity may count as historical formation activity, but it cannot be converted into completed days of an active 75-day attempt. Ambiguous records remain labeled “legacy.”
7. **Keep a legacy archive.** Historical seven-day snapshots, ended/completed reset sessions, proof, reflections, XP, and activities remain viewable. Legacy XP is not used as a spiritual formation score.
8. **Start intentionally.** A new 40- or 75-day journey begins only after explicit setup. Read Along begins from imported chapter/section progress when a reliable mapping exists; otherwise the user confirms the mapping.

Migration acceptance criteria:

- rerunning import produces no duplicates;
- every imported row includes source, source identifier, import batch, and original timestamp when available;
- browser-only data is not cleared until server persistence is confirmed and the user has an export/recovery path;
- migration reports counts, unmapped items, and recoverable errors;
- no legacy history satisfies a new strict attempt retroactively.

## Success measures

Use aggregate, privacy-preserving events and never reflection text. Initial measures:

- path-choice completion and “decide later” rate;
- first-practice completion by path;
- return after a missed 40-Day practice;
- use of safe movement adaptations without lower product status;
- weekly service attestation rate, never recipient identity;
- strict closeout synchronization success and conflict rate;
- migration completion, import failure, and legacy-history access rates;
- notification opt-in, delivery, and disable rates;
- accessibility task-completion rate and support incidents;
- voluntary path switches and reasons selected from non-sensitive categories.

Do not ship leaderboards, public streaks, spiritual scores, comparative “faithfulness,” or optimization goals that reward unsafe completion.

## Non-goals

- Replacing a church, pastor, clinician, physical therapist, dietitian, or crisis service.
- Diagnosing spiritual, mental-health, eating, sleep, or exercise conditions.
- A social network or public service-performance feed.
- A broad rewrite of React, Supabase, or the current design system.
- Automatically converting Life OS history into strict completion credit.
- Allowing AI to make authoritative theological claims or edit history.
- Requiring photos, exact location, or recipient identity to prove service.

## Launch requirements

The new path cannot graduate beyond a small opt-in cohort until:

- rule and content versions are immutable per attempt;
- server-authoritative, idempotent completion works across timezones, DST, offline delay, and concurrent requests;
- all formation tables and storage objects have owner-scoped access tests;
- new proof uses private storage and the public legacy bucket has a migration plan;
- sensitive analytics capture is disabled or allowlisted;
- browser-only legacy import is recoverable and tested;
- notifications honor consent, timezone, and quiet hours;
- keyboard, screen-reader, reduced-motion, zoom, mobile, and landscape checks pass;
- pastoral/theological, privacy, and safety reviewers approve the initial content set;
- support can explain ended attempts, synchronization conflicts, data export, and deletion.

## Open product decisions

These block stable rule or schema contracts:

1. Is 40-Day Charge forty consecutive calendar days or forty completed formation days, and what is its pause behavior?
2. What minimum cadence makes “all five trained throughout” true for 40-Day Charge?
3. Does service belong inside Environment for strict daily completion, or is it an additional sixth requirement represented separately?
4. What is the strict local-day closeout/grace policy for offline devices, and may a support reviewer resolve disputed events?
5. Is an attempt timezone fixed at start, or may a user schedule an audited timezone change for travel?
6. What qualifies as an outdoor movement block when weather, disability, safety, caregiving, or local restrictions make outdoors unsafe?
7. What book chapter/edition mappings and translation licenses are authoritative?
8. What minimum age, regional availability, data-retention period, and deletion SLA apply?
9. Which existing legacy proof can be migrated from a public bucket, and must exposed object URLs be rotated?
10. Who has final publishing authority for theological, historical, wellness, and safety content?

## Related documents

- [Current system audit](./current-system-audit.md)
- [Domain model](./domain-model.md)
- [Implementation plan](./implementation-plan.md)
- [Privacy and safety](./privacy-and-safety.md)
- [Content governance](./content-governance.md)
- [Test strategy](./test-strategy.md)
