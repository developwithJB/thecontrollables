import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Compass } from "lucide-react";
import { getDayContent } from "@/lib/resetContent";
import { ProgressDots } from "./ProgressDots";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

interface ResetDayProps {
  dayNumber: number;
  completedDays: number;
  logDate: string; // The real calendar date for this day
  onComplete: (data: { reflection?: string; userInput?: string }) => void;
  isCompleting: boolean;
  snapshotEmoji?: string;
  snapshotTitle?: string;
  onChangeFocus?: () => void;
}

export const ResetDay = ({ 
  dayNumber, 
  completedDays, 
  logDate, 
  onComplete, 
  isCompleting,
  snapshotEmoji,
  snapshotTitle,
  onChangeFocus,
}: ResetDayProps) => {
  const content = getDayContent(dayNumber);
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const handleSubmit = () => {
    const inputValue = content.inputType === "rating_1_5" ? String(rating) : userInput.trim();
    onComplete({
      userInput: inputValue || undefined,
    });
  };

  const isValid = content.inputType === "rating_1_5" ? rating !== null : userInput.trim().length > 0;

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
      {/* Minimal Header with Focus indicator */}
      <header className="px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {/* Snapshot Focus indicator - clickable to change */}
        {snapshotTitle && (
          <button
            onClick={onChangeFocus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors text-sm"
            title={`Current Focus: ${snapshotTitle} - Click to change`}
          >
            <span>{snapshotEmoji || "🎯"}</span>
            <span className="text-muted-foreground max-w-[120px] truncate">{snapshotTitle}</span>
            <Compass className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
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

        {/* Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-6"
        >
          <p className="text-foreground/90 text-base leading-relaxed">
            {content.prompt}
          </p>

          {/* Input based on type */}
          {content.inputType === "rating_1_5" ? (
            <div className="flex justify-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setRating(num)}
                  className={`w-12 h-12 rounded-full text-lg font-medium transition-all ${
                    rating === num
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Write here..."
              className="min-h-[80px] max-h-[120px] resize-none bg-muted/30 border-muted text-base"
              data-testid="reset-day-reflection-input"
            />
          )}
        </motion.div>

        {/* Control + Surrender Lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mb-8 py-4 border-t border-b border-muted/50"
        >
          <p className="text-sm text-foreground/80">
            <span className="text-muted-foreground">Control:</span> {content.controlLine}
          </p>
          <p className="text-sm text-foreground/80 italic">
            <span className="text-muted-foreground not-italic">Surrender:</span> {content.surrenderLine}
          </p>
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Complete Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <Button
            onClick={handleSubmit}
            disabled={isCompleting || !isValid}
            className="w-full h-14 text-lg font-medium"
            size="lg"
            data-testid="reset-day-complete-button"
          >
            {isCompleting ? "Saving..." : content.completionButtonText}
          </Button>

          <ProgressDots totalDays={7} currentDay={dayNumber} completedDays={completedDays} />
        </motion.div>
      </main>
    </motion.div>
  );
};
