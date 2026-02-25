

# Admin Dashboard Redesign: Data Command Center

## Overview

Transform the current 9-tab admin panel (1,900 lines in a single file) into a modular, multi-component intelligence system organized around 6 strategic sections. This is a phased build -- each phase delivers standalone value.

**Immediate fix**: The build error (`isTrialing` prop missing from `LazyAIGuidePanelWrapper`) will be fixed first.

---

## Architecture Decisions

The current admin is a single 1,900-line file with all UI inline. The redesign will:

1. **Extract each section into its own component** under `src/components/admin/`
2. **Create a new backend endpoint** (`admin-analytics`) dedicated to heavy analytical queries, keeping `admin-users` for user management
3. **Use Recharts** (already installed) for sparklines and charts
4. **Leverage existing data tables** -- no new tables needed for Phase 1-2. Phase 3+ may need `admin_experiments` and `user_risk_scores` tables.

---

## Phase 1: Fix Build Error + Restructure Admin Shell

### Fix: LazyAIGuidePanelWrapper
Add `isTrialing?: boolean` to `LazyAIGuidePanelWrapperProps` in `src/components/dashboard/LazyAIGuidePanel.tsx` and pass it through.

### Restructure Admin.tsx
Replace the monolithic file with a clean shell:
- Keep auth check, header, and tab navigation in `Admin.tsx`
- Extract each tab into its own component file

**New component files:**
- `src/components/admin/ExecutiveOverview.tsx` -- Section 1
- `src/components/admin/ActivationFunnel.tsx` -- Section 2
- `src/components/admin/BehavioralIntelligence.tsx` -- Section 3
- `src/components/admin/RetentionRadar.tsx` -- Section 4
- `src/components/admin/RevenueIntelligence.tsx` -- Section 5
- `src/components/admin/ProductHealth.tsx` -- Section 6
- `src/components/admin/UserManagement.tsx` -- Existing users tab
- `src/components/admin/ActionCenter.tsx` -- Admin actions hub

**Tab restructure** (6 primary + 3 utility):
```text
[Overview] [Funnel] [Behavior] [Retention] [Revenue] [Health] | [Users] [Actions] [Claw]
```

---

## Phase 2: Executive Overview (Section 1)

### New backend endpoint: `admin-analytics`
A dedicated edge function optimized for analytical queries with time-range parameters.

**Metrics computed server-side:**

| Metric | Source Tables | Computation |
|--------|-------------|-------------|
| Total Users | `auth.users` | Count all |
| New Users (7d/30d) | `auth.users` | Filter by `created_at` |
| DAU/WAU/MAU | `app_events` | Distinct `user_id` by period |
| Activation Rate | `user_onboarding` + `auth.users` | `onboarding_step = 'complete'` / total |
| Snapshot Completion Rate | `reset_sessions` | `status = 'completed'` / total |
| Avg Weekly Log Entries | `daily_resets` + `time_logs` + `wellness_logs` | Sum per user per week |
| Paid Conversion Rate | `user_entitlements` / `auth.users` | Entitled / total |
| Churn Rate | `user_entitlements` | Expired and not renewed in 30d |
| Revenue MRR | `user_entitlements` | Active paid * price tier |
| ARPU | MRR / active users | Derived |

**UI for each metric card:**
- Current value (large number)
- % change vs previous period (color-coded badge: green up, red down)
- Health indicator dot (green/yellow/red based on thresholds)
- Mini sparkline (7 data points using Recharts `<Sparkline>`)

**Time range selector**: 7d / 30d / 90d (default 30d)

---

## Phase 3: Activation Funnel (Section 2)

### Funnel stages (computed from existing data):

```text
Landing --> Account Created --> Onboarding Completed --> First Log Entry --> 3+ Logs --> Snapshot Completed --> Subscription Purchased
```

| Stage | Data Source |
|-------|-----------|
| Landing | `page_views` where `page_path = '/'` (unique sessions) |
| Account Created | `auth.users` created in period |
| Onboarding Completed | `user_onboarding` where `simplified_mode_completed = true` |
| First Log Entry | `daily_resets` or `completed_actions` (first per user) |
| 3+ Logs | Users with 3+ `daily_resets` rows |
| Snapshot Completed | `reset_sessions` where `status = 'completed'` |
| Subscription | `user_entitlements` created in period |

**Per-stage display:**
- User count
- Drop-off % from previous stage
- Average time between stages (computed from timestamps)
- Visual funnel bar chart (Recharts horizontal bar)

**Auto-suggestions** (rule-based, not AI):
- If drop-off > 50% between stages: surface a recommendation card
- Example rules: "60% drop between Onboarding and First Log -- consider adding a guided first-log experience"
- Stored as static rule definitions in the component

---

## Phase 4: Behavioral Intelligence (Section 3)

### Controllable Usage Panel
Query `completed_actions` grouped by `controllable` column:
- Frequency per controllable (Awareness, Perspective, Habit, Wellness, Environment)
- Trend over last 4 weeks (line chart)
- Most/least used controllable

### Power User Detection
Define power user criteria from existing data:
- 4+ `daily_resets` per week
- 2+ `reset_sessions` (snapshots)
- Has `build_scores` record

Query: Join `daily_resets`, `reset_sessions`, `build_scores` grouped by `user_id`

