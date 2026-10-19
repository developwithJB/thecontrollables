# First-week onboarding release

## Behavior
Newcomers can understand the five canonical Controllables, try a disposable Bible.com NLT practice, compare available paths, and carry their selection into signup. Awareness 🦉 explicitly owns faith and spirituality. Existing stored prayer and circuit rules stay intact.

The public readiness RPC returns aggregate content availability and, only when already published and independently approved, a Day 1 example. It follows the strict-start bundle predicate (75 distinct days and exactly 75 eligible current versions). Missing/error states fail closed and offer Read Along. The sample's fallback is a clearly labeled, unassigned Scripture-reading demonstration; no bundled draft becomes an approved lesson.

Email defaults off. An explicit request stays pending until authenticated enrollment succeeds. Delivery readiness defaults false. Auth work runs outside the Supabase auth callback lock; failed enrollment retains the draft and offers Retry. Signup confirmation is a durable masked-address screen with resend cooldown, edit-email and sign-in actions. Existing metadata supplies the path on a different-device confirmation, without reapplying outdated signup preferences on every login.

Unsaved circuit edits are protected from background history synchronization and stale save responses. Return navigation waits for pending saves, and photo proof merges into the latest edited draft. Today offers one next practice, private return context, examples and optional AI coaching, a selected-Sabbath preview, explicit deadline and a server-confirmed closeout receipt. The first-week review counts saved circuits once within the first seven calendar days. Optional learning and intention are saved through the existing private Environment record, never analytics or share output. The share-safe preview contains static text only. No AI request occurs automatically.

## Ten UX moments
1. Landing: explain the canonical five roles and faith ownership.
2. Before signup: try Observe / Understand / Respond with a Bible.com NLT link.
3. Compare: clear commitment, miss policy, unavailable-content notice and Read Along alternative.
4. Account handoff: remembered selection, truthful preferences, confirmation and retry.
5. Day 1: one prominent next circuit, starting with Awareness.
6. Closeout: five practices followed by explicit Close today and a saved receipt.
7. Return: correct Today route and most recent private saved promise.
8. Help: concrete field examples and optional, disclosed AI with existing limits.
9. Rest/recovery: locked Sabbath, exact requirements and compassionate honest attempt history.
10. Day 7: private counts, learning, intention and a share-safe preview.

## Deployment
Apply `20261020000400_formation_entry_readiness.sql` transactionally before the frontend. No new tables or auth grants are introduced. Anonymous callers receive only public aggregate readiness and approved published sample content. The service-only rollout row retains its existing grants and RLS. Do not set `formation_email_verified` until authenticated scheduler execution, verified sender and controlled delivery are proven. No coach rollout flags, billing configuration or attempt rules change.

Read-only Lovable preflight on 2026-10-19 found **zero** content versions, no reviewed sample, incompatible anon scheduler credentials, and no Vault scheduler credential. A follow-up read-only Resend check confirmed the existing sender domain `thedashboard.agbcoaching.com` is verified and generic nudges have previously sent successfully; the earlier unverified-sender finding was incorrect. Formation-specific mornings have not delivered, and their scheduler authentication remains blocked. The user confirmed the 75-day packet is not yet reviewed. Accordingly this release opens Read Along and the sample experience; Fully Charged new starts and email delivery remain visibly gated. It cannot honestly be described as an activated 75-day customer program until those dependencies are completed. Importing drafts or recording theological approval requires the actual review workflow; do not fabricate a reviewer or approve on a user's behalf.

## Verification
Run the full unit suite, emoji contract, application TypeScript and production build. `playwright.entry.config.ts` isolates Supabase requests with fixtures and blocks service workers so WebKit cannot bypass API interception. `playwright.formation.config.ts` uses development-only mock auth; the seven-day scenario uses real local repository saves and UI closeout across spring DST, including Sunday Sabbath, reload and private share boundaries. This is not a production signup or delivered-email test.

Real local PostgreSQL tests: `tests/database/formation-entry-readiness.sql` verifies empty/complete/partial bundles, public projection, date bounds and forbidden anonymous rollout writes. `tests/database/strict-sabbath-rest.sql` exercises 75 actual database days/375 circuits, missing-day termination, closeout and DST. Both roll back synthetic fixtures. Never run these against production.

The repository has existing lint violations; compare touched-file messages with baseline instead of claiming the entire repository lints clean. No real signup, email, paid AI request or content approval is part of automated release tests.
