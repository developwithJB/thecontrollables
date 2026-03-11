import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  Activity,
  Utensils,
  BookOpen,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useDailyOSPlan,
  useUpdateDailyOSInteraction,
  useRefreshDailyOS,
  type OSPlanItem,
  type InteractionState,
} from "@/hooks/useDailyOS";
import { useAnalytics } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

interface DailyOSCardProps {
  userId: string | null;
  isPaid: boolean;
  isTrialing?: boolean;
  hasActiveSnapshot: boolean;
  onUpgrade?: () => void;
}

const SOURCE_COLORS: Record<string, string> = {
  Snapshot: "bg-primary/10 text-primary",
  Planner: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Promise: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Wellness: "bg-green-500/10 text-green-600 dark:text-green-400",
  Build: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Guide: "bg-muted text-muted-foreground",
};

const ENERGY_COLORS: Record<string, string> = {
  high: "text-destructive",
  medium: "text-amber-500",
  low: "text-green-500",
};

const QUICK_ACTION_CONFIG = [
  { key: "/planner", label: "Plan", icon: CalendarDays },
  { key: "/reset", label: "Snapshot", icon: BookOpen },
  { key: "wellness", label: "Wellness", icon: Activity },
  { key: "meals", label: "Meals", icon: Utensils },
  { key: "promise", label: "Promises", icon: ShieldCheck },
];

