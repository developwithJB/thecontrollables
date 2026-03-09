import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Circle, ChevronRight, Plus } from "lucide-react";
import { useTodayPlannerItems, type PlannerItem } from "@/hooks/usePlanner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PlannerCardProps {
  userId: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  in_progress: <Circle className="h-3.5 w-3.5 text-accent" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-perspective" />,
  skipped: <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />,
};

export const PlannerCard = ({ userId }: PlannerCardProps) => {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useTodayPlannerItems(userId);

  const doneCount = items.filter((i) => i.status === "done").length;
  const totalCount = items.length;
  const visibleItems = items.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
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
            <CalendarDays className="h-4 w-4 text-accent" />
            Today's Plan
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                {doneCount}/{totalCount}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate("/planner")}
          >
            Open <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <button
            onClick={() => navigate("/planner")}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed border-border hover:border-accent/50"
          >
            <Plus className="h-4 w-4" />
            Plan your day
          </button>
        ) : (
          <div className="space-y-1.5">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 py-1"
              >
                {statusIcons[item.status]}
                <span
                  className={cn(
                    "text-sm truncate flex-1",
                    item.status === "done" && "line-through text-muted-foreground",
                    item.status === "skipped" && "line-through text-muted-foreground/50"
                  )}
                >
                  {item.title}
                </span>
                {item.start_time && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {item.start_time.slice(0, 5)}
                  </span>
                )}
              </div>
            ))}
            {totalCount > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{totalCount - 5} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
