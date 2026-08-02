# New-customer entry QA

Date: 2026-08-01

## Outcome

The acquisition and first-session experience now presents one coherent product: a practical Christian formation system built around The Controllables. A new customer can understand the value, compare all three real formation paths, create an account, and arrive at today's practice without an unexplained intake step or a lost destination.

## What the dry run found

1. The public landing page sold an older XP, Mission 001, Starting Charge, and Journey Edition concept instead of the Christian formation experience users actually receive.
2. The primary CTA opened an eight-step intake and required a birthday without explaining why it was needed.
3. Read Along, Daily Charge, Promise, and Proof links bypassed orientation and opened a generic signup form.
4. Direct protected links redirected to sign-in but discarded the original destination.
5. The three production paths and their materially different miss rules were not disclosed before account creation.
6. Optional photo proof was presented too prominently and could be mistaken for a requirement.
7. On mobile, advancing onboarding retained the old scroll position, placing the next step's headline above the viewport.
8. The primary landing CTA briefly failed the automated contrast check while its parent opacity animation was running.
9. Standalone protected routes such as Reset, Billing, Integrations, and Admin also discarded their return destination.

## Improvements made

- Rebuilt the landing page around the central promise: “Put Jesus first. Train what you can control.”
- Replaced old XP/mission language with the actual five-circuit daily practice.
- Exposed Read Along, 40-Day Charge, and Fully Charged 75 with pace, best-fit guidance, commitment, and miss rules.
- Reduced Quick Start to three steps: book context, formation path, and first-day review.
- Removed the birthday gate and all required private reflection from public onboarding.
- Added explicit informed acknowledgment before Fully Charged 75 can continue.
- Persisted book context and formation path through account creation.
- Made direct signup transparently default to flexible Read Along, with a link to compare all paths.
- Routed completed signup to today's formation practice and saved the selected path for that account.
- Preserved the full safe internal destination through sign-in for every protected route.
- Added privacy, recovery, movement-adaptation, and no-public-ranking guardrails before signup.
- Clarified that optional proof never replaces a required practice.
- Added mobile step focus/scroll correction and removed the transient CTA contrast failure.

## Entry matrix exercised

Public and acquisition entries:

- `/`
- `/quick-start`
- `/quick-start?path=read_along`
- `/quick-start?path=charge_40`
- `/quick-start?path=fully_charged_75`
- `/auth`
- `/auth?mode=signup`
- `/auth?mode=forgot`
- unknown/404 links

Direct protected entries:

- `/home`
- `/formation/today`
- `/formation/today/awareness`
- `/formation/completion`
- `/timeline`
- `/read-along`
- `/goal`
- `/my-controllables`
- `/train`
- `/proof`
- `/proof/dex`
- `/dex`
- `/wellness`
- `/planner`
- `/growth`
- `/reflect`
- `/wealth`
- `/reset?mode=review`
- `/billing`
- `/integrations`
- `/admin`

## Verification

- Desktop and iPhone-sized visual walkthroughs of landing, path selection, review, and signup handoff.
- New-customer Playwright suite on Desktop Chrome and iPhone 14, including every direct protected entry and automated accessibility checks.
- Existing five-circuit Playwright suite on desktop and mobile.
- Full unit suite and TypeScript validation.
- Production Vite build.
- ESLint on every changed TypeScript and test file.

Real email delivery, production account creation, billing checkout, production analytics delivery, and deployment are intentionally outside this dry run because they require live external mutations and production credentials.

## Follow-up decisions

- Add public pricing or a clear “free to start” statement once the commercial policy is confirmed; the current repository does not provide a safe public claim to make.
- Add a verified book purchase link when the canonical retailer or publisher URL is confirmed.
- Consider a non-mutating production smoke test after deployment for signup email delivery and return-to behavior.
