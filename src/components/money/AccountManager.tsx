import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Trash2 } from "lucide-react";
import type { FinancialAccount } from "@/hooks/useMoney";

interface AccountManagerProps {
  accounts: FinancialAccount[];
  onCreateAccount: (account: { account_name: string; account_type: string; current_balance?: number }) => void;
  onDeleteAccount: (id: string) => void;
  isCreating?: boolean;
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
  { value: "manual", label: "Other / Manual" },
];

const ACCOUNT_ICONS: Record<string, string> = {
  checking: "🏦",
  savings: "🏦",
  credit: "💳",
  cash: "💵",
  investment: "📈",
  manual: "📋",
};

export function AccountManager({ accounts, onCreateAccount, onDeleteAccount, isCreating }: AccountManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [balance, setBalance] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onCreateAccount({
      account_name: name.trim(),
      account_type: type,
      current_balance: balance ? parseFloat(balance) : 0,
    });
    setName(""); setType("checking"); setBalance("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Wallet className="h-4 w-4 text-accent" />
          Accounts
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Balance ($)" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isCreating}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {accounts.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add your accounts to see a full picture.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{ACCOUNT_ICONS[account.account_type] || "📋"}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{account.account_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{account.account_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    ${Number(account.current_balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <button onClick={() => onDeleteAccount(account.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
