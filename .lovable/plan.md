

# IG Stories, Proof History Visibility, and UX Clarity

## Key Findings

1. **Stories**: The current `ig-stories-fetch` edge function only calls `GET /me/media` (posts). Instagram Stories require `GET /{ig-user-id}/stories` — a separate endpoint. However, stories are only available for 24 hours via the API, and the Instagram Basic Display API (which we're using) does **not** support stories. Stories access requires the **Instagram Graph API with Facebook Login** (business/creator accounts with `pages_read_engagement` + `instagram_basic` permissions). This is a different OAuth flow than what's currently implemented.

2. **"Fill Ring" vs "Save as Evidence"**: Both save to `ig_proof_entries` table. "Fill Ring" sets `attached_to_ring = true` and also calls `onRingFilled` to complete that daily ring. "Save as Evidence" sets `attached_to_ring = false` — it logs the proof but doesn't mark the ring as done. The difference is not explained to the user at all.

3. **Proof History**: `IGProofHistory` component exists but is **never rendered anywhere**. There's no page or section where users can see their saved entries.

## Plan

### 1. Add "My Stories" tab (with limitations handled gracefully)

Since the Basic Display API doesn't support stories, we have two options:

**Option A (recommended)**: Add a "My Stories" tab that uses the same `GET /me/media` endpoint but filters by `CAROUSEL_ALBUM` and recent posts (last 24h), and also add a note explaining stories aren't available via the API. Instead, encourage users to use the **Screenshot** tab to capture stories manually.

**Option B**: Keep only "My Posts" and rename/reframe the feature to be clear it's about posts, not stories.

### 2. Clarify Fill Ring vs Save as Evidence

Add brief inline helper text to the `RingSuggestionResult` buttons:
- **Fill Ring**: "Counts toward today's ring completion"
- **Save as Evidence**: "Logs proof without completing the ring"

### 3. Surface Proof History in the app

Add `IGProofHistory` below the `InstagramInputCard` when it's open, so users can see their past entries. Also add a "View Proof History" link that shows the history even without opening the IG input.

### Files to change

| File | Change |
|------|--------|
| `src/components/dashboard/RingSuggestionResult.tsx` | Add helper text under Fill Ring / Save as Evidence buttons |
| `src/components/dashboard/CommandModeView.tsx` | Render `IGProofHistory` below `InstagramInputCard` when IG Proof is open |
| `src/components/dashboard/InstagramInputCard.tsx` | Add "My Stories" tab or reframe messaging; add note about stories limitation |

### Question before proceeding

I need clarity on the stories approach since the current Instagram integration uses the Basic Display API which doesn't support stories.

