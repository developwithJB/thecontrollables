# Optional private check-ins and review-day invitations

PR-B is independent of PR-A and does not change any circuit, review gate, scoring,
strict closeout or existing attempt. The check-in is optional and not graded.

## Storage decision

The original wellness_logs policies cover owner select/insert/update but no
owner delete policy was found. Its data also feeds existing timeline and AI
features. The book-loop kind allowlist does not permit a private check-in kind.
Neither is suitable for this feature without changing its privacy boundary.

Use a separate `wellness_private_checkins` table for both sleep and feelings.
The migration under `supabase/migrations/` is LOCAL ONLY and needs JB's explicit
production authorization. It provides owner-only authenticated RLS for all four
operations, no anonymous grants, and named insert/update columns. The save RPC
is SECURITY INVOKER, requires auth.uid() to match the expected owner, and updates
only ordinary values during an upsert. Ownership/date cannot be updated by clients.
No service-role client key is used by the browser.

The UI accepts an optional 1–5 sleep rating, optional 0–24 hours, an optional
fixed-list feeling and a note of at most 280 characters. Values remain in memory
until explicitly saved; there is no localStorage backup or offline upload queue.
Concurrent saves for one account/date use last-write-wins; this is not a strict
formation record or a medical assessment.

Retention assumption: retain until the owner deletes it or deletes their
account (foreign-key cascade). Delete today removes one date. Delete all asks
for confirmation and removes only this owner's private check-ins across dates,
then clears cached check-in values. Account/date changes reset the editor; private query cache is discarded when its screen unmounts. Formation history stays unchanged.

## Privacy boundary

No check-in payload enters analytics, growth events, AI prompts, timeline,
notifications, share URLs or scoring. The form is marked `ph-no-capture` to block
PostHog capture/replay, with additional privacy markers. Only generic status
copy appears on success/failure; database errors and values are not logged.
PostHog reference: https://posthog.com/docs/session-replay/privacy .

Heavy/anxious choices show a local-only support sentence; it is not saved in the
record. The US 988 support link was checked against the available helpline
lookup. It does not diagnose a condition or imply that a feeling is a crisis.

## Community invitation

Only an open strict-path day with an existing reviewDay marker offers the
invitation. Markers remain 7,14,21,25,32,39,46,50,57,64,71,75 (not a new Sabbath
rule). Share text is generic and the public URL contains only campaign UTMs.
Native share cancellation does not copy automatically or claim completion.
Clipboard success is measured as copying, not proof of an accepted invitation.

## Local verification

Apply the new migration only to an isolated disposable local Supabase, then run
`tests/database/wellness-private-checkins-security.sql` through local psql. The
rollback-only fixtures cover owner insert/update/delete, account isolation,
invalid content, immutable ownership and anonymous denial. No remote migration,
production account, private customer data or real message sending is needed.

The installed PostHog recorder defaults `blockClass` to `ph-no-capture` in
`node_modules/posthog-js/lib/src/extensions/replay/external/lazy-loaded-session-recorder.js`.
The check-in UI uses that class on the entire section, not just its note input.

A dedicated localhost-only real Auth/PostgREST browser check is available:

```sh
node scripts/run-private-checkins-local.mjs /path/to/local-status.json
```

The runner refuses non-local URLs. Service-role test credentials stay in the Node
fixture process; Vite receives only the local public key. Disposable auth users
are removed after tests. Tests at 375px/1280px cover save/reload, cross-owner read
isolation, the local-only support line, delete-all and empty reload. They also
check horizontal overflow and capture screenshots under untracked artifacts/.
