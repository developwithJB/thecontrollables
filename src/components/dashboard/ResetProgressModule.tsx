import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Lock, Check, Play, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getDayContent, RESET_DAYS, COVENANT_TEXT, COVENANT_CHECKBOX_TEXT } from "@/lib/resetContent";
import { CompletedDayView } from "@/components/CompletedDayView";

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
  currentDay: number;
  completedDays: CompletedDay[];
  todayAlreadyCompleted: boolean;
  readings?: DailyReading[];
  onStartReset?: () => void;
  isStartingReset?: boolean;
}

export function ResetProgressModule({
  hasActiveSession,
  isCompleted,
  currentDay,
  completedDays,
  todayAlreadyCompleted,
  readings = [],
  onStartReset,
  isStartingReset = false,
}: ResetProgressModuleProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CompletedDay | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [showCovenantDialog, setShowCovenantDialog] = useState(false);
  const [covenantAccepted, setCovenantAccepted] = useState(false);

  const todayContent = hasActiveSession && !isCompleted ? getDayContent(currentDay) : null;

  const handleViewDay = (dayData: CompletedDay) => {
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
    if (onStartReset) {
      onStartReset();
      // Navigate to reset page after starting
      setTimeout(() => {
        navigate("/reset");
      }, 500);
    }
  };

  // No active session - show start prompt with covenant dialog
  if (!hasActiveSession) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-xl bg-card border"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">7-Day Reset</p>
              <p className="text-xs text-muted-foreground">Re-enter the game</p>
            </div>
            <Button size="sm" onClick={() => setShowCovenantDialog(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Reset
            </Button>
          </div>
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

  // Completed session - show restart option
  if (isCompleted) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-xl bg-card border"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <p className="text-sm font-medium text-foreground">Reset Complete</p>
                <p className="text-xs text-muted-foreground">Well played</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowCovenantDialog(true)}>
              New Reset
            </Button>
          </div>
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

  // Active session - show progress with expandable days
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-xl bg-card border overflow-hidden"
    >
      {/* Header - Current status */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg shrink-0">{todayContent?.emoji}</span>
            <div className="min-w-0">
              {todayAlreadyCompleted ? (
                <>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    Day {currentDay} complete
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {todayContent?.controllable} — Return tomorrow
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Day {currentDay}: {todayContent?.controllable}
                  </p>
                  <p className="text-xs text-muted-foreground">Quest action waiting</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!todayAlreadyCompleted && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/reset");
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

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-3">
          {RESET_DAYS.map((_, idx) => {
            const dayNum = idx + 1;
            const status = getDayStatus(dayNum);
            return (
              <div
                key={dayNum}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  status === "completed"
                    ? "bg-primary"
                    : status === "current"
                    ? todayAlreadyCompleted
                      ? "bg-primary"
                      : "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Expandable day list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t overflow-hidden"
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
