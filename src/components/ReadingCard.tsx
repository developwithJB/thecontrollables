import { motion } from "framer-motion";
import { Book, Lock } from "lucide-react";
import { format } from "date-fns";

interface ReadingCardProps {
  day: number;
  emoji: string;
  controllable: string;
  chapter: string;
  text: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  isLocked?: boolean;
}

export function ReadingCard({ 
  day, 
  emoji, 
  controllable, 
  chapter, 
  text, 
  isCompleted,
  completedAt,
  isLocked = false 
}: ReadingCardProps) {
  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: day * 0.05 }}
        className="relative overflow-hidden rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/20 p-6"
      >
        {/* Locked overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center">
            <Lock className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Complete Day {day} to unlock</p>
          </div>
        </div>

        {/* Day badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-30">
          <span className="text-xs text-muted-foreground">Day {day}</span>
          <span className="text-3xl">{emoji}</span>
        </div>

        {/* Blurred content preview */}
        <div className="pt-8 opacity-30">
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: day * 0.05 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 border p-6"
    >
      {/* Completed indicator with timestamp */}
      {isCompleted && (
        <div className="absolute top-4 left-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-primary bg-primary/20 px-2 py-1 rounded-full">
              ✓ Unlocked
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
      </div>
    </motion.div>
  );
}
