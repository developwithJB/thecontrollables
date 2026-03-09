

# Add Weekly/Biweekly Frequency to Recurring Bills

The `recurring_bills` table already has a `frequency` column (text, nullable) but the UI only supports monthly bills with a day-of-month `due_date`. This plan adds weekly and biweekly options so expenses like groceries spread naturally across the month.

## Problem

Currently `due_date` is an integer 1-31 (day of month). For weekly/biweekly bills, we need to know the day of week instead. The `frequency` column already exists but is unused in the UI.

## Changes

### 1. `src/components/money/BillsSubscriptions.tsx`

**Form updates:**
- Add a frequency selector: Weekly, Every 2 Weeks, Monthly (default)
- When frequency is "weekly" or "biweekly", change the due date input to a day-of-week picker (Mon–Sun) instead of a number 1-31
- Store day-of-week as 0-6 in `due_date` for weekly/biweekly, keep 1-31 for monthly

**Display updates:**
- Show frequency-aware labels: "Every Monday · $150" for weekly, "Due on the 15th · $200" for monthly
- Show monthly cost estimate for weekly bills: e.g. "$150/wk (~$650/mo)"
- Update the "paid this month" logic — for weekly bills, check if paid this week instead

**Add helper:**
- `getNextOccurrence(dueDate, frequency)` — returns next date for display
- For weekly: find next occurrence of that weekday
- For biweekly: find next occurrence (needs a reference start, can use created_at)

### 2. `src/components/money/MoneyOverview.tsx`

- Update the "bills due this week" calculation to include weekly bills whose day matches this week
- Update monthly total estimate to account for weekly (×4.33) and biweekly (×2.17) frequencies

### 3. `src/components/dashboard/MoneyCard.tsx`

- Same frequency-aware calculation for the dashboard card's "bills due this week" count

### 4. `src/hooks/useMoney.ts` — `onCreateBill` and `useMoneySummary`

- Pass `frequency` through in the create mutation (already supported, just not sent from UI)
- Update `useMoneySummary` to calculate weekly/biweekly bills into the due-this-week count

No database migration needed — `frequency` column already exists as nullable text.

## UI Flow

```
[Frequency: Weekly ▾]  [Day: Monday ▾]
[Amount: $150       ]
```

vs current monthly:

```
[Frequency: Monthly ▾]  [Due date: 15    ]
[Amount: $200         ]
```

