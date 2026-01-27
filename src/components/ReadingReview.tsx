import { motion } from "framer-motion";
import { ChevronLeft, Compass, Smartphone, Download } from "lucide-react";
import { getDayContent } from "@/lib/resetContent";
import { ProgressDots } from "./ProgressDots";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { QuestCard } from "@/components/experience/QuestCard";
import { useState } from "react";

interface ReadingReviewProps {
  dayNumber: number;
  completedDays: number;
  snapshotEmoji?: string;
  snapshotTitle?: string;
  onChangeFocus?: () => void;
  activeQuest?: {
    title: string;
    duration_days: number;
  } | null;
}

export const ReadingReview = ({ 
  dayNumber, 
  completedDays,
  snapshotEmoji,
  snapshotTitle,
  onChangeFocus,
  activeQuest,
}: ReadingReviewProps) => {
  const content = getDayContent(dayNumber);
  const navigate = useNavigate();
  const [showQuestCard, setShowQuestCard] = useState(false);

  // Prepare today's reading for the QuestCard
  const todayReading = {
    controllable: content.controllable,
    emoji: content.emoji,
    quest_action: content.framingLine,
  };

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
          <p className="text-sm text-primary font-medium">✓ Completed</p>
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Return Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
