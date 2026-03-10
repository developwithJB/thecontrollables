import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  Play,
  BookOpen,
  Moon,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Lock,
  PartyPopper,
  Zap,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDayContent, COVENANT_TEXT, COVENANT_CHECKBOX_TEXT } from "@/lib/resetContent";
import { useActionTracking } from "@/hooks/useActionTracking";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getJourneyDailyAction, getJourneyById, type DailyAction } from "@/lib/guidedJourneys";
import { useTGIMWeeklyThreshold } from "@/hooks/useTGIMWeeklyThreshold";
import { getFreeTrialCompletionCopy } from "@/lib/entitlements";


interface TodayActionsProps {
  userId?: string;

  // Reset state
  hasActiveSession: boolean;
  isResetCompleted: boolean;
  isResetExpired: boolean;
  currentDay: number;
  todayResetCompleted: boolean;
  
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
  todayPromiseMade: boolean;
  validatePlanCompleted?: boolean;
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
   onOpenBuild?: () => void;
  
  // Day 7 celebration callback - triggered when all tasks are done on Day 7
  onDay7AllComplete?: () => void;
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
  
  completedDaysCount,
  onStartReset,
  isStartingReset = false,
  isPaid,
  hasUsedFreeReset,
  onUpgrade,
  hasActiveQuest,
  todayTimeLogged,
  pendingPromisesCount,
  todayPromiseMade,
  todayXpEarned,
  buildLastUpdatedAt,
  journeyId,
  journeyTitle,
  onChangeJourney,
  missionTitle,
  onOpenTimeLog,
  onOpenPromises,
   onOpenBuild,
  onDay7AllComplete,
}: TodayActionsProps) {
  const navigate = useNavigate();
  const { trackButtonClick, trackModalAction } = useActionTracking();
  const freeTrialCompletionCopy = getFreeTrialCompletionCopy();
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

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
    // Build sublabel with focus context if available
    const baseSublabel = todayResetCompleted ? "Completed" : todayInfo.chapter;
    const sublabelWithFocus = missionTitle 
      ? `${baseSublabel} · Snapshot Focus: ${missionTitle.length > 20 ? missionTitle.slice(0, 20) + "..." : missionTitle}`
      : baseSublabel;
    actions.push({
      id: "checkin",
      label: `Day ${currentDay}: ${todayInfo.controllable}`,
      sublabel: sublabelWithFocus,
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

  // Confirm last night - sleep, meals, movement & notes
  actions.push({
    id: "time",
    label: todayTimeLogged ? "Last night confirmed" : "Confirm last night",
    sublabel: todayTimeLogged ? "Logged" : "Sleep, meals, movement & notes",
    icon: <Moon className="w-4 h-4" />,
    completed: todayTimeLogged,
    timeEstimate: "2 min",
    action: onOpenTimeLog,
  });

  // Validate today's plan - confirm promises & focus
  if (pendingPromisesCount > 0) {
    actions.push({
      id: "promises",
      label: "Validate today's plan",
      sublabel: "Check promises & confirm your focus",
      icon: <ClipboardCheck className="w-4 h-4" />,
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
    // Day 1: Encourage making a promise
    if (currentDay === 1) {
      actions.push({
        id: "make-promise",
        label: "Make your first promise",
        sublabel: todayPromiseMade ? "Completed" : "Build integrity through kept commitments",
        icon: <Scale className="w-4 h-4" />,
        completed: todayPromiseMade,
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
    
    // Day 5: Free users: suggest making a promise
    if (currentDay === 5 && !isPaid) {
      actions.push({
        id: "make-promise",
        label: "Make a promise to yourself",
        sublabel: todayPromiseMade ? "Completed" : "Build integrity through kept commitments",
        icon: <Scale className="w-4 h-4" />,
        completed: todayPromiseMade,
        timeEstimate: "1 min",
        action: onOpenPromises,
      });
    }
    
    // Day 7: Celebrate completion day
    if (currentDay === 7 && !todayResetCompleted) {
      // Final day encouragement is already in the check-in item
    }
  }

  // Determine primary action - ONLY the daily check-in qualifies
  // Once complete, the "one thing" anchor disappears entirely
  const getPrimaryAction = (): ActionItem | null => {
    const checkin = actions.find((a) => a.id === "checkin");
    if (checkin && !checkin.completed) {
      return checkin;
    }
    return null;
  };

  const primaryAction = getPrimaryAction();
  const secondaryActions = actions.filter((a) => a.id !== primaryAction?.id);

  const completedCount = actions.filter((a) => a.completed).length;
  const totalActions = actions.length;
  const allCompleted = completedCount === totalActions && totalActions > 0;
  const prevAllCompletedRef = useRef(allCompleted);

  // Calculate total time remaining
  const timeRemaining = actions
    .filter((a) => !a.completed)
    .reduce((sum, a) => sum + parseInt(a.timeEstimate), 0);

  // Auto-collapse when all completed and show confetti
  // On Day 7, trigger the celebration callback
  useEffect(() => {
    if (allCompleted && !prevAllCompletedRef.current) {
      // Just became all completed - show celebration
      setShowConfetti(true);
      setIsListCollapsed(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      
      // Day 7 special: trigger the full celebration screen
      if (currentDay === 7 && hasActiveSession && !isResetCompleted && onDay7AllComplete) {
        // Small delay to let the confetti show briefly before navigation
        const celebrationTimer = setTimeout(() => {
          onDay7AllComplete();
        }, 1500);
        return () => {
          clearTimeout(timer);
          clearTimeout(celebrationTimer);
        };
      }
      
      return () => clearTimeout(timer);
    }
    prevAllCompletedRef.current = allCompleted;
  }, [allCompleted, currentDay, hasActiveSession, isResetCompleted, onDay7AllComplete]);

  // Track scroll position to update active dot
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const children = Array.from(container.children) as HTMLElement[];
      if (children.length === 0) return;
      const containerLeft = container.scrollLeft + container.offsetWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      children.forEach((child, i) => {
        const center = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(containerLeft - center);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActiveCardIndex(closest);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [actions.length]);

  // Auto-scroll to next incomplete card after completion
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const nextIncomplete = actions.findIndex(a => !a.completed);
    if (nextIncomplete >= 0) {
      const cards = scrollContainerRef.current.children;
      if (cards[nextIncomplete]) {
        (cards[nextIncomplete] as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [completedCount]);

  // Covenant Dialog component - includes TGIM confirmation moment
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
          {/* Snapshot Start Moment - calm, intentional */}
          <div className="text-center py-2">
            <p className="text-foreground text-sm leading-relaxed">
              You don't need a perfect plan.
              <br />
              Just an honest week.
            </p>
          </div>
          
          <div className="border-t border-border/50 pt-4">
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {COVENANT_TEXT}
            </p>
          </div>
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
                {freeTrialCompletionCopy} Upgrade to continue building proof with unlimited Snapshots.
              </p>
              <Button className="w-full" size="sm" onClick={() => onUpgrade?.()}>
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
                  Snapshot Complete
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

  // Color mapping for action domain accents
  const getActionAccent = (id: string) => {
    switch (id) {
      case "checkin": return "hsl(var(--accent))";
      case "time": return "hsl(var(--wellness))";
      case "promises": return "hsl(var(--habit))";
      case "journey-action": return "hsl(var(--awareness))";
      case "make-promise": return "hsl(var(--habit))";
      case "review-build": return "hsl(var(--perspective))";
      default: return "hsl(var(--accent))";
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
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

        {/* TGIM Weekly Threshold */}
        <TGIMWeeklyBanner userId={userId} />

        {/* All-complete collapsed state */}
        <AnimatePresence mode="wait">
          {allCompleted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-action-card px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">✨</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">All done for today</p>
                  {todayXpEarned > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="text-primary font-medium">+{todayXpEarned} XP</span> earned
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PartyPopper className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground">Today's Actions</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {completedCount} of {totalActions}
                  </span>
                  <span className="text-xs text-muted-foreground">~{timeRemaining} min</span>
                </div>
              </div>

              {/* Swipeable glass card carousel */}
              <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-1 px-1"
              >
                {actions.map((action, idx) => {
                  const isPrimary = primaryAction?.id === action.id && !action.completed;
                  const accentColor = getActionAccent(action.id);

                  return (
                    <AnimatePresence key={action.id} mode="popLayout">
                      {!action.completed ? (
                        <motion.button
                          layout
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                          onClick={action.locked ? undefined : action.action}
                          disabled={action.locked}
                          className={`snap-center shrink-0 w-[82vw] max-w-[320px] ${
                            isPrimary ? "glass-action-card-primary" : "glass-action-card"
                          } p-5 flex flex-col text-left transition-transform active:scale-[0.97] ${
                            action.locked ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          style={{
                            minHeight: "164px",
                          }}
                        >
                          {/* Accent strip */}
                          <div
                            className="w-8 h-1 rounded-full mb-4"
                            style={{ background: accentColor }}
                          />

                          {/* Icon circle */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                            style={{
                              background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                              color: accentColor,
                            }}
                          >
                            {action.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground leading-tight mb-1">
                              {action.label}
                            </p>
                            {action.sublabel && (
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {action.sublabel}
                              </p>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/20">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {action.timeEstimate}
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium text-accent">
                              {isPrimary && <Sparkles className="w-3 h-3" />}
                              {action.completed ? "Done" : isPrimary ? "Start" : "Open"}
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </motion.button>
                      ) : (
                        <motion.div
                          layout
                          initial={{ opacity: 1, scale: 1 }}
                          animate={{ opacity: 0.6, scale: 0.92 }}
                          className="snap-center shrink-0 w-[82vw] max-w-[320px] glass-action-card p-5 flex flex-col"
                          style={{ minHeight: "164px" }}
                        >
                          <div
                            className="w-8 h-1 rounded-full mb-4 opacity-40"
                            style={{ background: accentColor }}
                          />
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-primary/10">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                          <p className="font-semibold text-sm text-muted-foreground line-through">
                            {action.label}
                          </p>
                          <div className="flex-1" />
                          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/10 text-[11px] text-primary font-medium">
                            <Check className="w-3 h-3" />
                            Complete
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  );
                })}
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {actions.map((action, idx) => (
                  <div
                    key={action.id}
                    className={`rounded-full transition-all duration-300 ${
                      idx === activeCardIndex
                        ? "w-4 h-1.5 bg-primary"
                        : action.completed
                          ? "w-1.5 h-1.5 bg-primary/50"
                          : "w-1.5 h-1.5 bg-muted-foreground/25"
                    }`}
                  />
                ))}
              </div>

              {/* XP earned today */}
              {todayXpEarned > 0 && (
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">
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

// TGIM Weekly Banner - subtle weekly ritual microcopy
// Appears once per week on first app open
function TGIMWeeklyBanner({ userId }: { userId?: string }) {
  const { showTGIM, dismiss } = useTGIMWeeklyThreshold(userId);
  
  if (!showTGIM) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onClick={dismiss}
      className="px-4 py-3 border-b border-border/30 bg-muted/20 cursor-pointer"
    >
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="text-foreground font-medium">TGIM.</span>
        <br />
        What kind of week do you want this to be?
      </p>
    </motion.div>
  );
}
