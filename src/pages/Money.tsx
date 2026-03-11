import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Receipt, Target } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useFinancialAccounts, useTransactions, useBudgetBuckets, useRecurringBills, useSubscriptions, useSavingsGoals } from "@/hooks/useMoney";
import { MoneyOverview } from "@/components/money/MoneyOverview";
import { BudgetManager } from "@/components/money/BudgetManager";
import { BillsSubscriptions } from "@/components/money/BillsSubscriptions";
import { SavingsGoals } from "@/components/money/SavingsGoals";
import { TransactionHistory } from "@/components/money/TransactionHistory";
import { TransactionImporter } from "@/components/money/TransactionImporter";
import { AccountManager } from "@/components/money/AccountManager";
import { FinancialControllables } from "@/components/money/FinancialControllables";
import { ControllablePoweredBy } from "@/components/layout/ControllablePoweredBy";

export default function Money() {
  const user = useLifeOSUser();
  const [showImporter, setShowImporter] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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

      <ControllablePoweredBy controllables={["awareness", "perspective", "habit", "environment"]} />

      {/* Financial Controllables summary */}
      <FinancialControllables
        bills={bills}
        subscriptions={subscriptions}
        buckets={buckets}
        goals={goals}
        transactions={transactions}
      />

      {/* CSV Importer overlay */}
      {showImporter && (
        <TransactionImporter
          userId={user.id}
          onComplete={() => setShowImporter(false)}
          onCancel={() => setShowImporter(false)}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="bills" className="text-xs">
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            Bills & Subs
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <MoneyOverview accounts={accounts} bills={bills} subscriptions={subscriptions} goals={goals} />
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
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <BillsSubscriptions
            bills={bills}
            subscriptions={subscriptions}
            onCreateBill={(b) => createBill.mutate(b)}
            onMarkBillPaid={(id) => markBillPaid.mutate(id)}
            onCreateSubscription={(s) => createSubscription.mutate(s)}
            onCancelSubscription={(id) => cancelSubscription.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <SavingsGoals
            goals={goals}
            onCreateGoal={(g) => createGoal.mutate(g)}
            onUpdateGoal={(u) => updateGoal.mutate(u)}
            onCompleteGoal={(id) => completeGoal.mutate(id)}
            isCreating={createGoal.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
