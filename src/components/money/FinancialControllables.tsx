import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, CalendarClock, PiggyBank, TrendingUp } from "lucide-react";
import type { RecurringBill, Subscription, BudgetBucket, SavingsGoal, Transaction } from "@/hooks/useMoney";

interface FinancialControllablesProps {
  bills: RecurringBill[];
  subscriptions: Subscription[];
  buckets: BudgetBucket[];
  goals: SavingsGoal[];
  transactions: Transaction[];
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: "action" | "awareness" | "progress";
}

export function FinancialControllables({ bills, subscriptions, buckets, goals, transactions }: FinancialControllablesProps) {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentMonth = today.toISOString().slice(0, 7);

  const insights: Insight[] = [];

  // Bills due this week
  const billsDueThisWeek = bills.filter((b) => {
    const diff = b.due_date >= currentDay ? b.due_date - currentDay : daysInMonth - currentDay + b.due_date;
    return diff <= 7;
  });
  if (billsDueThisWeek.length > 0) {
    const total = billsDueThisWeek.reduce((s, b) => s + Number(b.amount), 0);
    insights.push({
      icon: <CalendarClock className="h-4 w-4 text-accent" />,
      text: `${billsDueThisWeek.length} bill${billsDueThisWeek.length > 1 ? "s" : ""} due this week — $${total.toFixed(0)} total`,
      type: "action",
    });
  }

  // Budget awareness
  buckets.forEach((bucket) => {
    const spent = transactions
      .filter((t) => t.budget_bucket_id === bucket.id && t.transaction_date.startsWith(currentMonth) && Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const pct = bucket.monthly_target > 0 ? (spent / bucket.monthly_target) * 100 : 0;
    if (pct >= 80 && pct < 100) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4 text-accent" />,
        text: `${bucket.bucket_name} is at ${pct.toFixed(0)}% of your monthly target`,
        type: "awareness",
      });
    }
  });

  // Subscription total
  const monthlySubsTotal = subscriptions.reduce((sum, s) => {
    if (s.billing_cycle === "yearly") return sum + Number(s.amount) / 12;
    return sum + Number(s.amount);
  }, 0);
  if (monthlySubsTotal > 0) {
    insights.push({
      icon: <Lightbulb className="h-4 w-4 text-primary" />,
      text: `${subscriptions.length} active subscription${subscriptions.length > 1 ? "s" : ""} totaling ~$${monthlySubsTotal.toFixed(0)}/month`,
      type: "awareness",
    });
  }

  // Savings goal progress
  goals.forEach((goal) => {
    const pct = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
    if (pct >= 50) {
      insights.push({
        icon: <PiggyBank className="h-4 w-4 text-primary" />,
        text: `${goal.goal_name} is ${pct.toFixed(0)}% funded — keep building`,
        type: "progress",
      });
    } else if (goal.monthly_contribution && Number(goal.monthly_contribution) > 0) {
      const remaining = Number(goal.target_amount) - Number(goal.current_amount);
      const months = Math.ceil(remaining / Number(goal.monthly_contribution));
      insights.push({
        icon: <TrendingUp className="h-4 w-4 text-primary" />,
        text: `${goal.goal_name} is ~${months} month${months > 1 ? "s" : ""} away at your current pace`,
        type: "progress",
      });
    }
  });

  // No data state
  if (insights.length === 0 && bills.length === 0 && subscriptions.length === 0) {
    insights.push({
      icon: <Lightbulb className="h-4 w-4 text-muted-foreground" />,
      text: "Start adding bills, subscriptions, or goals to see your financial picture here.",
      type: "awareness",
    });
  } else if (insights.length === 0) {
    insights.push({
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
      text: "Everything looks steady. No immediate actions needed.",
      type: "progress",
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Financial Controllables</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.slice(0, 5).map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">{insight.icon}</div>
              <p className="text-sm text-foreground">{insight.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
