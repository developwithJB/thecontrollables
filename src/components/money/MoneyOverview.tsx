import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { FinancialAccount, RecurringBill, Subscription, SavingsGoal } from "@/hooks/useMoney";

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function computeNextBillingDate(startDate: string, cycle: string): Date {
  const [y, m, d] = startDate.split("-").map(Number);
  let next = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (next <= today) {
    if (cycle === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
  }
  return next;
}

interface MoneyOverviewProps {
  accounts: FinancialAccount[];
  bills: RecurringBill[];
  subscriptions: Subscription[];
  goals: SavingsGoal[];
}

export function MoneyOverview({ accounts, bills, subscriptions, goals }: MoneyOverviewProps) {
  const totalAssets = accounts
    .filter((a) => ["checking", "savings", "cash", "investment"].includes(a.account_type))
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const totalDebt = accounts
    .filter((a) => a.account_type === "credit")
    .reduce((sum, a) => sum + Math.abs(Number(a.current_balance)), 0);

  const netWorth = totalAssets - totalDebt;

  const monthlyBills = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const monthlySubs = subscriptions.reduce((sum, s) => {
    if (s.billing_cycle === "yearly") return sum + Number(s.amount) / 12;
    return sum + Number(s.amount);
  }, 0);
  const monthlyFixed = monthlyBills + monthlySubs;

  const totalSavedTowardGoals = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);

  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const upcomingBills = bills
    .filter((b) => {
      const diff = b.due_date >= currentDay ? b.due_date - currentDay : daysInMonth - currentDay + b.due_date;
      return diff <= 7;
    })
    .sort((a, b) => a.due_date - b.due_date);

  const upcomingSubs = subscriptions
    .filter((s) => {
      const nextDate = computeNextBillingDate(s.next_billing_date, s.billing_cycle || "monthly");
      const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    })
    .sort((a, b) => {
      const aNext = computeNextBillingDate(a.next_billing_date, a.billing_cycle || "monthly");
      const bNext = computeNextBillingDate(b.next_billing_date, b.billing_cycle || "monthly");
      return aNext.getTime() - bNext.getTime();
    });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Net Position</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              ${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Monthly Fixed</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              ${monthlyFixed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Saved Toward Goals</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              ${totalSavedTowardGoals.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Accounts</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{accounts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow calendar - upcoming */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Coming Up</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBills.length === 0 && upcomingSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nothing due soon — you're ahead of it.</p>
          ) : (
            <div className="space-y-2">
              {upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{bill.bill_name}</p>
                    <p className="text-xs text-muted-foreground">Due on the {bill.due_date}{getOrdinal(bill.due_date)}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">${Number(bill.amount).toFixed(2)}</span>
                </div>
              ))}
              {upcomingSubs.map((sub) => {
                const nextDate = computeNextBillingDate(sub.next_billing_date, sub.billing_cycle || "monthly");
                return (
                  <div key={sub.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sub.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Renews {nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-foreground">${Number(sub.amount).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getOrdinal(n: number): string {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
