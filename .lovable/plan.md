
# Snapshot Review & Sharing - Production Ready Plan

## Problem Summary
The Snapshot detail view has several issues preventing it from being production-ready as a key sharing/growth feature:

1. **Avg Wellness blank**: Shows "—" because no wellness logs exist for the snapshot period (this is actually correct behavior - the data doesn't exist)
2. **Wrong hashtag**: Uses `#TheControllables` instead of `#TheDashboard`
3. **Missing app link**: Share text doesn't include the URL to encourage new signups
4. **Missing branding on export**: Downloaded image lacks the app domain footer

---

## Implementation Plan

### 1. Fix Share Text with Correct Hashtag and Link
**File:** `src/components/experience/SnapshotDetailView.tsx`

Update the `handleShare` function (lines 269-296) to:
- Change `#TheControllables #WeeklySnapshot` to `#TheDashboard`
- Add the production URL with a clear call-to-action
- Include wellness in the share summary when available

```text
Before:
📊 My Week: Restore Your Foundation
Jan 22 - 28, 2026

✅ 5/7 days completed
⚡ 980 XP earned
🛡️ 4/4 promises kept

#TheControllables #WeeklySnapshot
```

```text
After:
📊 My Week: Restore Your Foundation
Jan 22 - 28, 2026

✅ 5/7 days completed
⚡ 980 XP earned
🛡️ 4/4 promises kept
❤️ 3.8/5 avg wellness

A quiet place to restart → thedashboard.agbcoaching.com

#TheDashboard
```

---

### 2. Add Branding Footer to Exported Image
**File:** `src/components/experience/SnapshotDetailView.tsx`

Add a branded footer section inside the `contentRef` div that appears:
- At the bottom of the exported image
- Shows the domain: `thedashboard.agbcoaching.com`
- Has a subtle tagline: "A quiet place to restart"
- Matches the style used in QuestCard and Certificate

This footer should be styled to only be visible/prominent in exports (using a subtle divider style).

---

### 3. Improve Wellness Score Display and Calculation
**File:** `src/components/experience/SnapshotDetailView.tsx`

Current behavior: Shows "—" when no wellness logs exist (correct)

Improvements:
- Add a tooltip or note explaining what Avg Wellness measures (Sleep + Movement + Nutrition)
- When no data exists, show "Not tracked" instead of just "—" for clarity
- Only count ratings that actually exist (skip nulls entirely rather than treating as 0)

---

### 4. Enhance Share/Export Button UX
**File:** `src/components/experience/SnapshotDetailView.tsx`

- Add success toast after sharing with encouragement
- Add a brief loading state visual for export
- Consider adding a "Share your win!" prompt for completed snapshots

---

### 5. Add Export Branding Footer Component
Create a reusable footer that shows in exports:

```tsx
{/* Export Branding Footer - visible in exported image */}
<div className="pt-6 mt-6 border-t border-border/30 text-center">
  <p className="text-xs text-muted-foreground">
    A quiet place to restart
  </p>
  <p className="text-sm font-medium text-foreground mt-1">
    thedashboard.agbcoaching.com
  </p>
</div>
```

---

## Technical Details

### Files to Modify
1. `src/components/experience/SnapshotDetailView.tsx` - Main changes

### Share Text Template (Final)
```typescript
const shareText = 
  `📊 My Week: ${snapshot?.name || "Week Record"}\n` +
  `${dateRange}\n\n` +
  `✅ ${record.daysCompleted}/7 days completed\n` +
  `⚡ ${totalXP} XP earned\n` +
  `🛡️ ${promisesKept}/${promisesTotal} promises kept\n` +
  (avgWellness ? `❤️ ${avgWellness.toFixed(1)}/5 avg wellness\n` : "") +
  `\nA quiet place to restart → thedashboard.agbcoaching.com\n\n` +
  `#TheDashboard`;
```

### Navigator.share Call (Updated)
```typescript
await navigator.share({
  title: `My Snapshot: ${snapshot?.name || "Week Record"}`,
  text: shareText,
  url: "https://thedashboard.agbcoaching.com",
});
```

---

## Why This Matters (Product Perspective)

The Snapshot review is a **moment of reflection and potential pride**. When users complete a week (even partially), they have proof of their effort. Making this shareable:

1. **Creates social proof** - Others see real people using the app
2. **Drives organic signups** - Clear URL and invitation
3. **Reinforces the user's progress** - Exporting/sharing is a celebration
4. **Stays true to the philosophy** - "Unbiased record" language reminds users this is honest tracking, not gamification pressure

The `#TheDashboard` hashtag creates a discoverable stream of user stories.

---

## Expected Outcome
After implementation:
- Share text includes production URL and correct hashtag
- Exported images include branded footer for attribution
- Wellness shows "Not tracked" when empty (clearer than "—")
- Both share and export become tools for user pride AND organic growth
