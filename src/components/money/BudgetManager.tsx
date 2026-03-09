import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2 } from "lucide-react";
import type { BudgetBucket, Transaction } from "@/hooks/useMoney";

interface BudgetManagerProps {
  buckets: BudgetBucket[];
  transactions: Transaction[];
  onCreateBucket: (bucket: { bucket_name: string; monthly_target: number }) => void;
  onDeleteBucket: (id: string) => void;
  isCreating?: boolean;
}

export function BudgetManager({ buckets, transactions, onCreateBucket, onDeleteBucket, isCreating }: BudgetManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Calculate spend per bucket
  const spendByBucket = buckets.map((bucket) => {
    const spent = transactions
      .filter((t) => t.budget_bucket_id === bucket.id && t.transaction_date.startsWith(currentMonth) && Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const pct = bucket.monthly_target > 0 ? Math.min(100, (spent / bucket.monthly_target) * 100) : 0;
    return { ...bucket, spent, pct };
  });

  // Uncategorized spend
  const categorizedIds = new Set(buckets.map((b) => b.id));
  const uncategorizedSpend = transactions
    .filter((t) => !t.budget_bucket_id && t.transaction_date.startsWith(currentMonth) && Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const handleAdd = () => {
    if (!name.trim() || !target) return;
    onCreateBucket({ bucket_name: name.trim(), monthly_target: parseFloat(target) });
    setName("");
    setTarget("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Monthly Budget</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="number" placeholder="Monthly target ($)" value={target} onChange={(e) => setTarget(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isCreating}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {spendByBucket.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No budget categories yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add categories to start tracking where your money goes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {spendByBucket.map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{b.bucket_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      ${b.spent.toFixed(0)} / ${b.monthly_target.toFixed(0)}
                    </span>
                    <button onClick={() => onDeleteBucket(b.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <Progress value={b.pct} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {b.pct < 50 ? "On track" : b.pct < 80 ? "Getting close" : b.pct < 100 ? "Nearly there" : "Over target"}
                </p>
              </CardContent>
            </Card>
          ))}
          {uncategorizedSpend > 0 && (
            <Card>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uncategorized</span>
                  <span className="text-xs text-muted-foreground">${uncategorizedSpend.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
