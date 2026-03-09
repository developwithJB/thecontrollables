

# Add DELETE RLS Policy + updated_at Trigger for daily_rings

Two small database additions:

1. **DELETE RLS policy** — allow authenticated users to delete their own `daily_rings` rows (matches the existing SELECT/INSERT/UPDATE pattern)
2. **updated_at trigger** — reuse the existing `update_updated_at_column()` function to auto-set `updated_at` on row updates

Single migration with both changes.

