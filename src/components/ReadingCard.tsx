import { useState } from "react";
import { motion } from "framer-motion";
import { Book, Lock, Eye } from "lucide-react";
import { format } from "date-fns";
import { CompletedDayView } from "./CompletedDayView";

interface CompletedDayData {
  day_number: number;
  reflection?: string | null;
  completed_at?: string | null;
  commitment?: string | null;
  release?: string | null;
}

interface ReadingCardProps {
  day: number;
  emoji: string;
  controllable: string;
  chapter: string;
  text: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  isLocked?: boolean;
  completedDayData?: CompletedDayData;
  totalCompletedDays?: number;
}

export function ReadingCard({ 
  day, 
  emoji, 
  controllable, 
  chapter, 
  text, 
  isCompleted,
  completedAt,
  isLocked = false,
  completedDayData,
  totalCompletedDays = 0,
}: ReadingCardProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handleOpenView = () => {
    if (isCompleted && completedDayData) {
      setIsViewOpen(true);
    }
  };

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: day * 0.05 }}
        className="relative overflow-hidden rounded-2xl bg-muted/20 border border-dashed border-muted-foreground/10 p-6"
      >
        {/* Locked overlay - softer, more patient feel */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px]">
          <div className="text-center">
            <Lock className="w-4 h-4 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">Complete Day {day} to unlock</p>
          </div>
        </div>

        {/* Day badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-20">
          <span className="text-xs text-muted-foreground">Day {day}</span>
          <span className="text-2xl">{emoji}</span>
        </div>

        {/* Blurred content preview */}
        <div className="pt-8 opacity-20">
          <div className="flex items-center gap-2 mb-2">
            <Book className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">The Controllables</p>
          </div>
          <h3 className="font-display font-semibold text-foreground mb-4">
            {chapter}
          </h3>
          <p className="text-base leading-relaxed text-foreground/90 font-serif italic line-clamp-2">
            "{text.substring(0, 50)}..."
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: day * 0.05 }}
        onClick={handleOpenView}
        disabled={!isCompleted || !completedDayData}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 border p-6 w-full text-left transition-all ${
          isCompleted && completedDayData 
            ? "hover:from-primary/25 hover:via-primary/15 cursor-pointer" 
            : "cursor-default"
        }`}
      >
        {/* Completed indicator with timestamp */}
        {isCompleted && (
          <div className="absolute top-4 left-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-primary bg-primary/20 px-2 py-1 rounded-full flex items-center gap-1">
                ✓ Unlocked
                {completedDayData && <Eye className="w-3 h-3 ml-1" />}
              </span>
              {completedAt && (
                <span className="text-[10px] text-muted-foreground px-2">
                  {format(new Date(completedAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Day badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Day {day}</span>
          <span className="text-3xl">{emoji}</span>
        </div>

        {/* Content */}
        <div className="pt-8">
          {/* Source info */}
          <div className="flex items-center gap-2 mb-2">
            <Book className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">The Controllables</p>
          </div>

          <h3 className="font-display font-semibold text-foreground mb-4">
            {chapter}
          </h3>

          {/* Reading text */}
          <p className="text-base leading-relaxed text-foreground/90 font-serif italic">
            "{text}"
          </p>

          {/* Tap hint for completed days */}
          {isCompleted && completedDayData && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Tap to view your reflection
            </p>
          )}
        </div>
      </motion.button>

      {/* Completed Day View Modal */}
      {completedDayData && (
        <CompletedDayView
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          dayData={completedDayData}
          totalCompletedDays={totalCompletedDays}
        />
      )}
    </>
  );
}
