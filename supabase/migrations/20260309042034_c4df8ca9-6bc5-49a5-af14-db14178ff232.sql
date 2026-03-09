-- financial_accounts
CREATE TABLE public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  bank_connection_id UUID,
  account_number_last4 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own financial accounts"
ON public.financial_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_financial_accounts_updated_at
BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- budget_buckets
CREATE TABLE public.budget_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  monthly_target DECIMAL(10,2) DEFAULT 0,
  bucket_type TEXT DEFAULT 'expense',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.budget_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own budget buckets"
ON public.budget_buckets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_budget_buckets_updated_at
BEFORE UPDATE ON public.budget_buckets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  transaction_date DATE NOT NULL,
  is_pending BOOLEAN DEFAULT false,
  external_transaction_id TEXT,
  budget_bucket_id UUID REFERENCES public.budget_buckets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own transactions"
ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recurring_bills
CREATE TABLE public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bill_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date INTEGER NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  category TEXT,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own recurring bills"
ON public.recurring_bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_recurring_bills_updated_at
BEFORE UPDATE ON public.recurring_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly',
  next_billing_date DATE NOT NULL,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subscriptions"
ON public.subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- savings_goals
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_date DATE,
  monthly_contribution DECIMAL(10,2) DEFAULT 0,
  linked_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own savings goals"
ON public.savings_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_savings_goals_updated_at
BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();