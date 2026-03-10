

# Plan: Remove Import Health Data, Clean Up WHOOP References, Update Messaging

## Summary

Three workstreams: (1) remove the "Import Health Data" button/dialog from settings and BrainBodyTracker, (2) clean up remaining WHOOP-branded files and references, (3) update README, landing page, and feature grid to reflect the unified wearable layer and current tier structure.

## Changes

### 1. Remove "Import Health Data" from Settings and BrainBodyTracker

**`src/components/ProfileSettingsModal.tsx`**
- Remove the entire "Health Data Import" section (lines ~374-392) — the card with the Smartphone icon and "Import Health Data" button
- Remove the `HealthDataSync` dialog render at bottom (~line 482-486)
- Remove `healthSyncOpen` state and `HealthDataSync` import
- Keep the `Smartphone` icon import only if used elsewhere; remove if not

**`src/components/dashboard/BrainBodyTracker.tsx`**
- Remove the `onImportHealth` prop from the interface
- Remove the `onImport` prop from `QuickCheckIn`
- Remove the "Import Health Data" button from the secondary actions area (lines ~103-107)
- Remove `Upload` icon import

**`src/pages/Wellness.tsx`**
- Remove `onImportHealth={() => {}}` prop from `BrainBodyTracker`

**`src/components/dashboard/HealthDataSync.tsx`**
- Remove the Apple Health and Google Fit tabs (TabsContent for "apple" and "google") and the file upload logic
- Keep only the wearable integration tabs (WHOOP, Fitbit, Oura) — this dialog is still used on the Wellness page via `WearableSummaryCard`
- Actually, since this dialog is only used from ProfileSettingsModal (which we're removing it from), and the wearable connect flow is already in `WearableSummaryCard`, we can simplify: remove the Apple/Google tabs and the file upload section entirely. The dialog still serves as the "connect wearable" flow if referenced elsewhere, but since `WearableSummaryCard` handles connection directly, we may be able to deprecate this component. For safety, keep it but strip the import tabs.

### 2. Delete Old WHOOP-Branded Files

**Delete:**
- `src/components/wellness/WhoopSummaryCard.tsx` — replaced by `WearableSummaryCard.tsx`
- `src/components/wellness/WhoopTrendsCard.tsx` — replaced by `WearableTrendsCard.tsx`

These are no longer imported anywhere in pages (Wellness.tsx already uses the Wearable versions). The `useWhoopData.ts` deprecated wrapper can stay for now since it re-exports from `useHealthData`.

### 3. Update README

**`README.md`** — update to reflect:
- Brain & Body Tracker description: replace "Apple Health / Google Fit import" with "Connect WHOOP, Fitbit, or Oura to sync recovery, sleep, strain, and activity. Manual entry for sleep, movement, and nutrition."
- AI Guides section: update to "5 msgs/day during trial, 15 with Plus, 25 with Pro"
- Pricing table: split into Plus ($9.99/mo) and Pro ($79.99/yr) tiers
- Add wearable data to the feature/trial table with "7 days free, then paid"
- Add `health_sync_data` description: mention recovery_score, hrv_ms, strain_score columns
- Add `wearable-sync` to edge functions table
- Update `health_sync_data` table description: "Normalized wearable data (steps, sleep, recovery, HRV, strain)"

### 4. Update Landing Page Feature Grid

**`src/components/landing/FeatureGrid.tsx`**
- Brain & Body Tracker description: change from "Import from Apple Health or Google Fit" to "Connect your WHOOP, Fitbit, or Oura. Manual entry too."
- Add a new feature card for "Wearable Integration" or fold it into the existing Brain & Body card
- Update AI Guides description: mention Plus (15/day) and Pro (25/day) instead of just "25 with Premium"

### 5. Audit Admin Panel

The admin panel (`src/pages/Admin.tsx` and admin components) doesn't contain WHOOP-specific references in its tabs — it's analytics/user-focused. No changes needed there.

### 6. Audit Remaining Pages for Consistency

- **`src/pages/Integrations.tsx`** — check if it references WHOOP or old import flows
- **`src/components/dashboard/HealthDataSync.tsx`** — remove Apple/Google tabs, keep wearable tabs only. Rename dialog title from "Connect Health Data" to "Connect Wearable"

## Files Summary

| Action | File |
|--------|------|
| Edit | `src/components/ProfileSettingsModal.tsx` — remove Health Data Import section |
| Edit | `src/components/dashboard/BrainBodyTracker.tsx` — remove onImportHealth prop and Import button |
| Edit | `src/pages/Wellness.tsx` — remove onImportHealth prop |
| Edit | `src/components/dashboard/HealthDataSync.tsx` — remove Apple/Google import tabs |
| Edit | `src/components/landing/FeatureGrid.tsx` — update descriptions |
| Edit | `README.md` — update pricing, wearable, and AI tier info |
| Delete | `src/components/wellness/WhoopSummaryCard.tsx` |
| Delete | `src/components/wellness/WhoopTrendsCard.tsx` |

