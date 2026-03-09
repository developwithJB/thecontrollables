import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutDashboard, PieChart, Receipt, Target, List, Settings } from "lucide-react";
import { SplashScreen } from "@/components/SplashScreen";
import { useFinancialAccounts, useTransactions, useBudgetBuckets, useRecurringBills, useSubscriptions, useSavingsGoals } from "@/hooks/useMoney";
import { MoneyOverview } from "@/components/money/MoneyOverview";
import { BudgetManager } from "@/components/money/BudgetManager";
import { BillsSubscriptions } from "@/components/money/BillsSubscriptions";
import { SavingsGoals } from "@/components/money/SavingsGoals";
import { TransactionHistory } from "@/components/money/TransactionHistory";
import { TransactionImporter } from "@/components/money/TransactionImporter";
import { AccountManager } from "@/components/money/AccountManager";
import { FinancialControllables } from "@/components/money/FinancialControllables";
import type { User } from "@supabase/supabase-js";

export default function Money() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImporter, setShowImporter] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      } else {
        navigate("/auth");
      }
      setIsLoading(false);
    });
  }, [navigate]);

  const { accounts, createAccount, deleteAccount } = useFinancialAccounts(user?.id || null);
  const { transactions, addTransaction, isLoading: txnLoading } = useTransactions(user?.id || null);
  const { buckets, createBucket, deleteBucket } = useBudgetBuckets(user?.id || null);
  const { bills, createBill, markBillPaid } = useRecurringBills(user?.id || null);
  const { subscriptions, createSubscription, cancelSubscription } = useSubscriptions(user?.id || null);
  const { goals, createGoal, updateGoal, completeGoal } = useSavingsGoals(user?.id || null);

  if (isLoading) return <SplashScreen />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Money Hub</h1>
        </div>
      </div>

      <div className="max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto px-4 pt-4 space-y-4">
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
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="overview" className="text-xs px-1">
              <LayoutDashboard className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-xs px-1">
              <PieChart className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="bills" className="text-xs px-1">
              <Receipt className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Bills</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs px-1">
              <Target className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs px-1">
              <List className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <MoneyOverview accounts={accounts} bills={bills} subscriptions={subscriptions} goals={goals} />
            <div className="mt-4">
              <AccountManager
                accounts={accounts}
                onCreateAccount={(a) => createAccount.mutate(a)}
                onDeleteAccount={(id) => deleteAccount.mutate(id)}
                isCreating={createAccount.isPending}
              />
            </div>
          </TabsContent>

          <TabsContent value="budget" className="mt-4">
            <BudgetManager
              buckets={buckets}
              transactions={transactions}
              onCreateBucket={(b) => createBucket.mutate(b)}
              onDeleteBucket={(id) => deleteBucket.mutate(id)}
              isCreating={createBucket.isPending}
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

          <TabsContent value="transactions" className="mt-4">
            <TransactionHistory
              transactions={transactions}
              buckets={buckets}
              onAddTransaction={(t) => addTransaction.mutate(t)}
              onShowImport={() => setShowImporter(true)}
              isAdding={addTransaction.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
