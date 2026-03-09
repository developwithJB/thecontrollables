import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Receipt, CreditCard } from "lucide-react";
import type { RecurringBill, Subscription } from "@/hooks/useMoney";

interface BillsSubscriptionsProps {
  bills: RecurringBill[];
  subscriptions: Subscription[];
  onCreateBill: (bill: { bill_name: string; amount: number; due_date: number; frequency?: string }) => void;
  onMarkBillPaid: (id: string) => void;
  onCreateSubscription: (sub: { service_name: string; amount: number; billing_cycle?: string; next_billing_date: string }) => void;
  onCancelSubscription: (id: string) => void;
}

export function BillsSubscriptions({
  bills, subscriptions, onCreateBill, onMarkBillPaid, onCreateSubscription, onCancelSubscription,
}: BillsSubscriptionsProps) {
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCycle, setSubCycle] = useState("monthly");
  const [subNextDate, setSubNextDate] = useState("");

  const today = new Date();
  const currentDay = today.getDate();

  const handleAddBill = () => {
    if (!billName.trim() || !billAmount || !billDueDate) return;
    onCreateBill({ bill_name: billName.trim(), amount: parseFloat(billAmount), due_date: parseInt(billDueDate) });
    setBillName(""); setBillAmount(""); setBillDueDate("");
    setShowAddBill(false);
  };

  const handleAddSub = () => {
    if (!subName.trim() || !subAmount || !subNextDate) return;
    onCreateSubscription({ service_name: subName.trim(), amount: parseFloat(subAmount), billing_cycle: subCycle, next_billing_date: subNextDate });
    setSubName(""); setSubAmount(""); setSubNextDate("");
    setShowAddSub(false);
  };

  const monthlySubsTotal = subscriptions.reduce((sum, s) => {
    if (s.billing_cycle === "yearly") return sum + Number(s.amount) / 12;
    return sum + Number(s.amount);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Bills section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" />
            Recurring Bills
          </h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddBill(!showAddBill)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {showAddBill && (
          <Card className="mb-3">
            <CardContent className="pt-4 space-y-3">
              <Input placeholder="Bill name" value={billName} onChange={(e) => setBillName(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Amount ($)" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
                <Input type="number" placeholder="Due date (1-31)" min={1} max={31} value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddBill}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddBill(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {bills.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No recurring bills tracked yet.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {bills.map((bill) => {
              const isPaidThisMonth = bill.last_paid_date && new Date(bill.last_paid_date).getMonth() === today.getMonth();
              return (
                <Card key={bill.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bill.bill_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due on the {bill.due_date}{getOrdinal(bill.due_date)} · ${Number(bill.amount).toFixed(2)}
                      </p>
                    </div>
                    {isPaidThisMonth ? (
                      <span className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMarkBillPaid(bill.id)}>
                        Mark Paid
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscriptions section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Subscriptions
            <span className="text-xs text-muted-foreground font-normal">
              ~${monthlySubsTotal.toFixed(0)}/mo
            </span>
          </h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddSub(!showAddSub)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {showAddSub && (
          <Card className="mb-3">
            <CardContent className="pt-4 space-y-3">
              <Input placeholder="Service name" value={subName} onChange={(e) => setSubName(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Amount ($)" value={subAmount} onChange={(e) => setSubAmount(e.target.value)} />
                <Select value={subCycle} onValueChange={setSubCycle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="date" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSub}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddSub(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptions.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No subscriptions tracked yet.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{sub.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(sub.amount).toFixed(2)}/{sub.billing_cycle === "yearly" ? "yr" : "mo"} · Next: {new Date(sub.next_billing_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onCancelSubscription(sub.id)}>
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getOrdinal(n: number): string {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
