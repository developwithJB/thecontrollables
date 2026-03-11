

# Fix: Wearable Empty State & Ring Label Contrast

## 1. Wearable Summary Card — Replace `--` with contextual empty state

**File:** `src/components/wellness/WearableSummaryCard.tsx`

- When `syncing` is true and a metric is `null`, show a skeleton pulse (matching project's `Skeleton` component style: `animate-pulse rounded-md bg-muted`)
- When not syncing and a metric is `null`, show `"Awaiting today's data"` in `text-[10px] text-muted-foreground` instead of `"--"`
- Also fix `formatMinutes` to return `null` instead of `"--"` so the caller controls rendering
- Applies to Recovery, Sleep, and Strain tiles equally — only null values get the treatment; existing numeric values render as before

**Changes:**
- Import `Skeleton` from `@/components/ui/skeleton`
- Replace the three metric `<p>` value lines with a helper that checks `syncing` → skeleton, `null` → "Awaiting data", else formatted value
- Remove raw `"--"` strings from `formatMinutes` and inline rendering

## 2. Ring Center Label — Dark pill background for contrast

**File:** `src/components/dashboard/SmartCenterState.tsx`

- In the fully-charged rotation view (lines 45-57), wrap the rotating `<motion.span>` for non-zero indices (the text labels like "High Stress, High Execution") in a dark semi-transparent pill
- Add `bg-black/45 rounded-lg px-3 py-1.5` to the label span when `currentIndex !== 0`
- Change text color from `text-accent/80` to `text-white` for those labels
- The first label (score like "5/5") keeps its current accent styling

**Changes at line 51-54:**
```
className={cn(
  "font-bold text-center leading-tight",
  currentIndex === 0
    ? "text-2xl text-accent"
    : "text-[11px] text-white bg-black/45 rounded-lg px-3 py-1.5 max-w-[120px]"
)}
```

## Files

| Action | File |
|--------|------|
| Edit | `src/components/wellness/WearableSummaryCard.tsx` — skeleton/awaiting states |
| Edit | `src/components/dashboard/SmartCenterState.tsx` — dark pill on ring labels |

