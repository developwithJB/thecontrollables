
# Fix Today's Actions Promise Review Bug

## Problem Summary

The user reported that after completing their Day 1 actions, a new "Review 1 promise" task appeared in Today's Actions. This is confusing because:

1. The task list shouldn't dynamically change during the day
2. A promise made TODAY should be reviewed TOMORROW, not immediately

## Root Cause Analysis

### Bug 1: Timezone Mismatch in Promise Filtering (Primary Bug)

The edge function `dashboard-summary` filters out "today's" promises incorrectly:

```javascript
// In supabase/functions/dashboard-summary/index.ts
const pendingPromises = integrityLogs.filter((log) => {
  if (log.kept !== null) return false;
  const promisedDate = log.promised_at.split('T')[0]; // UTC date!
  return promisedDate !== today; // today = client's LOCAL date
});
```

**The Problem:**
- `promised_at` is stored in UTC (e.g., `2026-01-29T03:35:51Z`)
- `today` is the client's local date (e.g., `2026-01-28` for Central Time)
- When user makes a promise at 9:35 PM Central on Jan 28, it's stored as Jan 29 UTC
- The comparison `"2026-01-29" !== "2026-01-28"` returns TRUE
- So the promise incorrectly appears as pending immediately

**Example:**
- User is in `America/Chicago` (UTC-6)
- User makes promise at 9:35 PM local = 3:35 AM UTC next day
- Promise is stored with `promised_at = "2026-01-29T03:35:51+00"`
- Client sends `localDate = "2026-01-28"` (their local date)
- Filter: `"2026-01-29" !== "2026-01-28"` = true → SHOWS as pending (wrong!)

### Bug 2: Flawed "Make your first promise" Completion Logic

In `TodayActions.tsx` line 335:
```typescript
const promiseCompleted = todayPromiseMade || pendingPromisesCount > 0;
```

This marks "Make your first promise" as complete if there are **any** pending promises from previous days, not just if the user made a promise **today**.

---

## Solution

### Fix 1: Convert UTC Promise Date to Client's Local Date

Update the edge function to convert the UTC timestamp to the client's timezone before comparing:

```typescript
// In supabase/functions/dashboard-summary/index.ts

// Filter pending promises: exclude promises made TODAY (in client's timezone)
const pendingPromises = integrityLogs.filter((log) => {
  if (log.kept !== null) return false;
  // Convert UTC timestamp to client's local date for accurate comparison
  // Since we only have the date string, we need to compare properly
  // If client says today is "2026-01-28" and promise is at "2026-01-29T03:35:51Z",
  // we should check if that UTC time falls within the client's "today"
  
  // Simple fix: Get the date portion of promised_at in a timezone-aware way
  // We'll use the client's date and check if the promise was made "recently enough"
  // to be considered "today" in their timezone
  
  const promisedAt = new Date(log.promised_at);
  const todayStart = new Date(today + "T00:00:00");
  const tomorrowStart = new Date(today + "T00:00:00");
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  
  // Check if promised_at falls within the client's "today" window
  // This is tricky without the client's timezone...
  
  // Better approach: Pass timezone from client, or use a different heuristic
  // Safest: Exclude promises made within the last 24 hours
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  
  return promisedAt < twentyFourHoursAgo;
});
```

**Better Solution**: Accept the client's timezone in the request and use it to properly convert:

```typescript
// Client sends: { localDate: "2026-01-28", timezone: "America/Chicago" }

const pendingPromises = integrityLogs.filter((log) => {
  if (log.kept !== null) return false;
  
  // Get the promise date in the client's timezone
  const promisedAt = new Date(log.promised_at);
  
  // Format the promised_at date in the client's timezone
  const promisedDateLocal = promisedAt.toLocaleDateString("sv-SE", { 
    timeZone: clientTimezone 
  }); // "2026-01-28"
  
  // Only show for review if it's NOT from today
  return promisedDateLocal !== today;
});
```

### Fix 2: Correct "Make Promise" Completion Logic

Update `TodayActions.tsx` to only use `todayPromiseMade`:

