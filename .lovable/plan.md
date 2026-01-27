
# Fix the "Moving Goalpost" Problem in Today's Actions

## Problem Summary
When a user completes the primary action (e.g., "Day 6: Integrity"), another task immediately gets promoted to the "If you do one thing today, do this." position. This contradicts the promise of "one thing" and makes users feel tricked—they thought they were done, but a new "one thing" appeared.

---

## Solution: Lock the Primary Action to the Daily Check-In Only

### Philosophy
The "If you do one thing today, do this." anchor should **only ever refer to the Daily Check-In**. Once that's complete, the special framing disappears entirely. Other tasks remain visible as optional—never promoted to "the one thing."

This aligns with the app's philosophy:
- "This is about today only. One honest check-in. Then you're done."
- The check-in IS the ritual. Everything else is genuinely optional.

---

## Implementation

### 1. Change Primary Action Logic

**Current behavior** (lines 389-397):
```typescript
const getPrimaryAction = (): ActionItem | null => {
  const priorityOrder = ["checkin", "journey-action", "time", ...];
  for (const id of priorityOrder) {
    const action = actions.find((a) => a.id === id && !a.completed);
    if (action) return action;
  }
  return null;
};
```

**New behavior**:
- The primary action is **only** the daily check-in (`checkin`)
- If the check-in is complete (or doesn't exist), `primaryAction` becomes `null`
- No other task gets promoted to the "one thing" position

```typescript
const getPrimaryAction = (): ActionItem | null => {
  // The "one thing" is ONLY the daily check-in
  // Once complete, nothing else gets promoted
  const checkin = actions.find((a) => a.id === "checkin");
  if (checkin && !checkin.completed) {
    return checkin;
  }
  return null;
};
```

### 2. Update UI for Post-Completion State

**When check-in is complete**, the "One Thing" anchor section should **not render at all**. The remaining tasks appear as a flat list under a neutral header.

**Current** (line 683):
```tsx
{!isListCollapsed && primaryAction && !primaryAction.completed && (
  <div className="...">
    If you do one thing today, do this.
  </div>
)}
```

This already works correctly—if `primaryAction` is `null`, the section won't render.

### 3. Adjust Secondary Actions Display

After the check-in is complete:
- Show all remaining tasks as a simple list
- No "Everything else is optional" label needed (since there's no primary action to contrast with)
- Keep the completion states visible (checkmarks for done items)

**Update the separator logic** (lines 728-735):
```tsx
{/* Only show separator and "optional" label when check-in is still pending */}
{secondaryActions.length > 0 && primaryAction && !primaryAction.completed && (
  <>
    <div className="mx-4 border-t border-border/50" />
    <div className="px-4 pt-3 pb-1">
      <p className="text-xs text-muted-foreground">Everything else is optional.</p>
    </div>
  </>
)}
```

This already works correctly since `primaryAction` will be `null` after check-in.

### 4. Update Helper Copy for Accuracy

The current helper text says:
> "This is about today only. One honest check-in. Then you're done."

This is now accurate because:
- The "one thing" IS the check-in
- Once complete, the special framing disappears
- Remaining tasks are just a list, not a new "one thing"

---

## File Changes

| File | Change |
|------|--------|
| `src/components/dashboard/TodayActions.tsx` | Simplify `getPrimaryAction()` to only return the `checkin` action |

---

## Validation

After this change:
1. User sees "If you do one thing today, do this." with the daily check-in
2. User completes the check-in
3. The "One Thing" anchor **disappears entirely**
4. Remaining tasks (journey action, time reflection) appear as a simple list
5. User feels "done" with the core ritual—other tasks are clearly supplementary

---

## Edge Cases

**No active check-in**: If there's no Snapshot session, `primaryAction` is `null`, and the "One Thing" section doesn't render. Users see only the supplementary actions (time reflection, promises).

**All actions complete**: The "All done!" celebration state already handles this correctly (lines 654-662).

---

## Why This Fixes the "Tricked" Feeling

Before:
> "Day 6 reading is the one thing → Done! → Wait, now 'Stretch for 5 minutes' is the one thing??"

After:
> "Day 6 reading is the one thing → Done! → (anchor disappears) → Here's what else you can do if you want."

The key insight: **"The one thing" should mean THE one thing, not "the next thing in a queue."**
