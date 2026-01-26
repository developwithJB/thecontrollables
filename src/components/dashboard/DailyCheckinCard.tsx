import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Clock, Play, Sparkles, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getDayContent, COVENANT_TEXT, COVENANT_CHECKBOX_TEXT } from "@/lib/resetContent";
import { useActionTracking } from "@/hooks/useActionTracking";

interface DailyReading {
  id: string;
  day_number: number;
  emoji: string;
  controllable: string;
  reading_chapter: string;
  reading_text: string;
}

interface DailyCheckinCardProps {
  hasActiveSession: boolean;
  isCompleted: boolean;
  isExpired: boolean;
  currentDay: number;
  todayAlreadyCompleted: boolean;
  readings?: DailyReading[];
  completedDaysCount: number;
  onStartReset: () => void;
  isStartingReset?: boolean;
  isPaid: boolean;
  hasUsedFreeReset: boolean;
  onUpgrade?: () => void;
}

export function DailyCheckinCard({
  hasActiveSession,
  isCompleted,
  isExpired,
  currentDay,
  todayAlreadyCompleted,
  readings = [],
  completedDaysCount,
  onStartReset,
  isStartingReset = false,
  isPaid,
  hasUsedFreeReset,
  onUpgrade,
}: DailyCheckinCardProps) {
  const navigate = useNavigate();
  const { trackButtonClick, trackModalAction } = useActionTracking();
  const [showCovenantDialog, setShowCovenantDialog] = useState(false);
  const [covenantAccepted, setCovenantAccepted] = useState(false);

  // Get today's content
  const getTodayInfo = () => {
    const dbReading = readings.find((r) => r.day_number === currentDay);
    if (dbReading) {
      return {
        emoji: dbReading.emoji,
        controllable: dbReading.controllable,
        chapter: dbReading.reading_chapter,
      };
    }
    const staticContent = getDayContent(currentDay);
    return {
      emoji: staticContent.emoji,
      controllable: staticContent.controllable,
      chapter: staticContent.reading.chapter,
    };
  };

  const handleContinue = () => {
    trackButtonClick("daily_checkin_continue", { day: currentDay });
    navigate("/reset");
  };

  const handleOpenCovenant = () => {
    trackModalAction("covenant_dialog", "open");
    setShowCovenantDialog(true);
  };

  const handleStartReset = () => {
    onStartReset();
    setTimeout(() => navigate("/reset"), 500);
  };

  // Covenant Dialog component
  const CovenantDialog = () => (
    <Dialog open={showCovenantDialog} onOpenChange={(open) => {
      setShowCovenantDialog(open);
      if (!open) setCovenantAccepted(false);
    }}>
      <DialogContent className="max-w-md p-6">
        <div className="space-y-6">
          <p className="text-foreground leading-relaxed whitespace-pre-line">
            {COVENANT_TEXT}
          </p>
          <div className="flex items-start gap-3">
            <Checkbox
              id="covenant-daily"
              checked={covenantAccepted}
              onCheckedChange={(checked) => setCovenantAccepted(checked === true)}
              className="mt-1"
            />
            <label
              htmlFor="covenant-daily"
              className="text-foreground text-sm leading-relaxed cursor-pointer select-none"
            >
              {COVENANT_CHECKBOX_TEXT}
            </label>
          </div>
          <Button
            onClick={handleStartReset}
            disabled={!covenantAccepted || isStartingReset}
            className="w-full"
            size="lg"
          >
            {isStartingReset ? "Beginning..." : "Begin My 7 Days"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // No active session - prompt to begin
  if (!hasActiveSession) {
    // Free user who used their reset
    if (hasUsedFreeReset) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/20">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Daily Check-in</p>
                <h3 className="font-display text-lg font-semibold text-foreground">Unlock More Resets</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You've completed your free reset. Upgrade to continue your journey with unlimited resets.
            </p>
            <Button className="w-full" onClick={onUpgrade}>
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Continue
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 via-card to-card border border-accent/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50" />
          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-accent/20">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Start Your Journey</p>
                <h3 className="font-display text-lg font-semibold text-foreground">7-Day Snapshot</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              7 days. 7 readings. One intentional check-in each day.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Clock className="w-3.5 h-3.5" />
              <span>~5 min daily</span>
            </div>
            <Button className="w-full" onClick={handleOpenCovenant}>
              <Play className="w-4 h-4 mr-2" />
              Begin Your Snapshot
            </Button>
          </div>
        </motion.div>
        <CovenantDialog />
      </>
    );
  }

  // Session expired
  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/5 via-card to-card border border-amber-500/20"
      >
        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Incomplete</p>
              <h3 className="font-display text-lg font-semibold text-foreground">Reset Expired</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={`w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-medium ${
                    day <= completedDaysCount
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {day <= completedDaysCount ? <Check className="w-3 h-3" /> : day}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{completedDaysCount}/7 completed</span>
          </div>
          
          <Button className="w-full" variant="outline" onClick={onStartReset}>
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  }

  // Completed - celebration state
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30"
      >
        {/* Celebration particles */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className="absolute top-4 left-1/4 w-2 h-2 rounded-full bg-primary/40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="absolute top-8 right-1/4 w-1.5 h-1.5 rounded-full bg-accent/40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute top-12 left-1/3 w-2 h-2 rounded-full bg-primary/30"
          />
        </div>
        
        <div className="relative p-6">
          <div className="text-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-3"
            >
              <Check className="w-8 h-8 text-primary" />
            </motion.div>
            <h3 className="font-display text-xl font-bold text-foreground">Snapshot Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">Well played. You finished all 7 days.</p>
          </div>
          
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <motion.div
                key={day}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + day * 0.05 }}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-primary-foreground" />
              </motion.div>
            ))}
          </div>
          
          <Button className="w-full" variant="outline" onClick={onStartReset}>
            <Sparkles className="w-4 h-4 mr-2" />
            Start New Reset
          </Button>
        </div>
      </motion.div>
    );
  }

  // Active session with today's check-in
  const todayInfo = getTodayInfo();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
      
      <div className="relative p-6">
        {/* Header with status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${todayAlreadyCompleted ? "bg-primary/20" : "bg-accent/20"}`}>
              {todayAlreadyCompleted ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <BookOpen className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Daily Check-in</p>
              <h3 className="font-display text-lg font-semibold text-foreground">Day {currentDay}</h3>
            </div>
          </div>
          
          {/* Status badge */}
          {todayAlreadyCompleted ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Check className="w-3 h-3" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
              <Clock className="w-3 h-3" />
              ~5 min
            </span>
          )}
        </div>

        {/* Today's content preview */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/50 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{todayInfo.emoji}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground mb-1">{todayInfo.controllable}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{todayInfo.chapter}</p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  day < currentDay || (day === currentDay && todayAlreadyCompleted)
                    ? "bg-primary text-primary-foreground"
                    : day === currentDay
                    ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {day < currentDay || (day === currentDay && todayAlreadyCompleted) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  day
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{completedDaysCount}/7</span>
        </div>

        {/* Action button */}
        {todayAlreadyCompleted ? (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleContinue}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Review Today's Reading
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={handleContinue}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Today's Check-in
          </Button>
        )}
      </div>
    </motion.div>
  );
}
