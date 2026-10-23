# Second QA pass: completion feedback

The customer QA account completed five daily practices without a payment and tried one coach message. This follow-up separates visible formation progress from the older reward systems. PRs #97 and #98 were merged and published on October 23 at source `a963320`, so their fixes are already in the live release. The changes described below are a new draft; they are not deployed.

## Findings and changes

| Report | Response in this draft | Remaining verification |
| --- | --- | --- |
| F35: five practices but zero rewards, all cards READY | Show practice days, days with all five circuits recorded, and per-circuit formation counts. Label legacy moves as separate tools and their open state explicitly. | This preserves the October 19 decision: Read Along creates no XP, charge, kept-promise, covenant-day or streak credit. Any new reward model needs a separate server design. |
| Close today has no visible result | Receipt heading changes to **Today closed**, receives focus below the sticky header, announces the browser acknowledgement and explains returning tomorrow. Persists on reload in the same browser. | It is still display-only; clearing storage or signing out clears the acknowledgement. Practices remain saved in the account. |
| Wellness says saved but isn't counted | An incomplete non-strict save now distinguishes saved notes from a completed practice and explains how to make the circuit count. | A reflection or private check-in alone still does not satisfy an action. No completion rules changed. |
| Billing links return to Billing | The free action on the checkout-enabled Billing plan cards returns to Today. Pro invokes checkout; hosted-coach and usage links target the plans or provider section. Billing now scrolls to the requested section after auth/data loads. | Authenticated production checkout remains unverified in the accessible QA session. No purchase performed. |
| Coach conversation disappears on reload | Add an explicit, off-by-default tab-cache choice. Restore the guide and up to 50 recent messages for 24 hours since last use. New conversation replaces the cache; opting out or signing out removes it. Remount all chat state on account changes. | This is browser-tab continuity, not cross-device history or server AI memory. Optional AI allowance and billing limits are unchanged. |
| `ai_consents` / `ai_memories` 404s | Disable unavailable consent controls, show a truthful error rather than “off” or “no memories,” remove automatic retries/focus refetch, and fetch memories only on demand with enabled memory consent. | Existing migration `20260502000000_ai_native_life_os.sql` defines these tables and RLS. A reported 404 needs an owned hosted-catalog/schema-cache check. This draft does not repair or apply database schema. |
| `/home` blank behind a modal | Add a local Home/settings dismissal regression. Production Home loaded its weekly overview and then its dashboard in the accessible existing JB session. | Not reproduced in the customer QA account; keep this finding open until the exact modal and account state are available. No speculative route rewrite. |
| Central timezone | Preserve existing saved timezones. The existing browser-timezone button and Save Changes apply a correction deliberately; server reminders use the persisted timezone. Existing tests cover explicit new-signup markers and preserving historical Central selections. | No bulk overwrite, migration, or automatic change to existing reminder schedules. A server-persisted new-account default remains a separate deployment follow-up. |
| Phone: truncated promise / bottom Sign Out | Habit and strict-attempt promise inputs become wrapping textareas, with existing size limits. Sign Out remains in the bottom navigation, profile menu and settings as previously requested. | Chromium and WebKit phone emulation are not a physical iPhone/Android test. |

The external Cursor tracker required sign-in in the available browser. The pasted findings are the source for this follow-up; IDs beyond F35 are not assigned to individual rows without the tracker detail.

## Validation

Run only the named local suite:

```sh
npm run test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.app.json
npm run typecheck:review-tests
npm run build
npm run lint
npm run test:unit -- tests/unit/controllable-emoji-contract.test.ts
npx playwright test --config=playwright.second-pass.config.ts
```

The browser suite uses synthetic local data and dev-mock auth, blocks all external traffic except a locally fulfilled fake coach response, and never visits Stripe or production. It saves all five practices through the UI, reloads the receipt, checks unchanged XP and per-circuit counts, restores an opted-in conversation, and checks Home after closing Settings. Mobile viewport is 390×844 with touch emulation; desktop is 1280×900. PNG evidence goes to ignored `output/qa-second-pass-2026-10-23/`, not the source tree.

Regression coverage includes a server-shaped non-strict row with empty completed action IDs, date/track isolation for all-five days, privacy-setting failure, owner isolation and expiry for cached conversations, and annual/monthly Pro action callbacks plus the actual Billing page’s fragment navigation and monthly checkout wiring. The two initial receipt/billing assertions failed against the original implementation before the fixes.

Results: **648/648 unit tests** in 104 files; **9/9 local browser tests** (desktop Chromium, phone Chromium, phone WebKit). Both application checks and the scoped review-test typecheck passed; production build passed. The emoji contract passed 3/3. Lint on a clean tracked-source archive remains **398 errors / 18 warnings**, matching main. The shared workspace reports 399/18 because an existing untracked output script contributes one additional error; it is not in this PR. No lint suppression or unrelated cleanup was added.

No migration, Drizzle file, server function, JWT configuration, entitlement, AI cost limit, content-review gate, private-proof boundary or reward-write path changed. PostHog stays off and YouVersion Platform stays disabled.
