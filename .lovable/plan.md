

# Screenshot Tab → Camera Roll Picker with Same Proof Flow

## What changes

The Screenshot tab currently shows a dashed upload area with "Tap to upload screenshot" and a description textarea. We'll transform it into a camera-roll-friendly experience:

1. **File input already accepts `image/*`** — on mobile this opens the camera roll picker. The core mechanic works. The UX just needs polish.

2. **Rename & reframe the tab**: Change "Screenshot" to "Photo" (with an `ImagePlus` icon). Update copy from "Tap to upload screenshot" to "Choose from camera roll" to make it obvious users can browse their photos.

3. **Multi-image gallery style**: After picking an image, instead of immediately analyzing, show it as a thumbnail the user can confirm or swap. This mirrors the IG Posts grid feel — tap to select, then analyze.

4. **Same proof pipeline**: The selected photo already goes through `analyzeScreenshot` → upload to `ig-proof-images` bucket → AI analysis → Fill Ring / Save as Evidence. No changes needed to the backend or proof storage logic.

5. **Remove the description textarea requirement for photos**: When a photo is selected, auto-analyze it (the `analyzeScreenshot` function already sends the image to the AI). The description field becomes optional context, not a gate to the "Analyze" button.

## Files to change

| File | Change |
|------|--------|
| `src/components/dashboard/InstagramInputCard.tsx` | Rename "Screenshot" tab to "Photo", update icon to `ImagePlus`, change upload prompt text to "Choose from camera roll", make description textarea optional (don't block analyze), auto-trigger analysis on image select (already happens in `handleFileChange`), remove the "Analyze Content" button requirement when an image is already selected and being analyzed |

## Implementation detail

- Tab label: `Screenshot` → `Photo`
- Tab icon: `Camera` → `ImagePlus`  
- Upload prompt: "Tap to upload screenshot" → "Choose from camera roll"
- The `handleFileChange` already calls `analyzeScreenshot(file)` which uploads and analyzes — so picking a photo already triggers the full flow. We just need to make the UX clearer.
- The `sourceType` in `saveEntry` will use `"screenshot"` (unchanged) so existing entries remain compatible.

