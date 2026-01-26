import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ChevronRight, Lock, Check, Play, RefreshCw, Eye, Sparkles, Target, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getDayContent, RESET_DAYS, COVENANT_TEXT, COVENANT_CHECKBOX_TEXT } from "@/lib/resetContent";
import { CompletedDayView } from "@/components/CompletedDayView";
import { useActionTracking } from "@/hooks/useActionTracking";
import { getPricing } from "@/hooks/useEntitlements";
import { getJourneyById, getQuestTitleFromJourney } from "@/lib/guidedJourneys";

interface CompletedDay {
  day_number: number;
  reflection?: string | null;
  completed_at?: string | null;
  commitment?: string | null;
  release?: string | null;
}

interface DailyReading {
  id: string;
  day_number: number;
  emoji: string;
  controllable: string;
  reading_chapter: string;
  reading_text: string;
}

interface ResetProgressModuleProps {
  hasActiveSession: boolean;
  isCompleted: boolean;
  isExpired?: boolean;
  currentDay: number;
  completedDays: CompletedDay[];
  todayAlreadyCompleted: boolean;
  readings?: DailyReading[];
  onStartReset?: (isPaid: boolean) => void;
  isStartingReset?: boolean;
  isPaid?: boolean;
  totalSessionCount?: number;
  onUpgrade?: () => void;
  // Journey integration
  currentJourneyId?: string | null;
  onSwitchJourney?: () => void;
  // Last completed session info
  lastCompletedAt?: string | null;
}

