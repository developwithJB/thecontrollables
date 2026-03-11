import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePlannerItems, getWeekRange } from "@/hooks/usePlanner";
import { useFinancialAccounts, useTransactions, useBudgetBuckets, useRecurringBills, useSubscriptions, useSavingsGoals } from "@/hooks/useMoney";
import { MoneyOverview } from "@/components/money/MoneyOverview";
import { BudgetManager } from "@/components/money/BudgetManager";
import { BillsSubscriptions } from "@/components/money/BillsSubscriptions";
import { SavingsGoals } from "@/components/money/SavingsGoals";
import { TransactionHistory } from "@/components/money/TransactionHistory";
import { TransactionImporter } from "@/components/money/TransactionImporter";
import { AccountManager } from "@/components/money/AccountManager";
import { FinancialControllables } from "@/components/money/FinancialControllables";
import { GroceryRhythmCard } from "@/components/money/GroceryRhythmCard";
import { useHealthData } from "@/hooks/useHealthData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Money() {
  const user = useLifeOSUser();
  const [showImporter, setShowImporter] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Calendar load for spending risk signal
  const moneyWeekRange = useMemo(() => getWeekRange(new Date()), []);
  const { data: moneyPlannerItems = [] } = usePlannerItems(moneyWeekRange.start, moneyWeekRange.end, user.id);
  const weekPlannerCount = moneyPlannerItems.length;
  const { latest: healthLatest } = useHealthData(user.id);
  const recoveryLow = healthLatest?.recovery != null && healthLatest.recovery < 40;

  const { accounts, createAccount, deleteAccount } = useFinancialAccounts(user.id);
  const { transactions, addTransaction, isLoading: txnLoading } = useTransactions(user.id);
  const { buckets, createBucket, deleteBucket } = useBudgetBuckets(user.id);
  const { bills, createBill, markBillPaid } = useRecurringBills(user.id);
  const { subscriptions, createSubscription, cancelSubscription } = useSubscriptions(user.id);
  const { goals, createGoal, updateGoal, completeGoal } = useSavingsGoals(user.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">💰</span>
          <h1 className="font-display text-2xl font-semibold text-foreground">Money</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your financial rhythm — spending, bills, and behavior awareness.</p>
      </div>

      {/* 1. Financial Controllables — behavioral insight */}
      <FinancialControllables
        bills={bills}
        subscriptions={subscriptions}
        buckets={buckets}
        goals={goals}
        transactions={transactions}
      />

      {/* 1b. Grocery Rhythm — food → spending insight */}
      <GroceryRhythmCard userId={user.id} plannerCount={weekPlannerCount} />

      {/* 2. Monthly Overview */}
      <MoneyOverview accounts={accounts} bills={bills} subscriptions={subscriptions} goals={goals} />

      {/* 3. Bills & Subscriptions — inline */}
      <BillsSubscriptions
        bills={bills}
        subscriptions={subscriptions}
        onCreateBill={(b) => createBill.mutate(b)}
        onMarkBillPaid={(id) => markBillPaid.mutate(id)}
        onCreateSubscription={(s) => createSubscription.mutate(s)}
        onCancelSubscription={(id) => cancelSubscription.mutate(id)}
      />

      {/* 4. Savings Goals — inline */}
      <SavingsGoals
        goals={goals}
        onCreateGoal={(g) => createGoal.mutate(g)}
        onUpdateGoal={(u) => updateGoal.mutate(u)}
        onCompleteGoal={(id) => completeGoal.mutate(id)}
        isCreating={createGoal.isPending}
      />

      {/* 5. Manage Details — collapsible advanced section */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          Manage accounts, budgets & transactions
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <AccountManager
            accounts={accounts}
            onCreateAccount={(a) => createAccount.mutate(a)}
            onDeleteAccount={(id) => deleteAccount.mutate(id)}
            isCreating={createAccount.isPending}
          />
          <BudgetManager
            buckets={buckets}
            transactions={transactions}
            onCreateBucket={(b) => createBucket.mutate(b)}
            onDeleteBucket={(id) => deleteBucket.mutate(id)}
            isCreating={createBucket.isPending}
          />
          <TransactionHistory
            transactions={transactions}
            buckets={buckets}
            onAddTransaction={(t) => addTransaction.mutate(t)}
            onShowImport={() => setShowImporter(true)}
            isAdding={addTransaction.isPending}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* CSV Importer overlay */}
      {showImporter && (
        <TransactionImporter
          userId={user.id}
          onComplete={() => setShowImporter(false)}
          onCancel={() => setShowImporter(false)}
        />
      )}

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
