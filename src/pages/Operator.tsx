import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, History, Zap, AlertTriangle, Battery } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorConsole, type OperatorAction } from "@/hooks/useOperatorConsole";
import { OperatorCommandInput } from "@/components/dashboard/OperatorCommandInput";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";
import { toSafeInternalPath } from "@/lib/safeNavigation";

const MODE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  plan: { label: "Plan", color: "bg-primary/10 text-primary", icon: "📋" },
  focus: { label: "Focus", color: "bg-amber-500/10 text-amber-600", icon: "🎯" },
  recovery: { label: "Recovery", color: "bg-emerald-500/10 text-emerald-600", icon: "🌿" },
  review: { label: "Review", color: "bg-blue-500/10 text-blue-600", icon: "🔍" },
  decision: { label: "Decision", color: "bg-violet-500/10 text-violet-600", icon: "⚖️" },
};

export default function Operator() {
  usePageViewTracking("Operator");
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
      else navigate("/auth");
    });
  }, [navigate]);

  const { suggestion, isLoading, sendCommand, isCommandLoading, acceptAction } =
    useOperatorConsole(user?.id || null);

  const modeConfig = MODE_CONFIG[suggestion?.mode || "plan"] || MODE_CONFIG.plan;

  const handleAcceptAction = (action: OperatorAction) => {
    acceptAction(action.id);
    if (action.deep_link) navigate(toSafeInternalPath(action.deep_link));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b pt-[env(safe-area-inset-top)]">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h1 className="font-display text-lg font-semibold">Operator Console</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-6 py-6 w-full space-y-6">
        {/* Command Input */}
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Command
          </h2>
          <OperatorCommandInput onSendCommand={sendCommand} isLoading={isCommandLoading} />
        </div>

        {/* Current Suggestion */}
        {isLoading && !suggestion ? (
          <div className="rounded-xl border bg-card p-6 space-y-3 animate-pulse">
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ) : suggestion ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border bg-gradient-to-br from-accent/5 via-card to-muted/20 p-6 space-y-4"
          >
            {/* Mode badge */}
            <div className="flex items-center gap-2">
              <span>{modeConfig.icon}</span>
              <Badge variant="secondary" className={`text-xs ${modeConfig.color}`}>
                {modeConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Confidence: {Math.round(suggestion.confidence * 100)}%
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {suggestion.generated_by === "ai" ? "AI generated" : "Rule-based"}
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
              {suggestion.headline}
            </h2>

            {/* Summary */}
            {suggestion.summary && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {suggestion.summary}
              </p>
            )}

            {/* Rationale */}
            {suggestion.rationale && (
              <p className="text-sm text-muted-foreground/70 italic border-l-2 border-accent/30 pl-3">
                {suggestion.rationale}
              </p>
            )}

            {/* Actions grid */}
            {suggestion.recommended_actions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestion.recommended_actions.map((action) => (
                  <motion.button
                    key={action.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAcceptAction(action)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/5 hover:border-accent/30 transition-all text-left group"
                  >
                    <Zap className="w-4 h-4 text-accent flex-shrink-0 opacity-60 group-hover:opacity-100" />
                    <span className="text-sm text-foreground flex-1">{action.label}</span>
                    {action.xp_reward > 0 && (
                      <span className="text-xs text-muted-foreground">+{action.xp_reward} Charge XP</span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Warnings */}
            {suggestion.warnings.length > 0 && (
              <div className="space-y-1.5">
                {suggestion.warnings.map((warning, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Low energy fallback */}
            {suggestion.fallback_if_low_energy && (
              <button
                onClick={() => {
                  if (suggestion.fallback_if_low_energy?.deep_link) {
                    navigate(toSafeInternalPath(suggestion.fallback_if_low_energy.deep_link));
                  }
                }}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              >
                <Battery className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Low energy? {suggestion.fallback_if_low_energy.label}
                </span>
              </button>
            )}

            {/* Alternate actions */}
            {suggestion.alternate_actions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                  Alternatives
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestion.alternate_actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAcceptAction(action)}
                      className="px-3 py-1.5 text-xs rounded-full border hover:bg-muted/50 transition-colors text-muted-foreground"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No suggestions yet. Use a command above or start logging actions.
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
