import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownRight, Upload } from "lucide-react";
import type { Transaction, BudgetBucket } from "@/hooks/useMoney";

interface TransactionHistoryProps {
  transactions: Transaction[];
  buckets: BudgetBucket[];
  onAddTransaction: (txn: { description: string; amount: number; transaction_date: string; category?: string; budget_bucket_id?: string; account_id?: string | null }) => void;
  onShowImport: () => void;
  isAdding?: boolean;
}

export function TransactionHistory({ transactions, buckets, onAddTransaction, onShowImport, isAdding }: TransactionHistoryProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [bucketId, setBucketId] = useState("");

  const handleAdd = () => {
    if (!desc.trim() || !amount) return;
    const numAmount = parseFloat(amount) * (isExpense ? -1 : 1);
    onAddTransaction({
      description: desc.trim(),
      amount: numAmount,
      transaction_date: date,
      category: category || undefined,
      budget_bucket_id: bucketId || undefined,
      account_id: null,
    });
    setDesc(""); setAmount(""); setCategory(""); setBucketId("");
    setShowAdd(false);
  };

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    const d = t.transaction_date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(t);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Transactions</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onShowImport}>
            <Upload className="h-3 w-3 mr-1" /> Import CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Select value={isExpense ? "expense" : "income"} onValueChange={(v) => setIsExpense(v === "expense")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            {buckets.length > 0 && (
              <Select value={bucketId} onValueChange={setBucketId}>
                <SelectTrigger><SelectValue placeholder="Budget category (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {buckets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.bucket_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isAdding}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {transactions.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add them manually or import from a CSV.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => (
            <div key={dateStr}>
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                {new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <div className="space-y-1">
                {grouped[dateStr].map((t) => {
                  const isIncome = Number(t.amount) > 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        {isIncome ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <div>
                          <p className="text-sm text-foreground">{t.description}</p>
                          {t.category && <p className="text-[11px] text-muted-foreground">{t.category}</p>}
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${isIncome ? "text-primary" : "text-foreground"}`}>
                        {isIncome ? "+" : "-"}${Math.abs(Number(t.amount)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
