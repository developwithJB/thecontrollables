

# Fix Subscription Date + Simplify Money Hub

## Problem

1. **Date field is confusing**: The form asks for a date but labels it ambiguously. User entered the start date, but the field is `next_billing_date` — so it displays "Next: 12/31/2024" (a past date). The form should ask "When did this start?" and auto-compute the next billing date based on the billing cycle.

2. **Date parsing bug**: `new Date(sub.next_billing_date)` can shift dates due to UTC interpretation (the stack overflow hint). Need to use local date parsing.

3. **Money Hub is complex** — 5 tabs, account manager, CSV importer. Needs simplification to surface meaningful insights up front.

## Changes

### 1. `src/components/money/BillsSubscriptions.tsx` — Fix subscription form + auto-compute next date

- Replace the bare `<Input type="date">` with a labeled "Start date" field
- On save, auto-compute `next_billing_date` from the start date + billing cycle:
  - Find the next occurrence that's in the future (loop-advance by month/year from start date until > today)
- Display subscriptions as `$30/mo · Renews Mar 15` instead of `Next: 12/31/2024`
- Use local date formatting (`parseDateString` pattern) to avoid UTC shift

### 2. `src/components/money/MoneyOverview.tsx` — Fix UTC date parsing

- Replace `new Date(sub.next_billing_date)` with local date parsing to avoid timezone shifts
- Same for display: use `parseDateString` approach

### 3. `src/components/money/FinancialControllables.tsx` — Already good, no changes needed

### 4. `src/pages/Money.tsx` — Simplify layout

- Reduce from 5 tabs to 3: **Overview** (merge accounts into it), **Bills & Subs**, **Goals**
- Move transaction history into Overview as a collapsible "Recent" section or remove the dedicated tab
- Remove the standalone AccountManager tab — fold account creation into Overview
- Remove CSV importer button from top-level (keep it accessible but not prominent)

### 5. Helper utility — Add date helpers

Add a small helper in `BillsSubscriptions.tsx` (or inline):
```typescript
function computeNextBillingDate(startDate: string, cycle: string): string {
  const [y, m, d] = startDate.split("-").map(Number);
  let next = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (next <= today) {
    if (cycle === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
  }
  return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
}
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/money/BillsSubscriptions.tsx` | Add "Start date" label, compute next billing date, fix date display |
| `src/components/money/MoneyOverview.tsx` | Fix UTC date parsing |
| `src/pages/Money.tsx` | Simplify to 3 tabs, fold accounts into overview |