// Helper to calculate days since a date
function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Simple Focus display for the Reset - shows the Journey as the Reset's focus
function JourneyDisplay({ 
  journeyId, 
  onSwitchJourney,
}: { 
  journeyId: string | null | undefined;
  onSwitchJourney?: () => void;
}) {
  const journey = journeyId ? getJourneyById(journeyId) : null;
  
  // If no journey selected, show prompt to select one
  if (!journey) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="mt-4 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30"
      >
        <button
          onClick={onSwitchJourney}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="p-1.5 rounded bg-muted">
            <Compass className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Select a Focus</p>
            <p className="text-xs text-muted-foreground">Choose a direction for this reset</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>
    );
  }

  // Make the entire container clickable with clear hover states
  if (onSwitchJourney) {
    return (
      <motion.button
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        onClick={onSwitchJourney}
        className="mt-4 w-full p-3 rounded-lg bg-primary/5 border border-primary/20 
                   hover:bg-primary/10 hover:border-primary/40 transition-all 
                   group cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-primary/20 group-hover:bg-primary/30 transition-colors">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Focus</span>
            <p className="text-sm font-medium text-foreground truncate">
              {journey.emoji} {journey.title}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </motion.button>
    );
  }

  // Non-interactive version (no onSwitchJourney)
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20"
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-primary/20">
          <Compass className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">Focus</span>
          <p className="text-sm font-medium text-foreground truncate">
            {journey.emoji} {journey.title}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ResetProgressModule({
  hasActiveSession,
  isCompleted,
  isExpired = false,
  currentDay,
  completedDays,
  todayAlreadyCompleted,
  readings = [],
  onStartReset,
  isStartingReset = false,
  isPaid = false,
  totalSessionCount = 0,
  onUpgrade,
  currentJourneyId,
  onSwitchJourney,
  lastCompletedAt,
}: ResetProgressModuleProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CompletedDay | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [showCovenantDialog, setShowCovenantDialog] = useState(false);
  const [covenantAccepted, setCovenantAccepted] = useState(false);

  const { trackButtonClick, trackModalAction, trackResetAction } = useActionTracking();

  // Check if free user has used their one free reset
  const hasUsedFreeReset = !isPaid && totalSessionCount >= 1;
  const pricing = getPricing();

  const todayContent = hasActiveSession && !isCompleted ? getDayContent(currentDay) : null;

  const handleViewDay = (dayData: CompletedDay) => {
    trackModalAction("completed_day_view", "open");
    setSelectedDay(dayData);
    setIsViewOpen(true);
  };

  // Get day content - prefer database readings if available
  const getDayInfo = (dayNum: number) => {
    const dbReading = readings.find((r) => r.day_number === dayNum);
    if (dbReading) {
      return {
        emoji: dbReading.emoji,
        controllable: dbReading.controllable,
        chapter: dbReading.reading_chapter,
        text: dbReading.reading_text,
      };
    }
    const staticContent = getDayContent(dayNum);
    return {
      emoji: staticContent.emoji,
      controllable: staticContent.controllable,
      chapter: staticContent.reading.chapter,
      text: staticContent.reading.text,
    };
  };

  const isDayCompleted = (dayNum: number) => {
    return completedDays.some((d) => d.day_number === dayNum);
  };

  const getDayStatus = (dayNum: number): "completed" | "current" | "locked" => {
    if (isDayCompleted(dayNum)) return "completed";
    if (dayNum === currentDay) return "current";
    return "locked";
  };

  const handleStartReset = () => {
    trackResetAction("start");
    if (onStartReset) {
      onStartReset(isPaid);
      // Navigate to reset page after starting
      setTimeout(() => {
        navigate("/reset");
      }, 500);
    }
  };

  const handleContinueReset = () => {
    trackButtonClick("reset_continue", { day: currentDay });
    navigate("/reset");
  };

  const handleOpenCovenantDialog = () => {
    trackModalAction("covenant_dialog", "open");
    setShowCovenantDialog(true);
  };

  const handleExpandToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (newState) {
      trackModalAction("reset_days_expanded", "open");
    }
  };

  // Calculate progress
  const progressPercent = (completedDays.length / 7) * 100;
  const daysSinceLastReset = daysSince(lastCompletedAt);

  // No active session - show start prompt (Quest-like styling)
  if (!hasActiveSession) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-card border border-dashed border-muted-foreground/30"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-muted">
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">7-Day Snapshot</h3>
              <p className="text-sm text-muted-foreground">Capture this week</p>
            </div>
          </div>

          {/* Days since last reset (if applicable) */}
          {daysSinceLastReset !== null && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-muted">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{daysSinceLastReset} days</span> since your last reset
              </p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground mb-4">
            Your Foundation builds momentum.{" "}
            <span className="text-foreground/70">Your Mission gives you direction.</span>
          </p>
          
          <Button className="w-full" onClick={handleOpenCovenantDialog}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Begin Your Foundation
          </Button>
        </motion.div>

        {/* Covenant Dialog */}
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
                  id="covenant-dialog"
                  checked={covenantAccepted}
                  onCheckedChange={(checked) => setCovenantAccepted(checked === true)}
                  className="mt-1"
                />
                <label
                  htmlFor="covenant-dialog"
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
      </>
    );
  }

  // Session expired (past day 7 without completing all days)
  if (isExpired) {
    // Free user who has used their one free reset - show upgrade prompt
    if (hasUsedFreeReset) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-card border border-amber-500/30"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <RefreshCw className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">7-Day Foundation</h3>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Incomplete • {completedDays.length} of 7 days
              </p>
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Free foundation used</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to try again and unlock certificate downloads.
                </p>
              </div>
            </div>
          </div>
          
          <Button className="w-full" onClick={onUpgrade}>
            <Sparkles className="w-4 h-4 mr-2" />
            Unlock for ${pricing.amount}
          </Button>
        </motion.div>
      );
    }

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-card border border-amber-500/30"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <RefreshCw className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-foreground">7-Day Foundation</h3>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Incomplete • {completedDays.length} of 7 days
              </p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Complete all 7 days in a row to earn your certificate.
          </p>
          
          <Button className="w-full" onClick={handleOpenCovenantDialog}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </motion.div>

        {/* Covenant Dialog for retry */}
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
                  id="covenant-dialog-retry"
                  checked={covenantAccepted}
                  onCheckedChange={(checked) => setCovenantAccepted(checked === true)}
                  className="mt-1"
                />
                <label
                  htmlFor="covenant-dialog-retry"
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
      </>
    );
  }

  // Completed session - show "days since" and option to start new
  if (isCompleted) {
    // Free user who has used their one free reset - show upgrade prompt
    if (hasUsedFreeReset) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Check className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">7-Day Foundation</h3>
              <p className="text-sm text-primary">Complete • Well played</p>
            </div>
          </div>

          {/* Days since last foundation */}
          {daysSinceLastReset !== null && (
            <div className="mb-4 p-3 rounded-lg bg-background/50 border border-primary/10">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{daysSinceLastReset} days</span> since you completed your foundation
              </p>
            </div>
          )}
          
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Free foundation complete</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to download your certificate and start new foundations.
                </p>
              </div>
            </div>
          </div>
          
          <Button className="w-full" onClick={onUpgrade}>
            <Sparkles className="w-4 h-4 mr-2" />
            Unlock for ${pricing.amount}
          </Button>
        </motion.div>
      );
    }

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">7-Day Foundation</p>
                <h3 className="font-display font-semibold text-foreground text-lg">Complete</h3>
              </div>
            </div>
          </div>

          {/* Days since last foundation - prominent display */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-foreground">
                {daysSinceLastReset ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">days since foundation</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your Mission continues. Start a new foundation when ready.
            </p>
          </div>

          <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={handleOpenCovenantDialog}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Start New Foundation
          </Button>
        </motion.div>

        {/* Covenant Dialog for new reset */}
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
                  id="covenant-dialog-restart"
                  checked={covenantAccepted}
                  onCheckedChange={(checked) => setCovenantAccepted(checked === true)}
                  className="mt-1"
                />
                <label
                  htmlFor="covenant-dialog-restart"
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
      </>
    );
  }

  // Active session - show progress (Quest-like styling)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={handleExpandToggle}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">7-Day Foundation</p>
              {todayAlreadyCompleted ? (
                <h3 className="font-display font-semibold text-foreground text-lg flex items-center gap-2">
                  Day {currentDay} Complete
                  <Check className="w-4 h-4 text-primary" />
                </h3>
              ) : (
                <h3 className="font-display font-semibold text-foreground text-lg">
                  Day {currentDay}: {todayContent?.controllable}
                </h3>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!todayAlreadyCompleted && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinueReset();
                }}
              >
                Continue
              </Button>
            )}
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {7 - currentDay + (todayAlreadyCompleted ? 0 : 1)} days remaining
          </span>
          <span className="text-primary font-medium">
            {completedDays.length}/7 complete
          </span>
        </div>

        {/* Foundation name display - simplified, no Focus selector */}
        {currentJourneyId && (
          <div className="mt-3 text-xs text-muted-foreground">
            Foundation Focus: {getJourneyById(currentJourneyId)?.emoji} {getJourneyById(currentJourneyId)?.title}
          </div>
        )}
      </div>

      {/* Expandable day list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-primary/10 overflow-hidden"
          >
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {RESET_DAYS.map((_, idx) => {
                const dayNum = idx + 1;
                const status = getDayStatus(dayNum);
                const dayInfo = getDayInfo(dayNum);
                const completedData = completedDays.find((d) => d.day_number === dayNum);

                return (
                  <motion.button
                    key={dayNum}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => status === "completed" && completedData && handleViewDay(completedData)}
                    disabled={status !== "completed"}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      status === "completed"
                        ? "bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer"
                        : status === "current"
                        ? "bg-muted/50 border-primary/30 cursor-default"
                        : "bg-muted/20 border-muted/50 opacity-60 cursor-default"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          status === "completed"
                            ? "bg-primary text-primary-foreground"
                            : status === "current"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status === "completed" ? (
                          <Check className="w-4 h-4" />
                        ) : status === "current" ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{dayInfo.emoji}</span>
                            <h4 className="text-sm font-medium text-foreground">
                              Day {dayNum}: {dayInfo.controllable}
                            </h4>
                          </div>
                          {status === "completed" && (
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>

                        {status === "completed" ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            {completedData?.completed_at
                              ? `Completed ${new Date(completedData.completed_at).toLocaleDateString()}`
                              : "Completed"} · Tap to view
                          </p>
                        ) : status === "current" ? (
                          <p className="text-xs text-primary mt-1">
                            {todayAlreadyCompleted ? "Done for today" : "Available now"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Unlocks on Day {dayNum}
                          </p>
                        )}

                        {/* Show preview text for locked days */}
                        {status === "locked" && (
                          <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">
                            {dayInfo.text.substring(0, 100)}...
                          </p>
                        )}

                        {/* Show reflection preview for completed days if available */}
                        {status === "completed" && completedData?.reflection && (
                          <p className="text-xs text-foreground/80 mt-2 italic border-l-2 border-primary/30 pl-2 line-clamp-1">
                            "{completedData.reflection}"
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed Day View Modal */}
      <CompletedDayView
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        dayData={selectedDay}
        totalCompletedDays={completedDays.length}
      />
    </motion.div>
  );
}
