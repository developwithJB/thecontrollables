import { useState, useMemo, useCallback } from "react";
import { FocusedActionCard, type FocusedAction } from "./FocusedActionCard";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  UtensilsCrossed,
  CalendarDays,
  BarChart3,
  DollarSign,
  Brain,
  Moon,
  Footprints,
  Apple,
  Battery,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandModeViewProps {
  userId?: string;
  hasActiveSession: boolean;
  todayResetCompleted: boolean;
  todayTimeLogged: boolean;
  todayPromiseMade: boolean;
  pendingPromisesCount: number;
  hasActiveQuest: boolean;
  wellnessLoggedToday: boolean;
  askGuideCompleted: boolean;
  // Inline action data
  pendingPromises?: Array<{ id: string; promise_text: string; promised_at: string }>;
  // Inline action handlers
  onLogTime?: (data: { invested: number; wasted: number; notes?: string }) => Promise<any>;
  onLogWellness?: (sleep: number, movement: number, nutrition: number, notes?: string) => Promise<boolean>;
  onResolvePromise?: (data: { promiseId: string; kept: boolean }) => void;
  onNavigateReset?: () => void;
  // Callbacks (kept for quick actions)
  onOpenReset: () => void;
  onOpenTimeLog: () => void;
  onOpenPromises: () => void;
  onOpenAIGuide: () => void;
  onOpenWellness: () => void;
  onOpenMealPlan: () => void;
  onOpenPlanner: () => void;
  onOpenMoney: () => void;
  onOpenBuild: () => void;
  onSwitchToControl: () => void;
}

// Inline wellness form
const InlineWellnessForm = ({ onLog, onDone }: { onLog: (s: number, m: number, n: number, notes?: string) => Promise<boolean>; onDone: () => void }) => {
  const [sleep, setSleep] = useState(3);
  const [movement, setMovement] = useState(3);
  const [nutrition, setNutrition] = useState(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const ok = await onLog(sleep, movement, nutrition, notes || undefined);
    setLoading(false);
    if (ok) onDone();
  };

  const avg = ((sleep + movement + nutrition) / 3).toFixed(1);
  const LABELS = ["Empty", "Low", "Half", "Good", "Full"];

  const Slider = ({ value, onChange, icon: Icon, label, color }: { value: number; onChange: (v: number) => void; icon: React.ElementType; label: string; color: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", color)} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{LABELS[value - 1]}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button key={level} onClick={() => onChange(level)} className={cn("flex-1 h-6 rounded transition-all", level <= value ? "bg-accent" : "bg-muted hover:bg-muted/80")} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-muted/50">
        <Battery className="w-4 h-4 text-accent" />
        <span className="text-sm font-bold text-foreground">{avg}/5</span>
      </div>
      <Slider value={sleep} onChange={setSleep} icon={Moon} label="Sleep" color="text-blue-400" />
      <Slider value={movement} onChange={setMovement} icon={Footprints} label="Movement" color="text-green-400" />
      <Slider value={nutrition} onChange={setNutrition} icon={Apple} label="Nutrition" color="text-orange-400" />
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." className="min-h-[50px] resize-none text-sm" />
      <Button onClick={handleSubmit} disabled={loading} className="w-full" size="sm">{loading ? "Logging..." : "Log Battery"}</Button>
    </div>
  );
};

// Inline time log form
const InlineTimeLogForm = ({ onLog, onDone }: { onLog: (data: { invested: number; wasted: number; notes?: string }) => Promise<any>; onDone: () => void }) => {
  const [invested, setInvested] = useState("");
  const [wasted, setWasted] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onLog({ invested: Number(invested) || 0, wasted: Number(wasted) || 0, notes: notes || undefined });
    setLoading(false);
    onDone();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Invested (min)</label>
          <Input type="number" value={invested} onChange={(e) => setInvested(e.target.value)} placeholder="60" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Wasted (min)</label>
          <Input type="number" value={wasted} onChange={(e) => setWasted(e.target.value)} placeholder="30" className="h-8 text-sm" />
        </div>
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." className="min-h-[40px] resize-none text-sm" />
      <Button onClick={handleSubmit} disabled={loading || (!invested && !wasted)} className="w-full" size="sm">{loading ? "Logging..." : "Log Time"}</Button>
    </div>
  );
};

