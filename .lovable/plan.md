

# Plan: Remove Instagram Integration, Add Native Proof Entry

## Summary

Remove all frontend Instagram OAuth references. Replace the IG Proof feature with a lightweight native "Daily Proof" entry (text note or photo upload) on the daily check-in card. Rename IGProofHistory to ProofHistory with updated empty-state copy. Keep edge functions dormant.

## Changes

### 1. Remove Instagram from Integration Hub

**`src/hooks/useIntegrations.ts`** (lines 5, 50-55)
- Remove `"instagram"` from the `Provider` type union
- Remove the `instagram` entry from `PROVIDER_META`

**`src/pages/Integrations.tsx`** (line 16)
- Remove `"instagram"` from `ALL_PROVIDERS` array

### 2. Replace InstagramInputCard with native ProofEntryCard

**Create `src/components/dashboard/ProofEntryCard.tsx`**
- Lightweight expandable section labeled "Add proof (optional)"
- Two input modes: text note (1-3 sentences, placeholder "What did you do today?") or photo upload (`accept="image/*" capture="environment"`)
- On submit: uploads photo to `ig-proof-images` storage bucket (reuse existing), calls `ig-proof-analyze` edge function with the caption/description text for AI analysis, saves to `ig_proof_entries` table via existing `useIGProof.saveEntry`
- Props: `userId`, `onRingFilled?`, `onClose?`

### 3. Rename IGProofHistory → ProofHistory

**`src/components/dashboard/IGProofHistory.tsx`** → rename export to `ProofHistory`
- Update empty state text from "Use IG Proof to add your first" to "Add your first proof entry above"
- Keep all existing filter chips and entry rendering

### 4. Update useIGProof hook

**`src/hooks/useIGProof.ts`**
- Rename `sourceType` options from `"screenshot" | "caption"` to `"photo" | "text"` (or keep as-is since it's just a string stored in DB)
- Update toast messages: remove "Instagram" references, use "Proof saved" / "Ring filled from proof"
- Keep `analyzeCaption`, `analyzeScreenshot`, `saveEntry`, `loadEntries` — all still work for native proof

### 5. Delete useInstagramMedia hook

**Delete `src/hooks/useInstagramMedia.ts`** — no longer needed

### 6. Update consumers

**`src/pages/Growth.tsx`** (lines 29-30, 94, 200-240)
- Replace `InstagramInputCard` import with `ProofEntryCard`
- Replace `IGProofHistory` import with `ProofHistory`
- Rename button from "IG Proof" to "Add Proof"
- Update JSX references

**`src/components/dashboard/CommandModeView.tsx`** (lines 14-15, 61, 127-176)
- Same replacements as Growth.tsx

### 7. Add proof section to DailyCheckIn

**`src/components/DailyCheckIn.tsx`**
- After the checked-in state, add a collapsible "Add proof (optional)" section using `Collapsible` from radix
- Contains the same text + photo input from `ProofEntryCard` (or import it directly)
- Only visible when `isCheckedIn === true`

### 8. Update landing page copy

**`src/components/landing/FeatureGrid.tsx`** (line 32)
- Change "Connect Google Calendar, Gmail, and Instagram. Sync events, get inbox summaries, and use IG Proof." to remove Instagram mention

## Files

| Action | File |
|--------|------|
| Edit | `src/hooks/useIntegrations.ts` — remove instagram provider |
| Edit | `src/pages/Integrations.tsx` — remove instagram from providers list |
| Create | `src/components/dashboard/ProofEntryCard.tsx` — native text/photo proof entry |
| Edit | `src/components/dashboard/IGProofHistory.tsx` — rename to ProofHistory, update copy |
| Edit | `src/hooks/useIGProof.ts` — remove Instagram-specific language |
| Delete | `src/hooks/useInstagramMedia.ts` — no longer needed |
| Edit | `src/pages/Growth.tsx` — swap IG components for native proof |
| Edit | `src/components/dashboard/CommandModeView.tsx` — swap IG components for native proof |
| Edit | `src/components/DailyCheckIn.tsx` — add optional proof section after check-in |
| Edit | `src/components/landing/FeatureGrid.tsx` — remove Instagram mention |

