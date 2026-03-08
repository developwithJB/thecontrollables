import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Compass, Smartphone, Download, Sparkles } from "lucide-react";
import { getDayContent } from "@/lib/resetContent";
import { ProgressDots } from "./ProgressDots";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { QuestCard } from "@/components/experience/QuestCard";
import { supabase } from "@/integrations/supabase/client";

const DAY_CONTROLLABLE_META: Record<number, { emoji: string; name: string }> = {
  1: { emoji: "🦉", name: "Awareness" },
  2: { emoji: "🐢", name: "Perspective" },
  3: { emoji: "🦈", name: "Habit" },
  4: { emoji: "🛰️", name: "Wellness" },
  5: { emoji: "🚀", name: "Environment" },
  6: { emoji: "🦈", name: "Habit" },
  7: { emoji: "🦉", name: "Awareness" },
};

interface ResetDayProps {
  dayNumber: number;
  completedDays: number;
  logDate: string;
  onComplete: (data: { reflection?: string; userInput?: string }) => void;
  isCompleting: boolean;
  snapshotEmoji?: string;
  snapshotTitle?: string;
  onChangeFocus?: () => void;
  activeQuest?: {
    title: string;
    duration_days: number;
  } | null;
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
  activeQuest,
}: ResetDayProps) => {
  const content = getDayContent(dayNumber);
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [showQuestCard, setShowQuestCard] = useState(false);
  const [aiReflection, setAiReflection] = useState<{ message: string; emoji: string; name: string } | null>(null);
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Prepare today's reading for the QuestCard
  const todayReading = {
    controllable: content.controllable,
    emoji: content.emoji,
    quest_action: content.framingLine,
  };

  const fetchAIReflection = async (reflectionText: string) => {
    setIsLoadingReflection(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-reflect", {
        body: { reflection: reflectionText, dayNumber },
      });
      if (!error && data?.message) {
        setAiReflection({ message: data.message, emoji: data.emoji, name: data.name });
      }
    } catch {
      // Silently fail — AI reflection is a bonus, not critical
    } finally {
      setIsLoadingReflection(false);
    }
  };

  const handleSubmit = () => {
    const inputValue = content.inputType === "rating_1_5" ? String(rating) : userInput.trim();
    setHasSubmitted(true);
    // Fire AI reflection in background (non-blocking)
    if (inputValue && inputValue.length > 3) {
      fetchAIReflection(inputValue);
    }
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
            <div className="relative">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.slice(0, 1000))}
                placeholder="Write here..."
                className="min-h-[80px] max-h-[120px] resize-none bg-muted/30 border-muted text-base pb-6"
                maxLength={1000}
                data-testid="reset-day-reflection-input"
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {userInput.length}/1000
              </span>
            </div>
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
          {/* Snapshot Focus row - clickable to edit */}
          {snapshotTitle && (
            <button
              onClick={onChangeFocus}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              title="Click to change your focus"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{snapshotEmoji || "🎯"}</span>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Focus</span>
                  <span className="text-sm font-medium text-foreground">{snapshotTitle}</span>
                </div>
              </div>
              <Compass className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

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

          {/* Lock Screen / Print Card Button */}
          <button
            onClick={() => setShowQuestCard(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Download Focus Card</span>
            <Download className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </main>

      {/* Quest Card Modal */}
      <Dialog open={showQuestCard} onOpenChange={setShowQuestCard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-display">Your Focus Card</DialogTitle>
          </DialogHeader>
          <QuestCard
            activeQuest={activeQuest}
            currentResetDay={dayNumber}
            todayReading={todayReading}
            onClose={() => setShowQuestCard(false)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
