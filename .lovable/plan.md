
# Add Wellness Tooltip to Snapshot Detail View

## Overview
Add an informative tooltip to the "Avg Wellness" stat in the Snapshot detail view that explains what it measures and how to track it.

## Implementation Details

### File to Modify
`src/components/experience/SnapshotDetailView.tsx`

### Changes Required

1. **Add Tooltip Import**
   - Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`

2. **Wrap Wellness Card with Tooltip**
   - Wrap the third stat card (lines ~413-423) with tooltip components
   - The tooltip should explain what Avg Wellness measures

3. **Tooltip Content**
   The tooltip will display:
   - **When data exists**: "Average of Sleep, Movement & Nutrition ratings logged during this week (1-5 scale)"
   - **When no data**: "Log your Battery Check on Day 4 to track Sleep, Movement & Nutrition"

### Code Structure

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Card className="cursor-help">
        <CardContent className="py-3 text-center">
          <Heart className="w-4 h-4 mx-auto text-rose-500 mb-1" />
          <p className="text-lg font-bold text-foreground">
            {avgWellness ? avgWellness.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {avgWellness ? "Avg Wellness" : "Not tracked"}
          </p>
        </CardContent>
      </Card>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-[200px] text-center">
      {avgWellness ? (
        <p>Average of Sleep, Movement & Nutrition ratings (1-5 scale)</p>
      ) : (
        <p>Log your Battery Check on Day 4 to track Sleep, Movement & Nutrition</p>
      )}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Visual Indicator
- Add `cursor-help` class to the Card to indicate it's interactive
- Optionally add a small info icon (ℹ️) next to the label for discoverability

## Technical Notes

### Dependencies
- Uses existing `@/components/ui/tooltip` component (already in project)
- No new packages needed

### Accessibility
- Tooltip content provides context for screen readers
- Works with keyboard navigation (focus-triggered)

## Summary
This small addition helps users understand what the wellness metric measures without needing to navigate elsewhere, reinforcing the "Battery Check" mental model and encouraging future logging.
