import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Zap, CalendarDays, MoreVertical, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SeasonSnapshot {
  id: string;
  journey_id: string | null;
  start_date: string;
  completed_at: string | null;
  status: string;
}

interface SeasonProgress {
  weekNumber: number;
  snapshotsCompleted: number;
  totalCheckIns: number;
  totalXP: number;
  isComplete: boolean;
}

interface SeasonBannerProps {
  seasonName?: string | null;
  snapshots: SeasonSnapshot[];
  progress: SeasonProgress;
  onCloseSeason?: () => void;
}

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];

export function SeasonBanner({ seasonName, snapshots, progress, onCloseSeason }: SeasonBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {seasonName || "4-Week Season"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                Week {progress.weekNumber} of 4
              </span>
              {onCloseSeason && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onCloseSeason} className="text-destructive">
                      <XCircle className="w-3.5 h-3.5 mr-2" />
                      Close Season
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* 4-segment progress bar */}
          <div className="flex gap-1.5 mb-3">
            {WEEK_LABELS.map((label, i) => {
              const snapshot = snapshots[i];
              const isCompleted = snapshot?.status === "completed";
              const isActive = snapshot && snapshot.status === "active";

              return (
                <div key={label} className="flex-1 relative">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isCompleted
                        ? "bg-primary"
                        : isActive
                        ? "bg-primary/40 animate-pulse"
                        : "bg-muted"
                    }`}
                  />
                  {isCompleted && (
                    <div className="absolute -top-0.5 right-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground mt-1 block text-center">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cumulative stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {progress.totalCheckIns} check-ins
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {progress.totalXP} XP
            </span>
            <span>
              {progress.snapshotsCompleted}/4 completed
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
