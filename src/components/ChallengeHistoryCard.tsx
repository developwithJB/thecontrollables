import { motion } from "framer-motion";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface ChallengeHistoryCardProps {
  session: {
    id: string;
    start_date: string;
    status: string;
    completed_at: string | null;
    current_day: number;
  };
  completedDays: number;
  index: number;
}

export function ChallengeHistoryCard({ session, completedDays, index }: ChallengeHistoryCardProps) {
  const isCompleted = session.status === "completed";
  const startDate = new Date(session.start_date);
  const endDate = session.completed_at ? new Date(session.completed_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-xl border p-4 ${
        isCompleted 
          ? "bg-gradient-to-br from-primary/10 to-muted/20 border-primary/30" 
          : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-2">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/20 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Completed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                In Progress
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display font-semibold text-foreground mb-1">
            7-Day Foundation
          </h3>

          {/* Date range */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{format(startDate, "MMM d, yyyy")}</span>
            {endDate && (
              <>
                <span>→</span>
                <span>{format(endDate, "MMM d, yyyy")}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-foreground">
            {completedDays}/7
          </p>
          <p className="text-xs text-muted-foreground">days</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedDays / 7) * 100}%` }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
          className="h-full bg-primary rounded-full"
        />
      </div>
    </motion.div>
  );
}
