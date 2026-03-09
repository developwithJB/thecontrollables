import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp } from "lucide-react";
import type { SavingsGoal } from "@/hooks/useMoney";

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  onCreateGoal: (goal: { goal_name: string; target_amount: number; target_date?: string; monthly_contribution?: number }) => void;
  onUpdateGoal: (update: { id: string; current_amount?: number }) => void;
  onCompleteGoal: (id: string) => void;
  isCreating?: boolean;
}

export function SavingsGoals({ goals, onCreateGoal, onUpdateGoal, onCompleteGoal, isCreating }: SavingsGoalsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContrib, setMonthlyContrib] = useState("");
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

  const handleAdd = () => {
    if (!name.trim() || !targetAmount) return;
    onCreateGoal({
      goal_name: name.trim(),
      target_amount: parseFloat(targetAmount),
      target_date: targetDate || undefined,
      monthly_contribution: monthlyContrib ? parseFloat(monthlyContrib) : undefined,
    });
    setName(""); setTargetAmount(""); setTargetDate(""); setMonthlyContrib("");
    setShowAdd(false);
  };

  const handleAddToGoal = (goal: SavingsGoal) => {
    const addAmt = parseFloat(addAmounts[goal.id] || "0");
    if (addAmt <= 0) return;
    const newAmount = Number(goal.current_amount) + addAmt;
    onUpdateGoal({ id: goal.id, current_amount: newAmount });
    setAddAmounts((prev) => ({ ...prev, [goal.id]: "" }));
    if (newAmount >= Number(goal.target_amount)) {
      onCompleteGoal(goal.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Savings Goals
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> New Goal
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Goal name (e.g., Emergency Fund)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Target amount ($)" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              <Input type="number" placeholder="Monthly contribution ($)" value={monthlyContrib} onChange={(e) => setMonthlyContrib(e.target.value)} />
            </div>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isCreating}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No savings goals yet.</p>
            <p className="text-xs text-muted-foreground mt-1">What are you building toward?</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const pct = Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100);
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);
            const monthsToGo = goal.monthly_contribution && Number(goal.monthly_contribution) > 0
              ? Math.ceil(remaining / Number(goal.monthly_contribution))
              : null;

            return (
              <Card key={goal.id}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{goal.goal_name}</span>
                    <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-2 mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      ${Number(goal.current_amount).toLocaleString()} of ${Number(goal.target_amount).toLocaleString()}
                    </span>
                    {monthsToGo !== null && (
                      <span className="text-xs text-muted-foreground">
                        ~{monthsToGo} mo{monthsToGo !== 1 ? "s" : ""} to go
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      type="number"
                      placeholder="Add amount"
                      className="h-8 text-sm"
                      value={addAmounts[goal.id] || ""}
                      onChange={(e) => setAddAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                    />
                    <Button size="sm" className="h-8" onClick={() => handleAddToGoal(goal)}>
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
