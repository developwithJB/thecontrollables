

# Enhanced Dashboard Experience: Dynamic Readings, Text Limits, Nudge Frequency & AI Insights

## Overview

This plan implements four key enhancements to improve user engagement and personalization:

1. **Dynamic Daily Readings** - Rotate content from The Controllables knowledge base so returning users don't see the same 7 prompts
2. **Longer Text Inputs** - Increase reflection fields for more meaningful journaling
3. **Daily vs Weekly Nudge Preference** - Give users control over notification frequency
4. **AI-Powered Personalized Insights** - Surface patterns and growth using existing data

---

## Part 1: Dynamic Daily Readings

### Current Problem
The `RESET_DAYS` array in `resetContent.ts` contains only 7 static readings. Users who return week after week see the same content, reducing engagement.

### Solution: Reading Rotation System

**Architecture:**
- Create a larger content library organized by Controllable (drawing from `controllables-knowledge.ts`)
- Add a rotation mechanism that selects different readings based on:
  - The Snapshot's focus Controllable
  - The user's "Snapshot count" (how many they've completed)
  - The current day number

**New Content Library Structure:**

The Controllables book has chapters and themes that can be organized into a rotation pool:

| Chapter | Controllable | Themes Available |
|---------|--------------|------------------|
| Chapter 1 | Awareness | The Dashboard, Observing Thoughts, The Gap |
| Chapter 2 | Perspective | Gratitude, Zoom Out, Reframe |
| Chapter 3 | Resilience | Setbacks as Feedback, Learning Mindset |
| Chapter 4 | Habit | Reps Over Motivation, Tiny Actions, Consistency |
| Chapter 5 | Response | The Pause, Stimulus-Response Gap |
| Chapter 6 | Integrity | Ego Recognition, Kept Promises |
| Chapter 7 | Wellness | Systems Check, Sleep/Water/Movement |
| Chapter 8 | Environment | Friction Audit, Default Design |
| Chapter 9 | Integration | Continuous Upgrade, Restart Protocol |

**Implementation Details:**

**New File: `src/lib/readingLibrary.ts`**
```text
Purpose: Store 50+ readings organized by Controllable and day pattern
Structure:
- Each Controllable has 7+ unique reading entries
- Readings include: source, chapter, text, framingLine, controlLine, surrenderLine
- Selection function uses: (controllable, dayNumber, rotationIndex) to pick unique content
```

**Modified: `src/lib/resetContent.ts`**
```text
Changes:
- Keep RESET_DAYS as fallback
- Add getRotatedDayContent(dayNumber, controllable, snapshotCount) function
- Rotation uses snapshotCount % (available readings per controllable) as offset
- Each reading is thematically appropriate for its day (e.g., Day 1 = grounding, Day 7 = integration)
```

**Modified: `src/components/ResetDay.tsx`**
```text
Changes:
- Accept snapshotCount prop (how many snapshots the user has completed)
- Use getRotatedDayContent() instead of static getDayContent()
- Reading will vary based on current Snapshot focus + rotation index
```

**Content Examples for Rotation:**

Day 1 - Grounding readings (rotated based on Controllable):
- Awareness: "You are not your thoughts. You are the one noticing them."
- Perspective: "Zoom out. How will this matter in a year?"
- Habit: "The smallest action beats the grandest intention."
- Wellness: "Before you diagnose yourself, check your sleep, water, and movement."
- Environment: "Environment beats willpower. Every time."

Day 7 - Integration readings (varied themes):
- "Starting over is not failure. It's a skill."
- "The record of effort matters more than the streak."
- "You don't need to be motivated. You need to be consistent."

---

## Part 2: Longer Text Inputs

### Changes

**File: `src/components/DailyCheckIn.tsx`**
- Add `maxLength={1000}` to the Textarea
- Add character counter display (e.g., "256/1000")

**File: `src/components/ResetDay.tsx`**
- Add `maxLength={1000}` to the reflection Textarea
- Add character counter display

**File: `src/components/dashboard/TimeCurrencyModule.tsx`**
- Verify existing 500-character limit on time reflection notes (already implemented)

---

## Part 3: Daily vs Weekly Nudge Preference

### Database Change

Add `nudge_frequency` column to `profiles` table:

```sql
ALTER TABLE profiles 
ADD COLUMN nudge_frequency TEXT DEFAULT 'daily' CHECK (nudge_frequency IN ('daily', 'weekly'));

COMMENT ON COLUMN profiles.nudge_frequency IS 'User preference for nudge emails: daily or weekly';
```

### UI Changes

**File: `src/components/ProfileSettingsModal.tsx`**

Update the "Gentle Daily Nudges" section:
- Rename label to "Gentle Nudges (Premium)"
- Add a segmented control below the enable toggle: "Daily" | "Weekly"
- Weekly option description: "One calm check-in per week, sent Monday morning"
- Only show frequency selector when nudges are enabled
- Add nudge_frequency to the profile query and save

### Edge Function Changes

