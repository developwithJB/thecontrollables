import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  AlertTriangle,
  Battery,
  ChevronDown,
  MessageCircle,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import {
  useOperatorConsole,
  type OperatorAction,
} from "@/hooks/useOperatorConsole";
import { OperatorCommandInput } from "./OperatorCommandInput";
import { useAnalytics } from "@/hooks/useAnalytics";

// Lazy import for chat drawer
import { lazy, Suspense } from "react";
const LazyAIGuidePanel = lazy(() =>
  import("./AIGuidePanel").then((m) => ({ default: m.AIGuidePanel }))
);

const MODE_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  plan: { label: "Plan", color: "bg-primary/10 text-primary", icon: "📋" },
  focus: { label: "Focus", color: "bg-amber-500/10 text-amber-600", icon: "🎯" },
  recovery: {
    label: "Recovery",
    color: "bg-emerald-500/10 text-emerald-600",
    icon: "🌿",
  },
  review: {
    label: "Review",
    color: "bg-blue-500/10 text-blue-600",
    icon: "🔍",
  },
  decision: {
    label: "Decision",
    color: "bg-violet-500/10 text-violet-600",
    icon: "⚖️",
  },
};

interface OperatorConsoleProps {
  userId: string | null;
  // Props passed through for chat fallback
  activeQuest: { title: string; duration_days: number } | null;
  totalXp: number;
  integrityScore: number | null;
  currentBuild?: any;
  onXpEarned?: () => void;
  isPaid?: boolean;
  isTrialing?: boolean;
  onUpgrade?: () => void;
  isCheckingOut?: boolean;
  hasActiveSnapshot?: boolean;
  onMessageSent?: () => void;
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.7
      ? "bg-emerald-500"
      : confidence >= 0.4
        ? "bg-amber-500"
        : "bg-muted-foreground";
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${color}`}
      title={`Confidence: ${Math.round(confidence * 100)}%`}
    />
  );
}

function ActionChip({
  action,
  onAccept,
}: {
  action: OperatorAction;
  onAccept: (id: string, deepLink: string | null) => void;
}) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        onAccept(action.id, action.deep_link);
        if (action.deep_link) {
          navigate(action.deep_link);
        }
      }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent/5 hover:border-accent/30 transition-all text-left w-full group"
    >
      <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
      <span className="text-sm text-foreground flex-1 line-clamp-1">
        {action.label}
      </span>
      {action.xp_reward > 0 && (
        <span className="text-[10px] text-muted-foreground font-medium">
          +{action.xp_reward} Evolution XP
        </span>
      )}
    </motion.button>
  );
}

export function OperatorConsole({
  userId,
  activeQuest,
  totalXp,
  integrityScore,
  currentBuild,
  onXpEarned,
  isPaid,
  isTrialing,
  onUpgrade,
  isCheckingOut,
  hasActiveSnapshot,
  onMessageSent,
}: OperatorConsoleProps) {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const [showCommands, setShowCommands] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const {
    suggestion,
    isLoading,
    sendCommand,
    isCommandLoading,
    acceptAction,
    dismissSuggestion,
  } = useOperatorConsole(userId);

  const handleAcceptAction = (actionId: string, deepLink: string | null) => {
    acceptAction(actionId);
    trackEvent("interaction", "operator_action_accepted", {
      action_id: actionId,
      deep_link: deepLink,
    });
  };

  const modeConfig = MODE_CONFIG[suggestion?.mode || "plan"] || MODE_CONFIG.plan;

  // Loading state
  if (isLoading && !suggestion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-gradient-to-br from-accent/5 to-muted/30 p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm animate-pulse">⚡</span>
          <div className="h-4 bg-muted rounded animate-pulse w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-muted rounded-lg animate-pulse flex-1" />
          <div className="h-9 bg-muted rounded-lg animate-pulse flex-1" />
        </div>
      </motion.div>
    );
  }

  // Empty state
  if (!suggestion && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">⚡</span>
          <h3 className="text-sm font-semibold text-foreground">Operator</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          No suggestions yet. Start logging actions to activate the Operator.
        </p>
        <OperatorCommandInput
          onSendCommand={sendCommand}
          isLoading={isCommandLoading}
        />
      </motion.div>
    );
  }

  if (!suggestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-gradient-to-br from-accent/5 via-card to-muted/20 p-4 relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <span className="text-sm">{modeConfig.icon}</span>
          <h3 className="text-sm font-semibold text-foreground">Operator</h3>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-4 ${modeConfig.color}`}
          >
            {modeConfig.label}
          </Badge>
          <ConfidenceDot confidence={suggestion.confidence} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/operator")}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
            title="Full view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissSuggestion}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Headline */}
      <h4 className="text-base font-semibold text-foreground mb-1 leading-tight">
        {suggestion.headline}
      </h4>

      {/* Summary */}
      {suggestion.summary && (
        <p className="text-sm text-muted-foreground mb-1 leading-relaxed">
          {suggestion.summary}
        </p>
      )}

      {/* Rationale */}
      {suggestion.rationale && (
        <p className="text-[11px] text-muted-foreground/70 mb-3 italic">
          {suggestion.rationale}
        </p>
      )}

      {/* Recommended Actions */}
      {suggestion.recommended_actions.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {suggestion.recommended_actions.map((action) => (
            <ActionChip
              key={action.id}
              action={action}
              onAccept={handleAcceptAction}
            />
          ))}
        </div>
      )}

      {/* Warnings */}
      <AnimatePresence>
        {suggestion.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-1.5 mb-3"
          >
            {suggestion.warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span className="text-[11px]">{warning}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Low Energy Fallback */}
      {suggestion.fallback_if_low_energy && (
        <button
          onClick={() => {
            if (suggestion.fallback_if_low_energy?.deep_link) {
              navigate(suggestion.fallback_if_low_energy.deep_link);
            }
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-left mb-3"
        >
          <Battery className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Low energy? {suggestion.fallback_if_low_energy.label}
          </span>
        </button>
      )}

      {/* Command Input Toggle */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCommands(!showCommands)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showCommands ? "rotate-180" : ""}`}
          />
          {showCommands ? "Hide commands" : "Give a command"}
        </button>

        <AnimatePresence>
          {showCommands && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <OperatorCommandInput
                onSendCommand={(cmd) => {
                  sendCommand(cmd);
                  trackEvent("interaction", "operator_command_sent", {
                    command: cmd,
                  });
                }}
                isLoading={isCommandLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Talk it through - opens chat drawer */}
      <div className="mt-3 pt-3 border-t">
        <Drawer open={chatDrawerOpen} onOpenChange={setChatDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              onClick={() => {
                setChatDrawerOpen(true);
                trackEvent("interaction", "operator_chat_opened");
              }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              Talk it through
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle className="text-sm">The Controllables</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[70vh]">
              <Suspense
                fallback={
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                }
              >
                <LazyAIGuidePanel
                  activeQuest={activeQuest}
                  totalXp={totalXp}
                  integrityScore={integrityScore}
                  currentBuild={currentBuild}
                  onXpEarned={onXpEarned}
                  isPaid={isPaid}
                  isTrialing={isTrialing}
                  onUpgrade={onUpgrade}
                  isCheckingOut={isCheckingOut}
                  hasActiveSnapshot={hasActiveSnapshot}
                  onMessageSent={onMessageSent}
                />
              </Suspense>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </motion.div>
  );
}
