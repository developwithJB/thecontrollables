import { motion } from "framer-motion";
import { ChevronLeft, Calendar, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { getDayContent } from "@/lib/resetContent";
import { ProgressDots } from "./ProgressDots";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CompletedDayData {
  day_number: number;
  reflection?: string | null;
  completed_at?: string | null;
  commitment?: string | null;
  release?: string | null;
}

interface CompletedDayViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayData: CompletedDayData | null;
  totalCompletedDays?: number;
}

export function CompletedDayView({ 
  open, 
  onOpenChange, 
  dayData,
  totalCompletedDays = 0,
}: CompletedDayViewProps) {
  if (!dayData) return null;

  const content = getDayContent(dayData.day_number);
  const formattedDate = dayData.completed_at 
    ? format(new Date(dayData.completed_at), "EEEE, MMMM d, yyyy")
    : null;

  // Determine which user input field to show based on the day's input type
  const userResponse = dayData.reflection || dayData.commitment || dayData.release;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{content.emoji}</span>
              <div>
                <DialogTitle className="text-left">
                  Day {dayData.day_number}: {content.controllable}
                </DialogTitle>
                {formattedDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Reading Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-muted/30 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{content.reading.source}</p>
              </div>
              <p className="text-sm font-semibold text-foreground mb-3">
                {content.reading.chapter}
              </p>
              <p className="text-base leading-relaxed text-foreground font-serif italic">
                "{content.reading.text}"
              </p>
            </motion.div>

            {/* Framing Line */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-sm text-foreground/90 leading-relaxed text-center">
                {content.framingLine}
              </p>
            </motion.div>

            {/* Prompt & Response */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground">
                {content.prompt}
              </p>
              
              {userResponse ? (
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Your Response
                  </p>
                  <p className="text-sm text-foreground italic">
                    "{userResponse}"
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border/50">
                  <p className="text-xs text-muted-foreground italic text-center">
                    No response recorded
                  </p>
                </div>
              )}
            </motion.div>

            {/* Control & Surrender Lines */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-3 py-4 border-t border-b border-muted/50"
            >
              <p className="text-sm text-foreground/80">
                <span className="text-muted-foreground font-medium">Control:</span>{" "}
                {content.controlLine}
              </p>
              <p className="text-sm text-foreground/80 italic">
                <span className="text-muted-foreground not-italic font-medium">Surrender:</span>{" "}
                {content.surrenderLine}
              </p>
            </motion.div>

            {/* Progress indicator */}
            <div className="pt-2">
              <ProgressDots 
                totalDays={7} 
                currentDay={dayData.day_number} 
                completedDays={totalCompletedDays} 
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}