**File: `supabase/functions/send-daily-nudge/index.ts`**

1. Update profile query to include `nudge_frequency`:
```typescript
.select("id, timezone, email_nudge_time, nudge_frequency")
```

2. Add weekly logic:
```typescript
function isMonday(timezone: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  return formatter.format(new Date()) === "Monday";
}
```

3. Filter users by frequency:
- If `nudge_frequency === 'weekly'`, only include if today is Monday in their timezone
- Weekly nudges are sent at morning time only (7am local)

4. Update email content for weekly nudges:
- Subject: "Your week ahead"
- Body: Week-focused grounding message instead of daily

---

## Part 4: AI-Powered Personalized Insights

### Architecture

Create a new edge function that generates insights from existing user data.

**New File: `supabase/functions/generate-insights/index.ts`**

This function will:
1. Fetch user's recent data (last 30 days):
   - Daily check-ins (consistency patterns)
   - Time logs (intentionality patterns)
   - Integrity logs (promise-keeping rate)
   - XP logs (activity trends)
   - Build scores (controllable strengths/weaknesses)
   
2. Analyze patterns:
   - Best check-in days (e.g., "You're most consistent on Tuesdays")
   - Time intentionality trends (improving/declining)
   - Promise-keeping rate changes
   - Most active periods

3. Use Lovable AI (google/gemini-3-flash-preview) to synthesize a 2-3 sentence personalized insight

### UI Integration

**File: `src/components/dashboard/GreetingBanner.tsx`**

Add a collapsible "Weekly Insight" section below the greeting:
- Only appears if insights are available
- Shows a single AI-generated insight (rotates weekly)
- Includes a subtle sparkle icon
- Cached for 24 hours to reduce API calls
- Only for Premium users

**New Hook: `src/hooks/useInsights.ts`**

- Fetches insights from the edge function
- Caches in React Query with 24-hour stale time
- Only fetches for paid users (Premium feature)

### Insight Examples

Based on analyzed data, the AI could surface:
- "You've checked in 5 days in a row. Thursday is usually your strongest day."
- "Your intentionality has improved by 15% this week compared to last."
- "You kept 8 of 10 promises last week - your best month yet."
- "Your Awareness score is your strongest Controllable. Consider a Clarity and Perspective Snapshot next."

---

## Technical Specifications

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/resetContent.ts` | Add reading rotation logic |
| `src/components/ResetDay.tsx` | Accept snapshotCount, use rotated readings, add 1000 char limit |
| `src/components/DailyCheckIn.tsx` | Add 1000 char limit + counter |
| `src/components/ProfileSettingsModal.tsx` | Add nudge frequency selector |
| `supabase/functions/send-daily-nudge/index.ts` | Add weekly frequency logic |
| `src/components/dashboard/GreetingBanner.tsx` | Add insights display section |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/readingLibrary.ts` | Extended library of 50+ readings by Controllable |
| `supabase/functions/generate-insights/index.ts` | AI-powered insights generator |
| `src/hooks/useInsights.ts` | Hook to fetch and cache insights |

### Database Migration

```sql
-- Add nudge frequency preference
ALTER TABLE profiles 
ADD COLUMN nudge_frequency TEXT DEFAULT 'daily' CHECK (nudge_frequency IN ('daily', 'weekly'));

COMMENT ON COLUMN profiles.nudge_frequency IS 'User preference for nudge emails: daily or weekly';
```

---

## Reading Library Content Strategy

The reading library will be organized by:

**1. Day Pattern (thematic appropriateness)**
- Days 1-2: Grounding, awareness, presence
- Days 3-4: Action, small reps, building
- Days 5-6: Perspective, resilience, integration
- Day 7: Reflection, restart, celebration

**2. Controllable Focus**
- Each reading is tagged with its primary Controllable
- When a user is on a Habit-focused Snapshot, Day 3 will pull from Habit-related content

**3. Rotation Index**
- snapshotCount % totalReadingsPerSlot determines which reading is shown
- With 5+ readings per slot, users won't see repeats for 5+ weeks

**Sample Reading Structure:**
```typescript
interface Reading {
  id: string;
  controllable: Controllable;
  dayPatterns: number[]; // Which days this reading is appropriate for
  source: string; // "The Controllables"
  chapter: string; // "Chapter 4 - The Symphony of Positive Choices"
  text: string; // The actual reading content
  framingLine: string;
  controlLine: string;
  surrenderLine: string;
}
```

---

## Outcome

After these changes:

1. **Dynamic Readings**: Users see fresh content every week, drawn from The Controllables philosophy. The 120+ quotes and frameworks in `controllables-knowledge.ts` provide a rich source.

2. **Longer Reflections**: Users can write up to 1000 characters in check-in reflections, enabling deeper journaling.

3. **Nudge Control**: Users choose between daily or weekly email nudges. Weekly nudges arrive Monday morning as a calm week-ahead reminder.

4. **Personalized Insights**: Premium users see AI-generated insights about their patterns (best days, consistency trends, promise-keeping).