**Display:**
- Power user count and % of total
- List with anonymized IDs and behavior summary
- Pattern insights (e.g., "Power users average 5.2 logs/week and use AI Chat 3x more")

---

## Phase 5: Retention Radar (Section 4)

### User Risk Scoring (computed at query time, no new table needed)

**Risk tiers based on existing data:**

| Tier | Criteria |
|------|----------|
| Healthy | Activity within last 3 days |
| Slipping | Last activity 4-7 days ago |
| At Risk | Last activity 8-14 days ago |
| Dormant | Last activity 15+ days ago |

**Data source**: Last `app_events.created_at` per `user_id`, cross-referenced with `reset_sessions.status` and `email_nudge_logs.status`

**Display:**
- Risk distribution donut chart
- Sortable table of at-risk and dormant users
- Per-user: email, days since last activity, last action type, suggested intervention
- Action buttons: "Send Nudge", "Offer Trial Extension", "Grant Discount"
- These actions invoke the existing `admin-users` grant/nudge endpoints

---

## Phase 6: Revenue Intelligence (Section 5)

### Metrics from existing data:

| Metric | Source |
|--------|--------|
| Free to Paid conversion rate | `user_entitlements` / `auth.users` |
| Time to conversion | `auth.users.created_at` vs `user_entitlements.granted_at` |
| Feature usage before conversion | `app_events` for users who later got entitlements |
| Revenue by cohort | `user_entitlements` grouped by signup month |
| Churn rate | Expired `user_entitlements` not renewed |

**Display:**
- Conversion timeline chart
- Cohort retention grid (signup month vs months retained)
- Feature correlation table: "Users who used [feature] before converting"
- Insight cards (rule-based): "Users who complete 1 Snapshot convert X% more"

---

## Phase 7: Product Health (Section 6)

### Consolidate existing error/pageview tabs into a health dashboard:

- Error rate trend (sparkline from `app_errors` grouped by day)
- Failed submissions count
- Device breakdown (from `page_views.user_agent`)
- Average load time (from `page_views.load_time_ms`)
- Session duration (from `app_events` timestamps per session)
- Anomaly flags: auto-detect spikes (> 2x standard deviation from 7-day average)

---

## Phase 8: AI Insight Engine

### Weekly auto-generated insights using Lovable AI

Create a new edge function `admin-insights` that:
1. Queries aggregated metrics from the last 7 days
2. Sends a structured prompt to Lovable AI (gemini-2.5-flash) with the data
3. Returns 3 behavioral insights, 2 retention risks, 2 growth opportunities, 1 experiment recommendation
4. Results cached in a new `admin_insights` table (requires migration)

**Database migration:**
```sql
CREATE TABLE public.admin_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  insights jsonb NOT NULL DEFAULT '[]',
  data_snapshot jsonb NOT NULL DEFAULT '{}',
  generated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.admin_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON public.admin_insights FOR ALL USING (public.is_admin());
```

**UI:** A "Weekly Intelligence" card with refresh button and formatted insight list.

---

## Phase 9: Action Center + Role-Based Access

### Action Center tab
Consolidate all admin actions:
- Send segmented email (via existing nudge system)
- Export user cohort (CSV download)
- Grant/revoke access (existing)
- Tag user segments (requires new `user_tags` table)
- Launch experiment flag (leverage existing `featureFlags` system)

### Role-Based Admin Levels
The `user_roles` table already supports roles via the `app_role` enum. Extend it:

```sql
ALTER TYPE public.app_role ADD VALUE 'product_admin';
ALTER TYPE public.app_role ADD VALUE 'marketing_admin';
ALTER TYPE public.app_role ADD VALUE 'support_admin';
```

Each admin component checks the user's role and conditionally renders sections:
- **Super Admin**: All sections
- **Product Admin**: Overview, Funnel, Behavior, Health
- **Marketing Admin**: Overview, Funnel, Revenue, Claw
- **Support Admin**: Users, Retention Radar, Action Center

---

## Implementation Priority

| Priority | Phase | Deliverable | Effort |
|----------|-------|------------|--------|
| 1 | Phase 1 | Fix build error + restructure shell | Small |
| 2 | Phase 2 | Executive Overview with sparklines | Medium |
| 3 | Phase 3 | Activation Funnel with auto-suggestions | Medium |
| 4 | Phase 5 | Retention Radar (highest decision-driving value) | Medium |
| 5 | Phase 4 | Behavioral Intelligence | Medium |
| 6 | Phase 6 | Revenue Intelligence | Medium |
| 7 | Phase 7 | Product Health consolidation | Small |
| 8 | Phase 8 | AI Insight Engine | Large |
| 9 | Phase 9 | Action Center + RBAC | Large |

---

## Technical Notes

- **No PII exposure**: All user-facing admin displays use email (already exposed) or anonymized IDs
- **Query performance**: The new `admin-analytics` edge function will batch queries with `Promise.all` and use date-bounded queries with indexes on `created_at`
- **Recharts**: Already installed -- will use `AreaChart`, `BarChart`, `PieChart`, `ResponsiveContainer` for all visualizations
- **CSV export**: Client-side generation from loaded data arrays
- **Dark theme**: Already supported via the app's existing theme system

