import { motion } from "framer-motion";
import { Book } from "lucide-react";

interface ReadingCardProps {
  day: number;
  emoji: string;
  controllable: string;
  chapter: string;
  text: string;
  isCompleted?: boolean;
}

export function ReadingCard({ day, emoji, controllable, chapter, text, isCompleted }: ReadingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: day * 0.05 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 border p-6"
    >
      {/* Completed indicator */}
      {isCompleted && (
        <div className="absolute top-4 left-4">
          <span className="text-xs font-medium text-primary bg-primary/20 px-2 py-1 rounded-full">
            ✓ Completed
          </span>
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
