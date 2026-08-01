# Daily Circuit Experience Matrix

This matrix documents the Prompt 5 implementation. Track selection changes the rule evaluation and language while the five circuit editors, private daily record, and idempotent save path remain shared.

## Completion behavior by track

| Track | Daily posture | Circuit record behavior | Incomplete work |
| --- | --- | --- | --- |
| Read Along | Low-pressure reading companion | One meaningful circuit action records the practice. Reflection and proof remain optional. | No streak, deadline, restart, or failure state is created. |
| 40-Day Charge | Flexible formation | Any completed action records honest partial progress; completing every available action can mark the circuit complete. | Missing work stays visible in history without pretending it happened or restarting the journey. A private Recovery Win can be recorded in Habit. |
| Fully Charged: 75 Days | Exact daily requirements | The rules engine marks a circuit complete only when every required action below is present. | The interface lists exact open requirements with neutral language such as “Still open today.” Attempt lifecycle and consecutive-day closeout belong to Prompt 6. |

## Circuit requirements

| Circuit | Read Along | 40-Day Charge | Fully Charged: 75 Days | Privacy and safety behavior |
| --- | --- | --- | --- | --- |
| Awareness | Record any one of Scripture, reading, honest truth, or Witness examination. | Any action records partial progress; all four completes the circuit record. | Required: Scripture opened, reading completed, and an honest truth saved. Witness examination is recommended. | Honest truth, Scripture-vs-assumption, and evidence notes are private by default. |
| Perspective | Record any one of prayer, gratitude, Control / Release / Move, Ego Signal response, or a smaller faithful action. | Any action records partial progress; all five completes the circuit record. | Required: prayer practiced, gratitude recorded, all three Control / Release / Move fields, and a smaller faithful action. Ego Signal response is recommended. | Prayer text is never requested. Private text fields are excluded from formation analytics. |
| Habit | Name a Main Promise, answer honestly, add an optional Recovery Win, or attach optional proof. | Any action records partial progress. Recovery reflection records a Recovery Win without rewriting the missed action. | Required: Main Promise named and explicitly marked complete. Recovery reflection is recommended. | Text and photo proof are optional and private. Proof never completes the promise automatically. Photos are re-encoded to strip embedded metadata, stored in a private bucket, accessed with short-lived signed URLs, and deletable. |
| Wellness | Record any personal covenant, movement, sleep, or adaptation practice. | Any action records partial progress; adapted movement counts as legitimate movement. | Required: personal nutrition covenant, personal hydration covenant, two described and honestly completed movement blocks, plus outdoor movement or an indoor safety alternative. Sleep preparation and other adaptations are recommended. | No universal calories, weight, water, sleep, or exercise target is imposed. Safety, clinical guidance, recovery, accessibility, and local conditions take priority. |
| Environment | Record friction removal, tomorrow preparation, or a private service action. | Any action records partial progress; all three completes the circuit record. | Required: friction removed, tomorrow prepared, and private service/encouragement attested. | Recipient identity, hardship, contact information, and images are explicitly discouraged. The optional service note remains private. |

## Shared implementation guarantees

- The five editors are distinct experiences, not generic checkbox forms.
- Every circuit includes its purpose, track-aware status, optional private reflection, privacy guidance, and a clear return to Today.
- Saves use a stable user/date/track/circuit idempotency key and an authenticated database RPC that upserts one daily record.
- Ordinary clients cannot directly insert, update, or delete formation circuit rows.
- Photo proof is limited to JPEG, 5 MB before processing, and an owner-scoped storage path. The production bucket is private.
- The UI is keyboard operable and tested at desktop and mobile breakpoints with serious/critical Axe checks.

## Browser captures

| Moment | Track and device | Capture |
| --- | --- | --- |
| Five-circuit Today hub | Read Along · desktop | [formation-today-desktop.jpg](screenshots/formation-today-desktop.jpg) |
| Responsive Today hub | Read Along · mobile | [formation-today-mobile.jpg](screenshots/formation-today-mobile.jpg) |
| Exact incomplete requirements | Fully Charged · Awareness · desktop | [awareness-strict-desktop.jpg](screenshots/awareness-strict-desktop.jpg) |
| Flexible partial practice | 40-Day Charge · Perspective · desktop | [perspective-40-day-desktop.jpg](screenshots/perspective-40-day-desktop.jpg) |
| Optional protected proof | Read Along · Habit · desktop | [habit-read-along-desktop.jpg](screenshots/habit-read-along-desktop.jpg) |
| Adapted movement and safety | Fully Charged · Wellness · mobile | [wellness-strict-mobile.jpg](screenshots/wellness-strict-mobile.jpg) |
| Private service behavior | 40-Day Charge · Environment · desktop | [environment-40-day-desktop.jpg](screenshots/environment-40-day-desktop.jpg) |

