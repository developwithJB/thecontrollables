
# Email Nudge System - Full Implementation Plan & Cost Breakdown

## Overview
Implement an opt-in daily email nudge system that sends gentle reminders to users at their preferred time (morning or evening), using Resend for transactional email delivery and Supabase pg_cron for scheduling.

---

## Cost Breakdown

### One-Time Setup Costs
| Item | Cost | Notes |
|------|------|-------|
| Development Time | ~2-3 hours | Edge function, DB migration, frontend UI |
| Resend Account Setup | Free | Just need to verify sending domain |
| Domain Verification | Free | DNS records for email authentication |

### Recurring Costs (Monthly)

#### Resend Email Provider
| Tier | Monthly Cost | Emails/Month | Per Email Cost |
|------|-------------|--------------|----------------|
| **Free** | $0 | 3,000 (100/day) | $0 |
| **Pro** | $20 | 50,000 | $0.0004 |
| **Business** | $100 | 500,000 | $0.0002 |

**Recommendation**: Start with Free tier. At 100 emails/day, you can support ~100 daily active users with nudges before needing to upgrade.

#### Supabase Edge Functions (pg_cron)
| Resource | Free Tier | Cost Beyond |
|----------|-----------|-------------|
| Function Invocations | 2M/month | $2/million |
| Compute Time | 500K GB-s | $0.08/GB-s |

**Cost Estimate**: Even with 10,000 users, daily cron jobs would cost <$1/month.

#### Total Monthly Cost Projection

| User Count (with nudges enabled) | Monthly Cost |
|----------------------------------|--------------|
| 0-100 users | **$0** |
| 100-500 users | **$20** (Resend Pro) |
| 500-5,000 users | **$20** |
| 5,000-10,000 users | **$100** (Resend Business) |

---

## Technical Implementation

### Phase 1: Database Schema

**Add columns to `profiles` table:**
```sql
ALTER TABLE profiles 
ADD COLUMN email_nudge_enabled BOOLEAN DEFAULT false,
ADD COLUMN email_nudge_time TEXT DEFAULT 'morning',
ADD COLUMN timezone TEXT;

-- Index for efficient cron queries
CREATE INDEX idx_profiles_nudge_enabled 
ON profiles(email_nudge_enabled) 
WHERE email_nudge_enabled = true;
```

**Add tracking table to prevent duplicate sends:**
```sql
CREATE TABLE email_nudge_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nudge_date DATE NOT NULL,
  status TEXT DEFAULT 'sent',
  UNIQUE(user_id, nudge_date)
);

-- RLS: Users can view their own nudge history
ALTER TABLE email_nudge_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own nudge logs" ON email_nudge_logs
  FOR SELECT USING (auth.uid() = user_id);
```

---

### Phase 2: Resend API Key Setup

**Requirement**: Add `RESEND_API_KEY` to Supabase secrets.

User will need to:
1. Create account at resend.com
2. Verify sending domain (e.g., `mail.thecontrollables.lovable.app`)
3. Generate API key
4. Add to project secrets

---

### Phase 3: Edge Function

**New file: `supabase/functions/send-daily-nudge/index.ts`**

Core logic:
```text
1. Query profiles WHERE email_nudge_enabled = true
2. For each user:
   - Calculate user's local time from timezone
   - Check if it's 7am (morning) or 7pm (evening)
   - Verify no nudge sent today (check email_nudge_logs)
   - Send minimal email via Resend
   - Log successful send
```

**Email Template (minimal):**
```text
Subject: "Your Snapshot is ready"
─────────────────────────
Just do today. That's it.

[Open Today's Actions →]
─────────────────────────
Turn off anytime in settings.
```

Alternate subjects (randomly selected):
- "5 minutes. That's it."
- "Just do today"
- "Ready when you are"

---

### Phase 4: Cron Job Scheduling

**Using Supabase pg_cron (requires pg_net extension):**

Two scheduled jobs - one for each hour to catch all timezones:
```sql
-- Run every hour to catch morning nudges across timezones
SELECT cron.schedule(
  'send-morning-nudges',
  '0 * * * *',  -- Every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/send-daily-nudge',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{"nudgeTime": "morning"}'::jsonb
  );
  $$
);

-- Run every hour to catch evening nudges across timezones
SELECT cron.schedule(
  'send-evening-nudges',
  '0 * * * *',  -- Every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://mttsfdplqmvraefbfqlq.supabase.co/functions/v1/send-daily-nudge',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{"nudgeTime": "evening"}'::jsonb
  );
  $$
);
```

---

### Phase 5: Frontend UI

**Update: `src/components/ProfileSettingsModal.tsx`**

Add new settings section between Theme and Timezone:

```text
┌─────────────────────────────────────────┐
│  Would you like a gentle daily nudge?   │
│  ───────────────────────────────────    │
│  [ ] Enable email nudges                │
│                                         │
│  When should we send it?                │
│  ○ Morning (7am local)                  │
│  ● Evening (7pm local)                  │
│                                         │
│  Timezone: [Pacific Time (PT) ▼]        │
│  Used for daily reset timing and nudges │
└─────────────────────────────────────────┘
```

**Key behaviors:**
- Toggle off by default (opt-in)
- Time preference only shown when enabled
- Timezone selector already exists, just update description
- Save nudge preferences to profiles table

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/send-daily-nudge/index.ts` | Edge function to send emails via Resend |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/ProfileSettingsModal.tsx` | Add nudge opt-in toggle and time preference |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

### Database Changes
| Change | Purpose |
|--------|---------|
| Add 3 columns to `profiles` | Store user preferences |
| Create `email_nudge_logs` table | Track sent emails, prevent duplicates |
| Create index on `email_nudge_enabled` | Fast queries for cron |
| Schedule 2 cron jobs | Hourly trigger for timezone coverage |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Duplicate emails | Unique constraint on `(user_id, nudge_date)` in logs table |
| Rate limits | Batch sends in groups of 50 with 100ms delays |
| Invalid emails | Resend handles bounces; no retry on hard bounce |
| User trust erosion | Minimal content, easy unsubscribe, no marketing |

---

## Success Metrics

After 30 days:
1. **Opt-in rate**: Expect 3-8% of users enable nudges
2. **Open rate**: Target 40%+ (transactional emails typically high)
3. **Return rate**: Users with nudges should have 20%+ higher daily return rate
4. **Unsubscribe rate**: If >15%, revisit copy/frequency

---

## Summary Cost

| Scenario | Monthly Cost |
|----------|--------------|
| Launch (0-100 nudge users) | **$0** |
| Growth (100-500 nudge users) | **$20** |
| Scale (5,000+ nudge users) | **$100** |

The feature is essentially **free to launch** and only costs when you have enough engaged users that the $20/month is easily justified.
