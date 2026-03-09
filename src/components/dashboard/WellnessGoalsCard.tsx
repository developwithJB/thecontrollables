import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Settings2 } from "lucide-react";
import { useWellnessGoals, GoalProgress, getGoalMeta } from "@/hooks/useWellnessGoals";
import { SetGoalsDialog } from "./SetGoalsDialog";
import { cn } from "@/lib/utils";

interface WellnessGoalsCardProps {
  userId: string;
}

function formatCurrent(goalType: string, current: number): string {
  if (goalType === "steps") {
    if (current >= 1000) {
      return `${(current / 1000).toFixed(1)}k`;
    }
    return current.toLocaleString();
  }
  if (goalType === "sleep_hours") {
    return `${current.toFixed(1)}`;
  }
  return current.toString();
}

function formatTarget(goalType: string, target: number): string {
  if (goalType === "steps") {
    if (target >= 1000) {
      return `${(target / 1000).toFixed(0)}k`;
    }
    return target.toLocaleString();
  }
  if (goalType === "sleep_hours") {
    return `${target}`;
  }
  return target.toString();
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-green-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export function WellnessGoalsCard({ userId }: WellnessGoalsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { goals, goalProgress, isLoading, setGoals, isUpdating } = useWellnessGoals(userId);

  // Don't render if no goals set yet
  const hasGoals = goals.length > 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Your Goals
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setDialogOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasGoals ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Set daily targets to track your progress
              </p>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Set Goals
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {goalProgress.map((gp) => (
                <GoalRow key={gp.goalType} progress={gp} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SetGoalsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingGoals={goals}
        onSave={setGoals}
        isUpdating={isUpdating}
      />
    </>
  );
}

function GoalRow({ progress }: { progress: GoalProgress }) {
  const meta = getGoalMeta(progress.goalType);
  const currentFormatted = formatCurrent(progress.goalType, progress.current);
  const targetFormatted = formatTarget(progress.goalType, progress.target);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <span>{meta.icon}</span>
          <span className="font-medium">{meta.label}</span>
        </span>
        <span className="text-muted-foreground">
          {currentFormatted} / {targetFormatted}
          {meta.unit}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-500",
            getProgressColor(progress.percentage)
          )}
          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
