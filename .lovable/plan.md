

# Admin Dashboard Update: Circles & Seasons Metrics

Add new feature metrics for Private Snapshot Circles and 4-Week Seasons to the admin analytics system.

## Changes

### 1. Edge Function: `admin-analytics/index.ts`
Add 3 new queries to the executive metrics Promise.all:
- `challenges` where `is_solo = false` → count active circles, total circles, total members
- `seasons` → count active seasons, completed seasons
- `push_subscriptions` → count push-enabled users

Compute and return new metrics:
- **Active Circles**: count of non-solo challenges with at least 1 participant (health thresholds: 3/1)
- **Circle Members**: total participants across active circles
- **Active Seasons**: seasons with status = 'active'
- **Completed Seasons**: seasons with status = 'completed'
- **Push Subscribers**: distinct users with push subscriptions

### 2. Types: `src/components/admin/types.ts`
Add new fields to `ExecutiveMetrics`:
- `activeCircles`, `circleMembers`, `activeSeasons`, `completedSeasons`, `pushSubscribers` (all `MetricCard`)

### 3. Executive Overview: `src/components/admin/ExecutiveOverview.tsx`
Add a 4th metric group **"Community"** with tiles for Active Circles, Circle Members, Active Seasons, Completed Seasons, and Push Subscribers.

## Implementation Order
1. Update edge function with new queries
2. Extend TypeScript types
3. Add Community group to ExecutiveOverview

