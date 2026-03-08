

# Add AI Experience to Onboarding & First Build Assessment

## Current Flow
1. **Build Assessment** — 20 questions, no AI presence
2. **Archetype Result** — static scores + description
3. **Journey Selection** — pick a Snapshot
4. **Orientation** — static "here's how this works" screen
5. **Starting** — loading animation → complete

The 5 Controllables (Owl, Turtle, Shark, Satellite, Rocket) are completely absent from onboarding. Users don't encounter them until they're deep into the app.

## What Gets Built

### 1. AI Controllable Interjections During Assessment
As the user answers questions, the relevant Controllable reacts with a short one-liner between question transitions. No API call — pulled from `controllables-knowledge.ts` quotes.

- When the user answers a question, before advancing to the next, show a brief 1.5s Controllable reaction card based on the question's `controllable` field and the user's answer score
- Low scores (1-2): encouraging nudge ("That's what I'm here for.")
- High scores (3-4): affirmation ("You already have this instinct.")
- Appears as a small animated card with the Controllable emoji, fades out, then next question slides in
- Introduces users to the characters naturally during the assessment

### 2. AI-Powered Archetype Interpretation
Replace the static archetype description on `OnboardingArchetypeResult` with a short AI-generated personalized interpretation using the `ai-reflect` edge function.

- After build scores are computed, call `ai-reflect` with the archetype key + scores to generate a 2-3 sentence personalized reading
- The Controllable with the lowest score "speaks" the interpretation (e.g., if Habit is lowest, the Shark delivers it)
- Shows as a styled quote card: `🦈 "You've got the awareness — you see what's off. What's missing is the system. That's where I come in."`
- Falls back to static description if the AI call fails

### 3. "Meet Your Guides" Step After Archetype
Insert a new onboarding step between archetype result and journey selection that introduces the 5 Controllables as AI guides.

- New component `OnboardingMeetGuides.tsx`
- Shows the 5 Controllables in a stacked card layout with emoji, name, tagline, and a one-line description of what they help with
- Highlights the user's strongest and weakest Controllable based on build scores
- Copy: "These are The Controllables. They'll coach you through each day of your Snapshot."
- Single CTA: "Pick Your Snapshot →"
- Brief, not a blocker — one screen, no interaction required

### 4. AI Welcome Message on Orientation Screen
On the `OnboardingOrientation` screen (Day 0), add a personalized welcome message from the Controllable matching the selected Snapshot's focus area.

- Uses `ai-briefing` edge function with a special `onboarding` context flag to generate a 2-sentence welcome
- E.g., selecting a Habit-focused Snapshot → 🦈 "You picked the hard one. Good. I'll keep it simple — one rep at a time."
- Falls back to a static quote from `controllables-knowledge.ts` if the call fails
- Appears below the orientation items, above the "Start Day 1" button

## Implementation Order
1. Controllable interjection quotes map (static data in assessment component)
2. Assessment interjection UI in `OnboardingAssessment.tsx`
3. AI archetype interpretation call in `OnboardingArchetypeResult.tsx`
4. New `OnboardingMeetGuides.tsx` component
5. Update `OnboardingFlow.tsx` to include "meet_guides" step
6. AI welcome message on `OnboardingOrientation.tsx`

## File Changes
- **New**: `src/components/onboarding/OnboardingMeetGuides.tsx`
- **Edit**: `src/components/onboarding/OnboardingAssessment.tsx` (interjections between questions), `src/components/onboarding/OnboardingArchetypeResult.tsx` (AI interpretation), `src/components/onboarding/OnboardingOrientation.tsx` (AI welcome), `src/components/onboarding/OnboardingFlow.tsx` (new step + wiring)

## What Does NOT Change
- Assessment questions, scoring, and submission logic unchanged
- Edge functions `ai-reflect` and `ai-briefing` reused as-is (no new backend)
- Journey selection screen unchanged
- Skip flow unchanged

