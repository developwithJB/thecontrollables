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
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDayContent, COVENANT_TEXT, COVENANT_CHECKBOX_TEXT } from "@/lib/resetContent";
import { useActionTracking } from "@/hooks/useActionTracking";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getJourneyDailyAction, getJourneyById, type DailyAction } from "@/lib/guidedJourneys";

interface DailyReading {
  id: string;
  day_number: number;
  emoji: string;
  controllable: string;
  reading_chapter: string;
  reading_text: string;
}

interface TodayActionsProps {
  userId?: string;

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

  // Build completion signal (used for Day 3 checklist)
  buildLastUpdatedAt?: string | null;
  
  // Journey info for display
  journeyId?: string;
  journeyTitle?: string;
  onChangeJourney?: () => void;
  
  // Mission info for context
  missionTitle?: string;
  
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
  userId,
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
  buildLastUpdatedAt,
  journeyId,
  journeyTitle,
  onChangeJourney,
  missionTitle,
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
  const [journeyActionCompleted, setJourneyActionCompleted] = useState(false);
  const [showJourneyActionModal, setShowJourneyActionModal] = useState(false);
  const [currentJourneyAction, setCurrentJourneyAction] = useState<DailyAction | null>(null);

  // Day 3 "Review your Build" completion: treat as complete if the user opened it today
  // OR if their build was updated today (e.g., via a re-scan).
  const todayLocal = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
  const reviewBuildStorageKey = userId
    ? `today_actions_review_build_${userId}_${todayLocal}`
    : null;
  const [reviewBuildDoneToday, setReviewBuildDoneToday] = useState(false);

  const buildUpdatedToday = !!buildLastUpdatedAt &&
    new Date(buildLastUpdatedAt).toLocaleDateString("sv-SE") === todayLocal;
  const reviewBuildCompleted = reviewBuildDoneToday || buildUpdatedToday;

  // Journey action completion tracking
  const journeyActionKey = userId && journeyId
    ? `journey_action_${userId}_${journeyId}_day${currentDay}`
    : null;

  useEffect(() => {
    if (!journeyActionKey) return;
    try {
      setJourneyActionCompleted(localStorage.getItem(journeyActionKey) === "1");
    } catch {
      // ignore
    }
  }, [journeyActionKey, currentDay]);

  useEffect(() => {
    if (!reviewBuildStorageKey) return;
    try {
      setReviewBuildDoneToday(localStorage.getItem(reviewBuildStorageKey) === "1");
    } catch {
      // ignore storage errors (private mode, blocked storage)
    }
  }, [reviewBuildStorageKey]);

  useEffect(() => {
    if (!reviewBuildStorageKey) return;
    if (!buildUpdatedToday) return;
    // If a rescan happened today, auto-mark this checklist item done.
    try {
      localStorage.setItem(reviewBuildStorageKey, "1");
    } catch {
      // ignore
    }
    setReviewBuildDoneToday(true);
  }, [buildUpdatedToday, reviewBuildStorageKey]);

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

  const handleReviewBuild = () => {
    if (reviewBuildStorageKey) {
      try {
        localStorage.setItem(reviewBuildStorageKey, "1");
      } catch {
        // ignore
      }
    }
    setReviewBuildDoneToday(true);
    onOpenBuild?.();
  };

  const toggleExpand = (actionId: string) => {
    setExpandedAction(expandedAction === actionId ? null : actionId);
  };

  // Build action items based on user state
  const actions: ActionItem[] = [];

  // Primary action: Daily check-in / 7-day reset
  if (hasActiveSession && !isResetCompleted && !isResetExpired) {
    const todayInfo = getTodayInfo();
    // Build sublabel with mission context if available
    const baseSublabel = todayResetCompleted ? "Completed" : todayInfo.chapter;
    const sublabelWithMission = missionTitle 
      ? `${baseSublabel} · Mission: ${missionTitle.length > 25 ? missionTitle.slice(0, 25) + "..." : missionTitle}`
      : baseSublabel;
    actions.push({
      id: "checkin",
      label: `Day ${currentDay}: ${todayInfo.controllable}`,
      sublabel: sublabelWithMission,
      icon: todayResetCompleted ? (
        <Check className="w-4 h-4" />
      ) : (
        <BookOpen className="w-4 h-4" />
      ),
      completed: todayResetCompleted,
      timeEstimate: "2 min",
      expandable: true,
      action: todayResetCompleted ? handleReviewReading : handleContinueCheckin,
    });
  }

