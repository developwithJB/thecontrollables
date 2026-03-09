
# Money Hub - Financial Life Management Module

## Technical Analysis

After exploring the codebase, I can see The Controllables follows these patterns:
- Dashboard cards use hooks like `useDashboardSummary` for data fetching
- Each major feature has its own page route (Dashboard, Planner, Reset, etc.)
- Database tables follow RLS patterns with user-scoped data
- Components are organized in feature folders under `src/components/`
- Hooks are centralized in `src/hooks/`

## Database Schema Design

**Core Tables:**
```sql
-- Account types: checking, savings, credit, cash, investment, manual
CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL, -- checking, savings, credit, cash, investment, manual
  account_name TEXT NOT NULL,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  bank_connection_id UUID, -- NULL for manual, future Plaid integration
  account_number_last4 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- All financial transactions (manual + future bank sync)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL, -- negative for expenses, positive for income
  description TEXT NOT NULL,
  category TEXT, -- groceries, rent, income, etc
  transaction_date DATE NOT NULL,
  is_pending BOOLEAN DEFAULT false,
  external_transaction_id TEXT, -- for bank sync later
  budget_bucket_id UUID, -- link to budget for categorization
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Budget categories with monthly targets
CREATE TABLE budget_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL, -- "Groceries", "Rent", "Entertainment"
  monthly_target DECIMAL(10,2) DEFAULT 0,
  bucket_type TEXT DEFAULT 'expense', -- expense, income, savings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fixed recurring expenses
CREATE TABLE recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_name TEXT NOT NULL, -- "Electric Bill", "Mortgage"
  amount DECIMAL(10,2) NOT NULL,
  due_date INTEGER NOT NULL, -- day of month (1-31)
  frequency TEXT DEFAULT 'monthly', -- monthly, quarterly, yearly
  category TEXT,
  account_id UUID REFERENCES financial_accounts(id),
  is_active BOOLEAN DEFAULT true,
  last_paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions (special case of recurring bills)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- "Netflix", "Spotify"
  amount DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
  next_billing_date DATE NOT NULL,
  account_id UUID REFERENCES financial_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Savings targets
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL, -- "Emergency Fund", "Vacation"
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_date DATE,
  monthly_contribution DECIMAL(10,2) DEFAULT 0,
  linked_account_id UUID REFERENCES financial_accounts(id),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Edge Function - CSV Import

**`money-csv-import`** - Processes bank CSV files:
- Detects common CSV formats (Bank of America, Chase, Wells Fargo, etc.)
- Maps columns to transaction fields
- Validates and imports transactions
- Returns success/error report with duplicate detection

## React Hooks Architecture

**`src/hooks/useMoney.ts`**
- `useFinancialAccounts()` - CRUD for accounts
- `useTransactions(accountId?, dateRange?)` - paginated transaction history
- `useBudgetBuckets()` - budget categories with spend tracking
- `useRecurringBills()` - bills due tracking
- `useSubscriptions()` - subscription management
- `useSavingsGoals()` - goals with progress calculation
- `useMoneySummary()` - dashboard card data aggregation
- `useCSVImport()` - file upload and processing

## Dashboard Integration

**`src/components/dashboard/MoneyCard.tsx`** - Compact financial summary:
- Bills due this week (count + total amount)
- Monthly budget status (% spent)
- Next subscription renewal
- Biggest savings goal progress
- Link to full Money Hub

Position after `PlannerCard` in `Dashboard.tsx`

## Money Hub Page Structure

**`src/pages/Money.tsx`** - Main financial dashboard with tabs:

1. **Overview Tab**
   - Net worth summary (assets - debts)
   - Cash flow calendar (next 30 days)
   - Quick actions (add transaction, pay bill, update budget)

2. **Budget Tab**
   - Monthly budget vs actual spending by category
   - Budget performance charts
   - Add/edit budget buckets

3. **Bills & Subscriptions Tab**
   - Upcoming bills calendar view
   - Subscription management (active/paused)
   - Bill payment tracking

4. **Goals Tab**
   - Savings goals with progress bars
   - Goal timeline and contribution tracking
   - Add new financial goals

5. **Transactions Tab**
   - Transaction history with filtering
   - CSV import interface
   - Manual transaction entry

## UI Components Structure

```
src/components/money/
├── MoneyOverview.tsx          // Net worth + cash flow calendar
├── BudgetManager.tsx          // Budget buckets and spending
├── BillsCalendar.tsx          // Recurring bills due dates
├── SubscriptionsList.tsx      // Active subscriptions management
├── SavingsGoals.tsx           // Goals with progress tracking
├── TransactionHistory.tsx     // Filterable transaction list
├── TransactionImporter.tsx    // CSV upload and processing
├── AccountManager.tsx         // Add/edit financial accounts
├── MoneyQuickActions.tsx      // Common actions (pay, transfer, etc)
└── FinancialControllables.tsx // AI-like insights without doom language
```

## Key Features Implementation

**CSV Import Logic:**
- Detect delimiter (comma, semicolon, tab)
- Map common column headers to transaction fields
- Handle various date formats
- Validate amounts and detect currency symbols
- Show preview before final import
- Track import sources to prevent duplicates

**Financial Controllables Summary:**
- "3 bills due this week" (actionable)
- "Grocery budget 80% used" (awareness)
- "Emergency fund 2 months away" (progress)
- No shame language - focus on next actions

**Cashflow Calendar:**
- Visual calendar showing money in/out by day
- Bills due dates with amounts
- Paycheck dates
- Subscription renewals

## Integration Points

**Planner Module Connection:**
- Link bill due dates to planner as reminders
- Connect savings contributions to planner goals
- Budget review as recurring planner task

**Dashboard Summary:**
- Total monthly subscriptions
- Bills due count (this week)
- Budget health (green/yellow/red status)
- Primary savings goal progress

**Version Management:**
- Update to v1.6.1 (Money Hub launch)
- Add to WhatsNew modal
- Update navigation to include Money link

## Files to Create/Modify

| Action | Path |
|--------|------|
| Migration | `supabase/migrations/..._money_hub_tables.sql` |
| Create | `supabase/functions/money-csv-import/index.ts` |
| Create | `src/hooks/useMoney.ts` |
| Create | `src/pages/Money.tsx` |
| Create | `src/components/money/` (9 component files) |
| Create | `src/components/dashboard/MoneyCard.tsx` |
| Edit | `src/App.tsx` - add `/money` route |
| Edit | `src/pages/Dashboard.tsx` - add MoneyCard |
| Edit | `src/components/WhatsNewModal.tsx` - add v1.6.1 |
| Edit | `src/lib/version.ts` - bump version |

## Design Philosophy

**Manual-First Approach:**
- All data entry starts manual
- Bank connection fields prepared but unused
- CSV import as primary bulk import method
- Future Plaid integration won't require schema changes

**Non-Shaming Language:**
- "Budget awareness" not "overspending"
- "Optimize" not "fix" 
- "Building toward" not "behind on"
- Focus on next action, not failure

**Controllables Integration:**
- Financial wellness as another controllable area
- Money decisions impact other life areas
- Track financial habits like other habits
- Connect to overall life balance

This creates a comprehensive financial management module that feels native to The Controllables while being ready for future banking integrations.