```typescript
// Line 335 - Day 1 promise task
const promiseCompleted = todayPromiseMade; // Remove pendingPromisesCount check

// Line 374 - Day 5 promise task  
const promiseCompleted = todayPromiseMade; // Remove pendingPromisesCount check
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/dashboard-summary/index.ts` | Accept client timezone; convert promise dates to local timezone before filtering |
| `src/hooks/useDashboardSummary.ts` | Pass user's timezone (from reset_session or browser) in request body |
| `src/components/dashboard/TodayActions.tsx` | Fix Day 1 and Day 5 promise completion logic to only use `todayPromiseMade` |

---

## Detailed Implementation

### 1. Update Edge Function to Accept Timezone

```typescript
// supabase/functions/dashboard-summary/index.ts

let clientDate: string | null = null;
let clientTimezone: string = "UTC"; // Default fallback

try {
  const body = await req.json();
  clientDate = body?.localDate || null;
  clientTimezone = body?.timezone || "UTC";
} catch {
  // No body or invalid JSON
}

// Later in the filtering:
const pendingPromises = integrityLogs.filter((log) => {
  if (log.kept !== null) return false;
  
  try {
    const promisedAt = new Date(log.promised_at);
    // Convert to client's local date string
    const promisedDateLocal = promisedAt.toLocaleDateString("sv-SE", { 
      timeZone: clientTimezone 
    });
    // Exclude promises made today (client's time)
    return promisedDateLocal !== today;
  } catch {
    // If timezone conversion fails, use simple UTC comparison
    const promisedDate = log.promised_at.split('T')[0];
    return promisedDate !== today;
  }
});
```

### 2. Update useDashboardSummary to Send Timezone

```typescript
// src/hooks/useDashboardSummary.ts

const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Get browser's timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

// In the query:
const response = await supabase.functions.invoke("dashboard-summary", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
  body: { 
    localDate: getLocalDateString(),
    timezone: getBrowserTimezone()  // NEW
  },
});
```

### 3. Fix TodayActions Promise Logic

```typescript
// src/components/dashboard/TodayActions.tsx

// Day 1: Line 333-345
if (currentDay === 1) {
  // Only mark complete if user actually made a promise TODAY
  actions.push({
    id: "make-promise",
    label: "Make your first promise",
    sublabel: todayPromiseMade ? "Completed" : "Build integrity through kept commitments",
    icon: <Scale className="w-4 h-4" />,
    completed: todayPromiseMade,  // Changed from: todayPromiseMade || pendingPromisesCount > 0
    timeEstimate: "1 min",
    action: onOpenPromises,
  });
}

// Day 5: Line 372-384  
} else {
  actions.push({
    id: "make-promise",
    label: "Make a promise to yourself",
    sublabel: todayPromiseMade ? "Completed" : "Build integrity through kept commitments",
    icon: <Scale className="w-4 h-4" />,
    completed: todayPromiseMade,  // Changed from: todayPromiseMade || pendingPromisesCount > 0
    timeEstimate: "1 min",
    action: onOpenPromises,
  });
}
```

---

## Testing Checklist

1. **Same-day promise (timezone edge case)**:
   - Set browser to `America/Chicago`
   - Make a promise at 10 PM local time (which is next day UTC)
   - Verify "Review promise" does NOT appear in Today's Actions
   - Verify it appears the next day (after local midnight)

2. **Day 1 task completion**:
   - New user on Day 1 with NO promises → "Make your first promise" shows as incomplete
   - Make a promise → task shows as "Completed"
   - Refresh page → still shows as "Completed"

3. **Yesterday's promise review**:
   - Make a promise on Day 1
   - Wait until Day 2 (or simulate)
   - Verify "Review 1 promise" appears in Today's Actions

4. **Today's Actions stability**:
   - Complete all tasks
   - Verify no new tasks appear after completing them
   - List should remain stable throughout the day

---

## Technical Notes

- `Intl.DateTimeFormat().resolvedOptions().timeZone` is well-supported in all modern browsers
- The Deno runtime supports timezone-aware date formatting via `toLocaleDateString` with `timeZone` option
- The reset_session already stores user's timezone in the `timezone` column - we could use that as a fallback
- This fix ensures promises made late in the evening (local time) don't incorrectly appear as "pending"
