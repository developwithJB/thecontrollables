import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { isBillDueWithinDays, billMonthlyCost } from "@/lib/billHelpers";

// ── Types ──────────────────────────────────────────────
export interface FinancialAccount {
  id: string;
  user_id: string;
  account_type: string;
  account_name: string;
  current_balance: number;
  is_active: boolean;
  bank_connection_id: string | null;
  account_number_last4: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  amount: number;
  description: string;
  category: string | null;
  transaction_date: string;
  is_pending: boolean;
  external_transaction_id: string | null;
  budget_bucket_id: string | null;
  created_at: string;
}

export interface BudgetBucket {
  id: string;
  user_id: string;
  bucket_name: string;
  monthly_target: number;
  bucket_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  bill_name: string;
  amount: number;
  due_date: number;
  frequency: string;
  category: string | null;
  account_id: string | null;
  is_active: boolean;
  last_paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string;
  account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  monthly_contribution: number;
  linked_account_id: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ── Financial Accounts ────────────────────────────────
export function useFinancialAccounts(userId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["financial-accounts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as FinancialAccount[];
    },
    enabled: !!userId,
  });

  const createAccount = useMutation({
    mutationFn: async (account: { account_name: string; account_type: string; current_balance?: number }) => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .insert({ ...account, user_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts", userId] });
      toast({ title: "Account added" });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancialAccount> & { id: string }) => {
      const { error } = await supabase.from("financial_accounts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-accounts", userId] }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts", userId] });
      toast({ title: "Account removed" });
    },
  });

  return { accounts: query.data || [], isLoading: query.isLoading, createAccount, updateAccount, deleteAccount };
}

// ── Transactions ──────────────────────────────────────
export function useTransactions(userId: string | null, options?: { accountId?: string; month?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["transactions", userId, options?.accountId, options?.month],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).limit(200);
      if (options?.accountId) q = q.eq("account_id", options.accountId);
      if (options?.month) {
        const start = `${options.month}-01`;
        const endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + 1);
        const end = endDate.toISOString().split("T")[0];
        q = q.gte("transaction_date", start).lt("transaction_date", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!userId,
  });

  const addTransaction = useMutation({
    mutationFn: async (txn: { description: string; amount: number; transaction_date: string; category?: string | null; budget_bucket_id?: string | null; account_id?: string | null }) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...txn, user_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      toast({ title: "Transaction added" });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions", userId] }),
  });

  return { transactions: query.data || [], isLoading: query.isLoading, addTransaction, deleteTransaction };
}

// ── Budget Buckets ────────────────────────────────────
export function useBudgetBuckets(userId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["budget-buckets", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_buckets")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data || []) as BudgetBucket[];
    },
    enabled: !!userId,
  });

  const createBucket = useMutation({
    mutationFn: async (bucket: { bucket_name: string; monthly_target: number; bucket_type?: string }) => {
      const { data, error } = await supabase
        .from("budget_buckets")
        .insert({ ...bucket, user_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-buckets", userId] });
      toast({ title: "Budget category added" });
    },
  });

  const updateBucket = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetBucket> & { id: string }) => {
      const { error } = await supabase.from("budget_buckets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-buckets", userId] }),
  });

  const deleteBucket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_buckets").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-buckets", userId] });
      toast({ title: "Budget category removed" });
    },
  });

  return { buckets: query.data || [], isLoading: query.isLoading, createBucket, updateBucket, deleteBucket };
}

// ── Recurring Bills ───────────────────────────────────
export function useRecurringBills(userId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["recurring-bills", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_bills")
        .select("*")
        .eq("is_active", true)
        .order("due_date");
      if (error) throw error;
      return (data || []) as RecurringBill[];
    },
    enabled: !!userId,
  });

  const createBill = useMutation({
    mutationFn: async (bill: { bill_name: string; amount: number; due_date: number; frequency?: string; category?: string }) => {
      const { data, error } = await supabase
        .from("recurring_bills")
        .insert({ ...bill, user_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bills", userId] });
      toast({ title: "Bill added" });
    },
  });

  const updateBill = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringBill> & { id: string }) => {
      const { error } = await supabase.from("recurring_bills").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring-bills", userId] }),
  });

  const markBillPaid = useMutation({
    mutationFn: async (id: string) => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("recurring_bills").update({ last_paid_date: today }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bills", userId] });
      toast({ title: "Bill marked as paid" });
    },
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_bills").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bills", userId] });
      toast({ title: "Bill removed" });
    },
  });

  return { bills: query.data || [], isLoading: query.isLoading, createBill, updateBill, markBillPaid, deleteBill };
}

