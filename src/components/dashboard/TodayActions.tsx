import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  Play,
  BookOpen,
  Timer,
  Scale,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Lock,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface TodayActionsProps {
  // Reset state
  hasActiveSession: boolean;
  isResetCompleted: boolean;
  isResetExpired: boolean;
  currentDay: number;
  todayResetCompleted: boolean;
  readings?: DailyReading[];
  completedDaysCount: number;
  onStartReset: () => void;
  isStartingReset?: boolean;
  isPaid: boolean;
  hasUsedFreeReset: boolean;
  onUpgrade?: () => void;
  
  // Other actions state
  hasActiveQuest: boolean;
  todayTimeLogged: boolean;
  pendingPromisesCount: number;
  todayXpEarned: number;
  
  // Journey info for display
  journeyTitle?: string;
  onChangeJourney?: () => void;
  
  // Action callbacks for clickable items
  onOpenTimeLog?: () => void;
  onOpenPromises?: () => void;
  onOpenAIGuide?: () => void;
  onOpenBuild?: () => void;
}

interface ActionItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  completed: boolean;
  timeEstimate: string;
  expandable?: boolean;
  action?: () => void;
  locked?: boolean;
}

export function TodayActions({
  hasActiveSession,
  isResetCompleted,
  isResetExpired,
  currentDay,
  todayResetCompleted,
  readings = [],
  completedDaysCount,
  onStartReset,
  isStartingReset = false,
  isPaid,
  hasUsedFreeReset,
  onUpgrade,
  hasActiveQuest,
  todayTimeLogged,
  pendingPromisesCount,
  todayXpEarned,
  journeyTitle,
  onChangeJourney,
  onOpenTimeLog,
  onOpenPromises,
  onOpenAIGuide,
  onOpenBuild,
}: TodayActionsProps) {
  const navigate = useNavigate();
  const { trackButtonClick, trackModalAction } = useActionTracking();
  const [showCovenantDialog, setShowCovenantDialog] = useState(false);
  const [covenantAccepted, setCovenantAccepted] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(
    // Auto-expand check-in if not completed
    hasActiveSession && !todayResetCompleted && !isResetCompleted ? "checkin" : null
  );
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get today's content for display
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

  const handleContinueCheckin = () => {
    trackButtonClick("today_actions_continue_checkin", { day: currentDay });
    navigate("/reset");
  };

  const handleReviewReading = () => {
    trackButtonClick("today_actions_review_reading", { day: currentDay });
    // Navigate to reset page with review mode - shows reading content
    navigate("/reset?mode=review");
  };

  const handleOpenCovenant = () => {
    trackModalAction("covenant_dialog", "open");
    setShowCovenantDialog(true);
  };

  const handleStartReset = () => {
    onStartReset();
    setTimeout(() => navigate("/reset"), 500);
  };

  const toggleExpand = (actionId: string) => {
    setExpandedAction(expandedAction === actionId ? null : actionId);
  };

  // Build action items based on user state
  const actions: ActionItem[] = [];

  // Primary action: Daily check-in / 7-day reset
  if (hasActiveSession && !isResetCompleted && !isResetExpired) {
    const todayInfo = getTodayInfo();
    actions.push({
      id: "checkin",
      label: `Day ${currentDay}: ${todayInfo.controllable}`,
      sublabel: todayResetCompleted ? "Completed" : todayInfo.chapter,
      icon: todayResetCompleted ? (
        <Check className="w-4 h-4" />
      ) : (
        <BookOpen className="w-4 h-4" />
      ),
      completed: todayResetCompleted,
      timeEstimate: "5 min",
      expandable: true,
      action: todayResetCompleted ? handleReviewReading : handleContinueCheckin,
    });
  }

  // Time tracking - always show
  actions.push({
    id: "time",
    label: todayTimeLogged ? "Update your time" : "Log your time",
    icon: <Timer className="w-4 h-4" />,
    completed: todayTimeLogged,
    timeEstimate: "2 min",
    action: onOpenTimeLog,
  });

  // Pending promises - show if any pending
  if (pendingPromisesCount > 0) {
    actions.push({
      id: "promises",
      label: `Review ${pendingPromisesCount} promise${pendingPromisesCount > 1 ? "s" : ""}`,
      icon: <Scale className="w-4 h-4" />,
      completed: false,
      timeEstimate: "3 min",
      action: onOpenPromises,
    });
  }

  // Day-based bonus actions (vary by day to encourage different features)
  // Only add bonus actions if we have an active session
  if (hasActiveSession && !isResetCompleted && !isResetExpired) {
    // Day 1: Encourage making a promise if none pending
    if (currentDay === 1 && pendingPromisesCount === 0) {
      actions.push({
        id: "make-promise",
        label: "Make your first promise",
        sublabel: "Build integrity through kept commitments",
        icon: <Scale className="w-4 h-4" />,
        completed: false,
        timeEstimate: "1 min",
        action: onOpenPromises,
      });
    }
    
    // Day 3: Encourage reviewing your Build (free feature)
    if (currentDay === 3) {
      actions.push({
        id: "review-build",
        label: "Review your Build",
        sublabel: "Check your strengths and growth areas",
        icon: <Sparkles className="w-4 h-4" />,
        completed: false,
        timeEstimate: "2 min",
        action: onOpenBuild,
      });
    }
    
    // Day 5: Encourage AI Guide (paid only) or make another promise (free)
    if (currentDay === 5) {
      if (isPaid) {
        actions.push({
          id: "ask-guide",
          label: "Ask the AI Guide",
          sublabel: "Get personalized guidance",
          icon: <Sparkles className="w-4 h-4" />,
          completed: false,
          timeEstimate: "3 min",
          action: onOpenAIGuide,
        });
      } else if (pendingPromisesCount === 0) {
        // Free users: suggest making a promise instead
        actions.push({
          id: "make-promise",
          label: "Make a promise to yourself",
          sublabel: "Build integrity through kept commitments",
          icon: <Scale className="w-4 h-4" />,
          completed: false,
          timeEstimate: "1 min",
          action: onOpenPromises,
        });
      }
    }
    
    // Day 7: Celebrate completion day
    if (currentDay === 7 && !todayResetCompleted) {
      // Final day encouragement is already in the check-in item
    }
  }

  const completedCount = actions.filter((a) => a.completed).length;
  const totalActions = actions.length;
  const allCompleted = completedCount === totalActions && totalActions > 0;
  const prevAllCompletedRef = useRef(allCompleted);

  // Calculate total time remaining
  const timeRemaining = actions
    .filter((a) => !a.completed)
    .reduce((sum, a) => sum + parseInt(a.timeEstimate), 0);

  // Auto-collapse when all completed and show confetti
  useEffect(() => {
    if (allCompleted && !prevAllCompletedRef.current) {
      // Just became all completed - show celebration
      setShowConfetti(true);
      setIsListCollapsed(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
    prevAllCompletedRef.current = allCompleted;
  }, [allCompleted]);

  // Covenant Dialog component
  const CovenantDialog = () => (
    <Dialog
      open={showCovenantDialog}
      onOpenChange={(open) => {
        setShowCovenantDialog(open);
        if (!open) setCovenantAccepted(false);
      }}
    >
      <DialogContent className="max-w-md p-6">
        <div className="space-y-6">
          <p className="text-foreground leading-relaxed whitespace-pre-line">
            {COVENANT_TEXT}
          </p>
          <div className="flex items-start gap-3">
            <Checkbox
              id="covenant-today"
              checked={covenantAccepted}
              onCheckedChange={(checked) => setCovenantAccepted(checked === true)}
              className="mt-1"
            />
            <label
              htmlFor="covenant-today"
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

  // No active session - show start reset prompt
  if (!hasActiveSession || isResetCompleted || isResetExpired) {
    // Free user who used their reset
    if (hasUsedFreeReset && !isPaid) {
      return (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Today's Actions</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10">
                  <Lock className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Locked</span>
                </div>
              </div>
            </div>

            {/* Upgrade prompt */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                You've completed your free reset. Upgrade to continue with unlimited resets.
              </p>
              <Button className="w-full" size="sm" onClick={onUpgrade}>
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Continue
              </Button>
            </div>
          </motion.div>
        </>
      );
    }

    // Show start reset card
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Today's Actions</h3>
              {isResetCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Check className="w-3 h-3" />
                  Reset Complete
                </span>
              )}
            </div>
          </div>

          {/* Start reset prompt */}
          <div className="p-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <div className="p-2 rounded-lg bg-accent/20">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">
                  {isResetCompleted ? "Start a New Reset" : "Begin Your 7-Day Reset"}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  7 days. 7 readings. One intentional check-in each day.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~5 min daily</span>
                  </div>
                  <Button size="sm" onClick={handleOpenCovenant}>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    {isResetCompleted ? "Start New" : "Begin"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <CovenantDialog />
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-card border border-border overflow-hidden relative"
    >
      {/* Confetti celebration */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: "50%", 
                  y: "50%", 
                  scale: 0,
                  opacity: 1 
                }}
                animate={{ 
                  x: `${20 + Math.random() * 60}%`, 
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0.5],
                  opacity: [1, 1, 0],
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 1.5 + Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className={`absolute w-2 h-2 rounded-full ${
                  i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-accent" : "bg-primary/60"
                }`}
              />
            ))}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <PartyPopper className="w-8 h-8 text-primary" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Today's Actions</h3>
            {journeyTitle && (
              <button
                onClick={onChangeJourney}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group"
              >
                <span>• {journeyTitle}</span>
                <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
          {!allCompleted && timeRemaining > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>~{timeRemaining} min</span>
            </div>
          )}
          {allCompleted && (
            <button
              onClick={() => setIsListCollapsed(!isListCollapsed)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Check className="w-3 h-3" />
              All done
              {isListCollapsed ? (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalActions) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-primary"
        />
      </div>

      {/* Collapsible action list */}
      <AnimatePresence initial={false}>
        {!isListCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* Action list */}
            <div className="divide-y divide-border/50">
              {actions.map((action, index) => (
                <div key={action.id}>
                  {action.expandable ? (
                    <Collapsible
                      open={expandedAction === action.id}
                      onOpenChange={() => toggleExpand(action.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                            action.completed ? "opacity-70" : ""
                          }`}
                        >
                          {/* Status icon */}
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
                              action.completed
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent/20 text-accent"
                            }`}
                          >
                            {action.completed ? <Check className="w-3.5 h-3.5" /> : action.icon}
                          </div>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={`block text-sm ${
                                action.completed
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground font-medium"
                              }`}
                            >
                              {action.label}
                            </span>
                            {action.sublabel && (
                              <span className="block text-xs text-muted-foreground truncate">
                                {action.sublabel}
                              </span>
                            )}
                          </div>

                          {/* Time estimate & expand icon */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!action.completed && (
                              <span className="text-xs text-muted-foreground">{action.timeEstimate}</span>
                            )}
                            {expandedAction === action.id ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <AnimatePresence>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4"
                          >
                            {/* Progress dots */}
                            <div className="flex items-center gap-2 mb-3 pl-9">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                  <div
                                    key={day}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium transition-colors ${
                                      day < currentDay || (day === currentDay && todayResetCompleted)
                                        ? "bg-primary text-primary-foreground"
                                        : day === currentDay
                                        ? "bg-accent text-accent-foreground ring-1 ring-accent ring-offset-1 ring-offset-background"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {day < currentDay || (day === currentDay && todayResetCompleted) ? (
                                      <Check className="w-2.5 h-2.5" />
                                    ) : (
                                      day
                                    )}
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {completedDaysCount}/7
                              </span>
                            </div>

                            {/* Action button */}
                            <div className="pl-9">
                              <Button
                                size="sm"
                                variant={action.completed ? "outline" : "default"}
                                onClick={action.action}
                                className="w-full"
                              >
                                {action.completed ? (
                                  <>
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                    Review Reading
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 mr-1.5" />
                                    Continue Check-in
                                  </>
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <button
                      onClick={() => {
                        if (action.action) {
                          trackButtonClick(`today_action_${action.id}`, { completed: action.completed });
                          action.action();
                        }
                      }}
                      disabled={!action.action}
                      className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                        action.action ? "hover:bg-muted/50 cursor-pointer" : ""
                      } ${action.completed ? "opacity-70" : ""}`}
                    >
                      {/* Status icon */}
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
                          action.completed
                            ? "bg-primary text-primary-foreground"
                            : action.action 
                              ? "bg-accent/20 text-accent"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {action.completed ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          action.icon
                        )}
                      </div>

                      {/* Label and sublabel */}
                      <div className="flex-1 min-w-0">
                        <span
                          className={`block text-sm ${
                            action.completed
                              ? "text-muted-foreground line-through"
                              : action.action
                                ? "text-foreground font-medium"
                                : "text-foreground"
                          }`}
                        >
                          {action.label}
                        </span>
                        {action.sublabel && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {action.sublabel}
                          </span>
                        )}
                      </div>

                      {/* Time estimate and chevron for clickable items */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!action.completed && (
                          <span className="text-xs text-muted-foreground">
                            {action.timeEstimate}
                          </span>
                        )}
                        {action.action && !action.completed && (
                          <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                        )}
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* XP earned today */}
            {todayXpEarned > 0 && (
              <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary font-medium">+{todayXpEarned} XP</span> earned today
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
