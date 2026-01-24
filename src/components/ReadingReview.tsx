import { motion } from "framer-motion";
import { ChevronLeft, Check } from "lucide-react";
import { getDayContent } from "@/lib/resetContent";
import { ProgressDots } from "./ProgressDots";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ReadingReviewProps {
  dayNumber: number;
  completedDays: number;
  logDate: string;
}

export const ReadingReview = ({ dayNumber, completedDays, logDate }: ReadingReviewProps) => {
  const content = getDayContent(dayNumber);
  const navigate = useNavigate();

  // Format the log date nicely
  const formattedDate = new Date(logDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Minimal Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Check className="w-3 h-3" />
          Completed
        </span>
      </header>

      {/* Main Content - Mobile-first, paper-like */}
      <main className="flex-1 flex flex-col px-6 pb-8 max-w-sm mx-auto w-full">
        {/* Reading of the Day - Bible app inspired */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-8 -mx-2 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 p-6"
        >
          {/* Source & Chapter */}
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
              {content.reading.source}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {content.reading.chapter}
            </p>
          </div>
          
          {/* Reading Text */}
          <p className="text-xl leading-relaxed text-foreground font-serif">
            "{content.reading.text}"
          </p>

          {/* Day Badge */}
          <div className="absolute top-4 right-4">
            <span className="text-3xl">{content.emoji}</span>
          </div>
        </motion.div>

        {/* Day Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-4"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Day {dayNumber} of 7 · {content.controllable}
          </p>
          <p className="text-sm text-muted-foreground/70">{formattedDate}</p>
        </motion.div>

        {/* Framing Line */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-foreground text-base text-center leading-relaxed mb-6"
        >
          {content.framingLine}
        </motion.p>

        {/* Control + Surrender Lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 mb-8 py-4 border-t border-b border-muted/50"
        >
          <p className="text-sm text-foreground/80">
            <span className="text-muted-foreground">Control:</span> {content.controlLine}
          </p>
          <p className="text-sm text-foreground/80 italic">
            <span className="text-muted-foreground not-italic">Surrender:</span> {content.surrenderLine}
          </p>
        </motion.div>

        {/* Reflection prompt reminder */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-8"
        >
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-medium">Today's reflection:</span> {content.prompt}
          </p>
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Back to Dashboard Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="w-full h-14 text-lg font-medium"
            size="lg"
          >
            Back to Dashboard
          </Button>

          <ProgressDots totalDays={7} currentDay={dayNumber} completedDays={completedDays} />
        </motion.div>
      </main>
    </motion.div>
  );
};
