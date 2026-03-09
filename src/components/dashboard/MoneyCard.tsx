import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ChevronRight, Receipt, PiggyBank } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoneySummary } from "@/hooks/useMoney";

interface MoneyCardProps {
  userId: string;
}

export const MoneyCard = ({ userId }: MoneyCardProps) => {
  const navigate = useNavigate();
  const { billsDueCount, billsDueTotal, monthlySubsTotal, primaryGoalName, goalProgress, hasData, isLoading } = useMoneySummary(userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><Skeleton className="h-5 w-28" /></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Money Hub
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate("/money")}
          >
            Open <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <button
            onClick={() => navigate("/money")}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed border-border hover:border-primary/50"
          >
            <DollarSign className="h-4 w-4" />
            Set up your financial picture
          </button>
        ) : (
          <div className="space-y-3">
            {/* Bills due */}
            {billsDueCount > 0 && (
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm text-foreground">
                  {billsDueCount} bill{billsDueCount > 1 ? "s" : ""} due this week
                </span>
                <span className="text-xs text-muted-foreground ml-auto">${billsDueTotal.toFixed(0)}</span>
              </div>
            )}

            {/* Subscriptions total */}
            {monthlySubsTotal > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">Subscriptions</span>
                <span className="text-xs text-muted-foreground ml-auto">${monthlySubsTotal.toFixed(0)}/mo</span>
              </div>
            )}

            {/* Primary savings goal */}
            {primaryGoalName && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm text-foreground truncate flex-1">{primaryGoalName}</span>
                  <span className="text-xs text-muted-foreground">{goalProgress.toFixed(0)}%</span>
                </div>
                <Progress value={goalProgress} className="h-1.5" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
