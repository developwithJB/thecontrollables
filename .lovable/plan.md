

# Clear Email Nudge Log for Fresh Test

## Overview
Delete today's email nudge log entry so you can trigger a fresh personalized email test.

## What Will Happen

1. **Delete the existing log entry** from `email_nudge_logs` table for your user ID and today's date (2026-01-27)

2. **Trigger the nudge** with `testMode: true` to send a fresh personalized email

3. **Verify the email content** matches your current context:
   - Day 6 of 7 on your Wellness snapshot
   - Environment as your lowest build score (1.50)
   - 5,745 total XP
   - Personalized greeting for "JB"

## Technical Details

**SQL to execute:**
```sql
DELETE FROM email_nudge_logs 
WHERE user_id = '66d5ff06-8791-41a1-84a2-1ab4a3f61db0' 
AND nudge_date = '2026-01-27';
```

**Then call edge function:**
```json
POST /send-daily-nudge
{ "testMode": true, "nudgeTime": "morning" }
```

## Expected Result
You'll receive a fresh personalized email at your registered email address with content based on your current app data.

