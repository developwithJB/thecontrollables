
# Fix Email Nudges Continuing After Snapshot End

## Problem Summary

1. **Emails continue after 7-day window ends** - The "Fuel the Body" snapshot (Jan 28) should have ended Feb 3, but emails continue because the session status is still "active" (user completed 6/7 days)
2. **Dates appear incorrect** - The displayed dates (Jan 22-28) are from the previous *completed* session, not the current expired one

## Root Cause

The email nudge function (`send-daily-nudge`) only queries for sessions with `status: "active"` but doesn't check if the 7-day window has elapsed. When a user doesn't complete all 7 days, the session stays "active" forever - continuing to trigger emails indefinitely.

## Technical Solution

### 1. Update `send-daily-nudge` Edge Function

Add a check to skip users whose snapshot window has expired:

```text
┌─────────────────────────────────────────────────┐
│ Current Flow:                                    │
│ 1. Query users with nudges enabled               │
│ 2. Find active session                           │
│ 3. Send email based on current_day               │
│                                                  │
│ Problem: No check for session expiry             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Fixed Flow:                                      │
│ 1. Query users with nudges enabled               │
│ 2. Find active session                           │
│ 3. ✅ Check if start_date + 7 days < today       │
│ 4. ✅ If expired: Mark session as 'expired', skip│
│ 5. Send email if within 7-day window             │
└─────────────────────────────────────────────────┘
```

**Changes to `getUserContext()` function:**
- Calculate `snapshotEndDate` = `start_date + 6 days`
- If `today > snapshotEndDate`, return a flag `isExpired: true`
- Main function skips sending nudge for expired sessions
- Optionally: Auto-update session status to "expired"

### 2. Add Session Expiry Check in Nudge Logic

In the main processing loop, before sending:

```typescript
// Calculate if session has expired (7-day window passed)
if (sessionResult.data) {
  const startDate = new Date(sessionResult.data.start_date + "T00:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  
  const today = new Date(localDate + "T00:00:00");
  
  if (today > endDate) {
    // Session has expired - update status and skip nudge
    await supabase
      .from("reset_sessions")
      .update({ status: "expired" })
      .eq("id", sessionResult.data.id);
    
    console.log(`[NUDGE] Session ${sessionResult.data.id} expired, skipping`);
    context.sessionId = null; // Clear so no daily nudge is sent
  }
}
```

### 3. Fix JB's Current Data

Update the stuck session to "expired" status:

```sql
UPDATE reset_sessions 
SET status = 'expired' 
WHERE id = '33f5b12b-30a5-4ea7-8e72-50ddec3e26ce';
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-daily-nudge/index.ts` | Add session expiry detection and auto-update logic |

---

## Implementation Details

### Modified `getUserContext()` Function

```typescript
async function getUserContext(
  supabase: SupabaseClient,
  userId: string,
  localDate: string
): Promise<UserContext> {
  // ... existing setup ...

  try {
    // ... existing parallel queries ...

    if (sessionResult.data) {
      // NEW: Check if session has expired
      const startDate = new Date(sessionResult.data.start_date + "T00:00:00");
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      const today = new Date(localDate + "T00:00:00");
      
      if (today > endDate) {
        // Auto-expire the session
        await supabase
          .from("reset_sessions")
          .update({ status: "expired" })
          .eq("id", sessionResult.data.id)
          .eq("status", "active"); // Only if still active
          
        console.log(`[NUDGE] Auto-expired session ${sessionResult.data.id}`);
        // Return context without session info - will skip daily nudge
        return context;
      }
      
      // ... rest of existing session processing ...
    }
  }
}
```

### Suppression Logic in Main Processing

When `context.sessionId` is null (no active non-expired session), the nudge function should:
- For **daily frequency**: Skip entirely (no session to report on)
- For **weekly frequency**: Still send a summary/reflection prompt

---

## Testing Checklist

After implementation:

1. **Verify JB's fix**
   - Run the nudge function manually to confirm no email is sent
   - Check database shows session status = "expired"

2. **Test edge cases**
   - User on Day 7 with session ending today → Should receive Day 7 email
   - User with session ended yesterday → Should NOT receive email
   - User who completed all 7 days → Session already "completed", no issue

3. **Monitor in Admin**
   - Check nudge logs for any anomalies
   - Verify coverage rate calculation still accurate

---

## Expected Outcome

1. **No more emails after snapshot window ends** - The 7-day boundary is enforced
2. **Sessions auto-expire** - Users who don't complete all 7 days get their session marked as "expired" automatically
3. **Clean historical data** - JB's stuck session is fixed immediately