  // Time reflection - always show
  actions.push({
    id: "time",
    label: todayTimeLogged ? "Yesterday reflected" : "Reflect on yesterday",
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

  // Journey-specific daily action - the core habit task for today
  // This is the primary value-add that guides users through the 7 days
  if (hasActiveSession && !isResetCompleted && !isResetExpired && journeyId) {
    const dailyAction = getJourneyDailyAction(journeyId, currentDay);
    if (dailyAction) {
      actions.push({
        id: "journey-action",
        label: dailyAction.task,
        sublabel: journeyActionCompleted ? "Completed" : "Tap to view challenge",
        icon: <Zap className="w-4 h-4" />,
        completed: journeyActionCompleted,
        timeEstimate: "5 min",
        action: () => {
          // Open the modal to show full prompt
          setCurrentJourneyAction(dailyAction);
          setShowJourneyActionModal(true);
        },
      });
    }
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
        completed: reviewBuildCompleted,
        timeEstimate: "2 min",
        action: handleReviewBuild,
      });
    }
    
    // Day 5: Encourage AI Guide (paid only) or make another promise (free)
    if (currentDay === 5) {
      if (isPaid) {
        actions.push({
          id: "ask-guide",
          label: "Ask The Controllables",
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

  // Journey Action Modal - shows full prompt before marking complete
  const JourneyActionModal = () => {
    const journey = journeyId ? getJourneyById(journeyId) : null;
    
    const handleMarkComplete = () => {
      if (journeyActionKey) {
        try {
          localStorage.setItem(journeyActionKey, "1");
          setJourneyActionCompleted(true);
        } catch {
          // ignore
        }
      }
      setShowJourneyActionModal(false);
    };
    
    return (
      <Dialog open={showJourneyActionModal} onOpenChange={setShowJourneyActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{journey?.emoji || "⚡"}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Day {currentDay} Challenge
              </span>
            </div>
            <DialogTitle className="text-xl">
              {currentJourneyAction?.task}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {currentJourneyAction?.description}
            </DialogDescription>
          </DialogHeader>
          
          {journey && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{journey.title}</span>
              <span className="mx-1.5">·</span>
              {journey.tagline}
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={handleMarkComplete}
              className="w-full"
              size="lg"
              disabled={journeyActionCompleted}
            >
              {journeyActionCompleted ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Completed
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
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

          {/* Start snapshot prompt */}
          <div className="p-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <div className="p-2 rounded-lg bg-accent/20">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">
                  {isResetCompleted ? "Start a New Snapshot" : "Begin Your 7-Day Snapshot"}
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-card border border-border overflow-hidden relative"
      >
        {/* Confetti overlay */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="text-4xl"
              >
                🎉
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Today's Actions</h3>
            <div className="flex items-center gap-2">
              {allCompleted ? (
                <motion.span
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  <PartyPopper className="w-3 h-3" />
                  All done!
                </motion.span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  ~{timeRemaining} min
                </span>
              )}
              <button
                onClick={() => setIsListCollapsed(!isListCollapsed)}
                className="p-1 rounded hover:bg-muted/50 transition-colors"
              >
                {isListCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Snapshot Focus moved to GreetingBanner - removed from here */}

        {/* Collapsible action list */}
        <AnimatePresence initial={false}>
          {!isListCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-border/50">
                {actions.map((action) => (
                  <div key={action.id}>
                    {action.expandable ? (
                      <Collapsible
                        open={expandedAction === action.id}
                        onOpenChange={() => toggleExpand(action.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left">
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                action.completed
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {action.completed && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium ${action.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                                >
                                  {action.label}
                                </span>
                              </div>
                              {action.sublabel && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {action.sublabel}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {action.timeEstimate}
                              </span>
                              {action.icon}
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pl-12">
                            <Button
                              size="sm"
                              variant={action.completed ? "outline" : "default"}
                              onClick={action.action}
                              className="w-full sm:w-auto"
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
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <button
                        className={`w-full p-4 flex items-center gap-3 transition-colors text-left ${
                          action.locked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-muted/30 cursor-pointer"
                        }`}
                        onClick={action.locked ? undefined : action.action}
                        disabled={action.locked}
                      >
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            action.completed
                              ? "bg-primary border-primary text-primary-foreground"
                              : action.locked
                                ? "border-muted-foreground/20"
                                : "border-muted-foreground/40"
                          }`}
                        >
                          {action.completed && <Check className="w-3 h-3" />}
                          {action.locked && <Lock className="w-2.5 h-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                action.completed
                                  ? "line-through text-muted-foreground"
                                  : action.locked
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                              }`}
                            >
                              {action.label}
                            </span>
                          </div>
                          {action.sublabel && (
                            <p className="text-xs text-muted-foreground truncate">
                              {action.sublabel}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {action.timeEstimate}
                          </span>
                          {action.icon}
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
      <JourneyActionModal />
    </>
  );
}