// Inline promise review
const InlinePromiseReview = ({ promises, onResolve, onDone }: { promises: Array<{ id: string; promise_text: string; promised_at: string }>; onResolve: (data: { promiseId: string; kept: boolean }) => void; onDone: () => void }) => {
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const handleResolve = (id: string, kept: boolean) => {
    onResolve({ promiseId: id, kept });
    setResolved((prev) => new Set(prev).add(id));
  };

  const remaining = promises.filter((p) => !resolved.has(p.id));

  if (remaining.length === 0) {
    return (
      <div className="text-center py-3">
        <Check className="w-5 h-5 text-perspective mx-auto mb-1" />
        <p className="text-sm text-muted-foreground">All promises reviewed!</p>
        <Button onClick={onDone} size="sm" variant="outline" className="mt-2">Done</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {remaining.map((p) => (
        <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          <p className="flex-1 text-xs text-foreground">{p.promise_text}</p>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleResolve(p.id, true)}>Kept</Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={() => handleResolve(p.id, false)}>Broke</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const CommandModeView = ({
  hasActiveSession,
  todayResetCompleted,
  todayTimeLogged,
  todayPromiseMade,
  pendingPromisesCount,
  hasActiveQuest,
  wellnessLoggedToday,
  askGuideCompleted,
  pendingPromises = [],
  onLogTime,
  onLogWellness,
  onResolvePromise,
  onNavigateReset,
  onOpenReset,
  onOpenTimeLog,
  onOpenPromises,
  onOpenAIGuide,
  onOpenWellness,
  onOpenMealPlan,
  onOpenPlanner,
  onOpenMoney,
  onOpenBuild,
  onSwitchToControl,
}: CommandModeViewProps) => {
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  // Build priority queue of actions
  const allActions: FocusedAction[] = useMemo(() => {
    const actions: FocusedAction[] = [];

    if (hasActiveSession && !todayResetCompleted) {
      actions.push({
        id: "daily-reset",
        type: "checkin",
        title: "Complete Today's Reset",
        subtitle: "Your daily foundation practice. Read, reflect, commit.",
        emoji: "🧱",
        controllable: "awareness",
        xp: 25,
        onAction: onNavigateReset || onOpenReset,
        actionLabel: "Start Reset",
      });
    }

    if (!wellnessLoggedToday) {
      actions.push({
        id: "wellness-log",
        type: "wellness",
        title: "Log Your Fuel",
        subtitle: "How did you sleep, move, and eat today?",
        emoji: "🛡️",
        controllable: "wellness",
        xp: 10,
        onAction: () => {},
        actionLabel: "Log Wellness",
      });
    }

    if (!todayTimeLogged) {
      actions.push({
        id: "time-log",
        type: "time_log",
        title: "Account for Your Time",
        subtitle: "How much time did you invest vs waste today?",
        emoji: "⏳",
        controllable: "habit",
        xp: 10,
        onAction: () => {},
        actionLabel: "Log Time",
      });
    }

    if (pendingPromisesCount > 0) {
      actions.push({
        id: "promise-review",
        type: "promise",
        title: "Review Pending Promises",
        subtitle: `You have ${pendingPromisesCount} promise${pendingPromisesCount > 1 ? "s" : ""} to follow up on.`,
        emoji: "🤝",
        controllable: "perspective",
        xp: 15,
        onAction: () => {},
        actionLabel: "Review Promises",
      });
    }

    if (!askGuideCompleted) {
      actions.push({
        id: "ask-guide",
        type: "guide",
        title: "Ask The Controllables",
        subtitle: "Get guidance on what to focus on today.",
        emoji: "🧭",
        xp: 5,
        onAction: onOpenAIGuide,
        actionLabel: "Open Guide",
      });
    }

    return actions;
  }, [
    hasActiveSession, todayResetCompleted, wellnessLoggedToday,
    todayTimeLogged, pendingPromisesCount, askGuideCompleted,
    onNavigateReset, onOpenReset, onOpenAIGuide,
  ]);

  const activeActions = useMemo(
    () => allActions.filter((a) => !skippedIds.has(a.id) && !completedIds.has(a.id)),
    [allActions, skippedIds, completedIds]
  );

  const currentAction = activeActions[0] || null;

  const handleSkip = useCallback(() => {
    if (currentAction) {
      setExpandedActionId(null);
      setSkippedIds((prev) => new Set(prev).add(currentAction.id));
    }
  }, [currentAction]);

  const handleComplete = useCallback(() => {
    if (currentAction) {
      setExpandedActionId(null);
      setCompletedIds((prev) => new Set(prev).add(currentAction.id));
    }
  }, [currentAction]);

  const handleAction = useCallback(() => {
    if (!currentAction) return;
    
    // Actions that can be done inline
    const inlineActions = ["wellness-log", "time-log", "promise-review"];
    if (inlineActions.includes(currentAction.id)) {
      setExpandedActionId(currentAction.id);
      return;
    }

    // Daily reset navigates away (content is too complex to embed)
    if (currentAction.id === "daily-reset") {
      (onNavigateReset || onOpenReset)();
      return;
    }

    // Ask guide opens overlay
    currentAction.onAction();
    setCompletedIds((prev) => new Set(prev).add(currentAction.id));
  }, [currentAction, onNavigateReset, onOpenReset]);

  const quickActions = [
    { icon: UtensilsCrossed, label: "Eat", onClick: onOpenMealPlan },
    { icon: CalendarDays, label: "Plan", onClick: onOpenPlanner },
    { icon: BarChart3, label: "Review", onClick: onSwitchToControl },
    { icon: DollarSign, label: "Money", onClick: onOpenMoney },
    { icon: Brain, label: "Build", onClick: onOpenBuild },
  ];

  const wrappedAction = currentAction
    ? { ...currentAction, onAction: handleAction }
    : null;

  const isExpanded = expandedActionId === currentAction?.id;

  return (
    <div className="flex flex-col min-h-[60vh] justify-center">
      <FocusedActionCard
        action={wrappedAction}
        queueLength={activeActions.length}
        completedCount={completedIds.size}
        onSkip={handleSkip}
        isExpanded={isExpanded}
      >
        {/* Inline forms */}
        {expandedActionId === "wellness-log" && onLogWellness && (
          <InlineWellnessForm onLog={onLogWellness} onDone={handleComplete} />
        )}
        {expandedActionId === "time-log" && onLogTime && (
          <InlineTimeLogForm onLog={onLogTime} onDone={handleComplete} />
        )}
        {expandedActionId === "promise-review" && onResolvePromise && (
          <InlinePromiseReview promises={pendingPromises} onResolve={onResolvePromise} onDone={handleComplete} />
        )}
      </FocusedActionCard>

      {/* Quick-access bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <p className="text-xs text-muted-foreground text-center mb-3">I want to...</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {quickActions.map(({ icon: Icon, label, onClick }) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              onClick={onClick}
              className="gap-1.5 text-xs"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
