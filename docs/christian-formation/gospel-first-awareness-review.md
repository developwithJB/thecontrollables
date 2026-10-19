# Gospel-first Awareness — editorial review packet

Status: AI-assisted draft revision v2; independent theological review pending.

Every day in the [75-day copy ledger](fully-charged-75-day-recap.md) now begins with a passage from Matthew, Mark, Luke or John. The existing 25/25/25 seasons, five circuits, required actions, private storage, server closeout and historical attempts are unchanged. The reading leads to three consistent prompts:

1. **Observe:** What does this passage actually show about Jesus?
2. **Understand:** What does it reveal about his character—and challenge in my assumptions?
3. **Respond:** What is one honest truth I need to carry today?

These prompts are pastoral application, not Bible quotations. The response uses the existing One honest truth field. Observation and understanding can remain unrecorded; no extra writing requirement, grading of theology, or analytics collection is added. Other tracks keep their current experience.

## Reading decisions for review

Existing Gospel readings are retained where appropriate. Epistle/Acts assignments are replaced with Gospel encounters or teachings that fit the day's existing focus: humility in John 13, truthful repair in Matthew 18, patient attention in Mark 10, gentleness in Matthew 12, temptation/self-control in Matthew 4, following Jesus in Luke 9, hidden faithfulness in Matthew 6, invitation in John 1, practical care in Matthew 25, hospitality in Luke 14, speech in Luke 6, love for enemies in Matthew 5, and conversation across boundaries in John 4.

Day 2 expands Mark 1:35 to 1:35–39 to retain prayer and mission context. Day 38 includes Mark 12:38–44 so the widow's offering is not detached from the preceding warning about exploitation. Day 70 becomes Protect the vulnerable (Luke 20:45–47); it does not use the widow's offering to require giving beyond capacity. Review these decisions and all accompanying invitations/reflections together.

Primary reading sources are reference links in each content draft, for example [Mark 1:35–39](https://www.biblegateway.com/passage/?search=Mark%201%3A35-39&version=NLT) and [John 13:1–17](https://www.biblegateway.com/passage/?search=John%2013%3A1-17&version=NLT). No copyrighted translation text is copied. A reference is not a claim that a reviewer has approved its application.

## Publication and versioning

The frontend can be deployed with these changes. Public roadmap and local QA show explicit draft labels. Authenticated active journeys receive prompts only when all three appear in the body returned by the existing reviewed-content RPC. They never fall back to the bundled draft. Legacy published bodies continue rendering as before.

The editorial seeds are version 2, AI-assisted, draft and theological-review pending. The active content-bundle constant is deliberately unchanged: changing it in client code would not publish or approve the new content and could disrupt new attempts. Existing attempts and published content are not edited. No database migration or production data update is part of this change.

Before activating the new 75-day assignments, the responsible human editor must import/create the 75 draft versions using the existing governed editor, arrange an independent qualified theological review, resolve requested changes and source-context checks, and publish the approved versions through the existing bundle workflow. Do not bulk-approve, fabricate reviewer identities, change review flags in code, or treat approval of the product direction as theological review of all 75 entries.

## Study attribution and corrections

JB identifies the New Living Translation (NLT) as his study Bible. All Gospel reading links and the new draft metadata now identify NLT; the app reproduces no NLT passage text. Product reflections remain distinguished from Scripture and pending review. NLT publication/quotation guidance is available from [Tyndale](https://www.tyndale.com/permissions). JB’s note welcomes corrections, and the app links to the public GitHub feedback form without prefilled personal data or page queries. The repository is public; this change does not add or claim a software license. Feedback does not automatically approve or publish content.