// ── Subscriptions ─────────────────────────────────────
export function useSubscriptions(userId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["subscriptions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("is_active", true)
        .order("next_billing_date");
      if (error) throw error;
      return (data || []) as Subscription[];
    },
    enabled: !!userId,
  });

  const createSubscription = useMutation({
    mutationFn: async (sub: { service_name: string; amount: number; billing_cycle?: string; next_billing_date: string }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({ ...sub, user_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
      toast({ title: "Subscription added" });
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subscription> & { id: string }) => {
      const { error } = await supabase.from("subscriptions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] }),
  });

  const cancelSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscriptions").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
      toast({ title: "Subscription cancelled" });
    },
  });

  return { subscriptions: query.data || [], isLoading: query.isLoading, createSubscription, updateSubscription, cancelSubscription };
}

// ── Savings Goals ─────────────────────────────────────
export function useSavingsGoals(userId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["savings-goals", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("is_completed", false)
        .order("created_at");
      if (error) throw error;
      return (data || []) as SavingsGoal[];
    },
    enabled: !!userId,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: { goal_name: string; target_amount: number; target_date?: string; monthly_contribution?: number }) => {
      const { data, error } = await supabase
        .from("savings_goals")
        .insert({ ...goal, user_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals", userId] });
      toast({ title: "Savings goal created" });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavingsGoal> & { id: string }) => {
      const { error } = await supabase.from("savings_goals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals", userId] });
      toast({ title: "Goal updated" });
    },
  });

  const completeGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").update({ is_completed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals", userId] });
      toast({ title: "Goal completed! 🎉" });
    },
  });

  return { goals: query.data || [], isLoading: query.isLoading, createGoal, updateGoal, completeGoal };
}

// ── Money Summary (for dashboard card) ────────────────
export function useMoneySummary(userId: string | null) {
  const { bills, isLoading: billsLoading } = useRecurringBills(userId);
  const { subscriptions, isLoading: subsLoading } = useSubscriptions(userId);
  const { buckets, isLoading: bucketsLoading } = useBudgetBuckets(userId);
  const { goals, isLoading: goalsLoading } = useSavingsGoals(userId);

  const summary = useMemo(() => {
    // Bills due this week (within 7 days) — frequency-aware
    const billsDueThisWeek = bills.filter((b) => isBillDueWithinDays(b, 7));

    // Monthly subscription total
    const monthlySubsTotal = subscriptions.reduce((sum, s) => {
      if (s.billing_cycle === "yearly") return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);

    // Total monthly budget target
    const totalBudgetTarget = buckets.reduce((sum, b) => sum + b.monthly_target, 0);

    // Primary savings goal
    const primaryGoal = goals[0] || null;
    const goalProgress = primaryGoal ? Math.min(100, (primaryGoal.current_amount / primaryGoal.target_amount) * 100) : 0;

    return {
      billsDueCount: billsDueThisWeek.length,
      billsDueTotal: billsDueThisWeek.reduce((sum, b) => sum + b.amount, 0),
      monthlySubsTotal,
      totalBudgetTarget,
      primaryGoalName: primaryGoal?.goal_name || null,
      goalProgress,
      hasData: bills.length > 0 || subscriptions.length > 0 || buckets.length > 0 || goals.length > 0,
    };
  }, [bills, subscriptions, buckets, goals]);

  return {
    ...summary,
    isLoading: billsLoading || subsLoading || bucketsLoading || goalsLoading,
  };
}
