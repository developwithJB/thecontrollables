

# Instagram-to-Dashboard Feature Plan

## Overview
Build an "IG Proof" feature that lets users upload Instagram screenshots or paste captions, then uses AI to classify the content into one of the 5 daily rings (Notice, Choose, Prove, Charge, Align). Also build shareable ring-completion cards for posting back to Instagram Stories.

## Database Changes

**New table: `ig_proof_entries`**
- `id` uuid PK
- `user_id` uuid (NOT NULL)
- `ring_key` text (notice/choose/prove/charge/align)
- `source_type` text ('screenshot' | 'caption')
- `caption_text` text (nullable — pasted caption)
- `image_url` text (nullable — uploaded screenshot path in storage)
- `ai_interpretation` text (short AI reason)
- `tags` text[] (workout, meal, gratitude, etc.)
- `attached_to_ring` boolean default false (whether it filled the daily ring)
- `created_at` timestamptz default now()
- RLS: user can SELECT/INSERT/UPDATE/DELETE own rows

**Storage bucket: `ig-proof-images`** (public read for share cards)

## Edge Function

**`ig-proof-analyze`** — receives caption text and/or image, calls Lovable AI (gemini-2.5-flash) to return:
```json
{
  "primary_ring": "charge",
  "secondary_ring": "prove",
  "tags": ["workout", "discipline"],
  "interpretation": "This shows follow-through on a movement goal."
}
```

Uses a prompt that maps content to the 5 controllables with tag vocabulary.

## Frontend Components

### 1. `InstagramInputCard` (new)
- Two tabs: "Upload Screenshot" / "Paste Caption"
- Screenshot tab: file input accepting images, preview thumbnail
- Caption tab: textarea with placeholder
- Submit button triggers edge function
- Shows loading state while AI analyzes

### 2. `RingSuggestionResult` (new)
- Displays after AI response:
  - Primary ring with emoji + name + color border
  - Interpretation text
  - Tags as chips
  - Optional secondary ring suggestion
- Two action buttons:
  - "Fill Ring" — attaches to today's ring and completes it (if not already done)
  - "Save as Evidence" — saves entry without filling ring
- Ring dropdown to override AI suggestion

### 3. `IGProofHistory` (new)
- List of saved ig_proof_entries
- Filter by ring
- Each row shows: thumbnail/caption preview, ring badge, tags, date
- Accessible from Experience page or a new "Proof" tab

### 4. `RingShareCard` (new)
- Branded card (similar pattern to `ShareableStreakCard`) for each ring completion
- Five variants (Notice/Choose/Prove/Charge/Align) + "Fully Charged"
- Uses `html2canvas` for download/share (existing pattern from `MealShareCard`)
- Accessible after completing a ring or all 5

### 5. Entry Points
- **Command Mode**: Add "IG Proof" button in the quick-access row alongside Planner/Build
- **Ring Action Card**: Add small "Add from Instagram" link below each ring's action card
- **DailyRecapCard**: After completing rings, show "Share to Stories" button that opens share card

## Integration with Existing Ring System

- When user taps "Fill Ring", call `completeRing(key, interpretation)` from `useDailyRings`
- Save the `ig_proof_entries` row with `attached_to_ring: true`
- No duplication of ring completion logic — reuse existing `completeRing`

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/dashboard/InstagramInputCard.tsx` |
| Create | `src/components/dashboard/RingSuggestionResult.tsx` |
| Create | `src/components/dashboard/IGProofHistory.tsx` |
| Create | `src/components/dashboard/RingShareCard.tsx` |
| Create | `src/hooks/useIGProof.ts` |
| Create | `supabase/functions/ig-proof-analyze/index.ts` |
| Edit | `src/components/dashboard/CommandModeView.tsx` — add IG Proof button |
| Edit | `src/components/dashboard/DailyRings.tsx` — add share trigger after completion |
| Edit | `src/components/dashboard/RingActionCard.tsx` — add "Add from Instagram" link |
| Migration | Create `ig_proof_entries` table + RLS + storage bucket |

## Constraints
- No Instagram API — purely user-driven upload/paste
- AI analysis via Lovable AI (gemini-2.5-flash) — no API key needed
- Mobile-first layout, premium feel
- Privacy-friendly: user controls what gets submitted

