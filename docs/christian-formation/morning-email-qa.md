# Morning Formation Email QA

Updated: 2026-08-16

## Product flow

1. Open `/quick-start` while signed out.
2. Answer `Where are you with the book?`.
3. Answer `How deeply do you want to train right now?`.
4. Confirm the morning formation email is on by default and the UI identifies the 7:00 AM local delivery window.
5. Optionally turn the email off and confirm the review and signup screens preserve that choice.
6. Create an account and confirm the app opens `/formation/today`.
7. Open Profile Settings from `/home?settings=email` and change the email rhythm to every morning, Mondays only, or off.

## Email contract

- The selected formation path is persisted to the authenticated profile.
- Every-morning delivery uses the user's IANA timezone and the existing daily nudge scheduler.
- The email leads with the current formation day and season, shows the Five Circuits, and provides one CTA to today's practice.
- Existing send-log deduplication prevents more than one daily formation email per user and local date.
- If the user changes paths, the new path begins on that date and the email preference is preserved.

## Privacy contract

The morning email may contain the user's first name, selected path, day number, season, and circuit completion status. It never receives or renders prayer text, reflection text, gratitude, Control / Release / Move text, promise text, wellness details, nutrition details, service-recipient information, proof images, journal content, money, calendar, or AI guidance.

## Local validation

```bash
VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 4174
npx vitest run tests/unit/formation-enrollment.test.ts tests/unit/formation-email.test.ts tests/unit/formation-email-migration.test.ts tests/unit/daily-nudge-security.test.ts
npx playwright test tests/e2e/new-customer-entry.spec.ts
npm run build
git diff --check
```