function PriorityItem({
  item,
  index,
  interaction,
  onComplete,
  onSnooze,
  onDismiss,
}: {
  item: OSPlanItem;
  index: number;
  interaction?: InteractionState;
  onComplete: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const isDone = interaction === "done";
  const isSnoozed = interaction === "snoozed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        isDone
          ? "bg-muted/30 border-muted opacity-60"
          : isSnoozed
          ? "bg-muted/20 border-dashed border-muted-foreground/30 opacity-70"
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      {/* Number / Done indicator */}
      <div
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
          isDone
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isDone ? <Check className="w-3 h-3" /> : index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(item.deep_link)}
          className="text-left w-full"
        >
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {item.title}
          </p>
        </button>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              SOURCE_COLORS[item.source] ?? "bg-muted text-muted-foreground"
            )}
          >
            {item.source}
          </span>
          {isSnoozed && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> Snoozed
            </span>
          )}
          {!isDone && !isSnoozed && (
            <p className="text-[10px] text-muted-foreground truncate">{item.reason}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onComplete}
            title="Mark done"
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          {!isSnoozed && (
            <button
              onClick={onSnooze}
              title="Snooze"
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDismiss}
            title="Dismiss"
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function DailyOSSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10">
            <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function DailyOSCard({
  userId,
  isPaid,
  isTrialing,
  hasActiveSnapshot,
  onUpgrade,
}: DailyOSCardProps) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();

  const { plan, planId, interactions, refreshCount, refreshLimitReached, generatedBy, isLoading } =
    useDailyOSPlan(userId);

  const updateInteraction = useUpdateDailyOSInteraction();
  const { mutate: refreshPlan, isPending: isRefreshing } = useRefreshDailyOS(userId);

  const handleInteract = (itemId: string, state: InteractionState) => {
    if (!planId) return;
    updateInteraction.mutate({ planId, itemId, state });
    trackEvent("daily_os_interaction", `daily_os_item_${state}`, { item_id: itemId });
  };

  const handleRefresh = () => {
    if (refreshLimitReached) return;
    refreshPlan();
    trackEvent("engagement", "daily_os_refreshed", { refresh_count: refreshCount + 1 });
  };

  const VALID_ROUTES = ["/home", "/dashboard", "/planner", "/wellness", "/growth", "/wealth", "/reset"];

  const handleQuickAction = (link: string, label: string) => {
    trackEvent("daily_os_interaction", "daily_os_quick_action_tapped", { action: label });
    if (link.startsWith("/")) {
      const target = VALID_ROUTES.includes(link) ? link : "/home";
      navigate(target);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (isLoading) return <DailyOSSkeleton />;

  // No plan and no active snapshot
  if (!plan && !hasActiveSnapshot) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Daily OS</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Start your first Snapshot to activate your Daily Operating System — it pulls from your goals, promises, and plan to tell you exactly what matters today.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate("/reset")}>
          <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Start a Snapshot
        </Button>
      </motion.div>
    );
  }

  // Free user teaser (show rules plan, upsell AI tier)
  const isAIPowered = plan?.generated_by === "ai";
  const showAIUpsell = !isPaid && !isTrialing && plan;

  // Active priorities (not dismissed)
  const activeItems = (plan?.top_three ?? []).filter((item) => interactions[item.id] !== "dismissed");
  const doneItems = activeItems.filter((item) => interactions[item.id] === "done");
  const snoozedItems = activeItems.filter((item) => interactions[item.id] === "snoozed");
  const pendingItems = activeItems.filter((item) => !interactions[item.id]);

  const sortedItems = [...pendingItems, ...snoozedItems, ...doneItems];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-none">Daily OS</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{today}</p>
          </div>
          {isAIPowered && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!refreshLimitReached && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={refreshLimitReached ? "Refresh limit reached" : `Refresh plan (${3 - refreshCount} left)`}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
              {3 - refreshCount}
            </button>
          )}
          {doneItems.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {doneItems.length}/{activeItems.length} done
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top 3 Priorities */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Top 3 Today
          </p>
          <AnimatePresence mode="popLayout">
            {sortedItems.map((item, i) => (
              <PriorityItem
                key={item.id}
                item={item}
                index={pendingItems.indexOf(item) >= 0 ? pendingItems.indexOf(item) : i}
                interaction={interactions[item.id]}
                onComplete={() => handleInteract(item.id, "done")}
                onSnooze={() => handleInteract(item.id, "snoozed")}
                onDismiss={() => handleInteract(item.id, "dismissed")}
              />
            ))}
          </AnimatePresence>
          {activeItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 text-sm text-muted-foreground"
            >
              All done! 🎉 Your day is clear.
            </motion.div>
          )}
        </div>

        {/* Quick Actions */}
        {plan?.quick_wins && plan.quick_wins.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Quick Wins
            </p>
            <div className="flex gap-2 flex-wrap">
              {plan.quick_wins.slice(0, 4).map((win) => (
                <button
                  key={win.id}
                  onClick={() => handleQuickAction(win.action_link, win.title)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 hover:bg-muted hover:border-primary/40 transition-all text-foreground font-medium"
                >
                  {win.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Why This Matters */}
        {plan?.why_today && (
          <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/50">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Why today matters
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">{plan.why_today}</p>
          </div>
        )}

        {/* Blockers */}
        {plan?.blockers_or_risks && plan.blockers_or_risks.length > 0 && (
          <div className="space-y-1.5">
            {plan.blockers_or_risks.map((blocker, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">{blocker.text}</p>
                  <p className="text-[10px] text-muted-foreground">{blocker.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback Plan */}
        {plan?.fallback_plan && (
          <Collapsible open={fallbackOpen} onOpenChange={setFallbackOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 transition-colors group">
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {plan.fallback_plan.title}
                </span>
                {fallbackOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 px-3 py-2.5 bg-muted/20 rounded-lg border border-border/50"
              >
                <p className="text-[11px] text-muted-foreground mb-2">{plan.fallback_plan.description}</p>
                <ul className="space-y-1.5">
                  {plan.fallback_plan.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* AI upsell for free users */}
        {showAIUpsell && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground flex-1">
              Upgrade to get AI-powered priorities tailored to your patterns.
            </p>
            <Button size="sm" variant="ghost" className="text-[11px] h-6 px-2 text-primary" onClick={onUpgrade}>
              Upgrade
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
