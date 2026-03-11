import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Lock, RefreshCw, Target, AlertTriangle, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BriefingStructured {
  day_type: string;
  interpretation: string;
  focus: string;
  watchout: string;
}

interface DailyBriefingCardProps {
  isPaid: boolean;
  isTrialing?: boolean;
  hasActiveSnapshot: boolean;
  onUpgrade?: () => void;
  healthRecovery?: number | null;
  plannerCount?: number | null;
  ringsCompleted?: number;
}

const CONTROLLABLE_META: Record<string, { emoji: string; name: string }> = {
  awareness: { emoji: "🦉", name: "Awareness" },
  perspective: { emoji: "🐢", name: "Perspective" },
  habit: { emoji: "🦈", name: "Habit" },
  wellness: { emoji: "🛰️", name: "Wellness" },
  environment: { emoji: "🚀", name: "Environment" },
};

const DAY_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  "Recovery Day": { bg: "bg-blue-500/15", text: "text-blue-400" },
  "Focus Day": { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  "Heavy Day": { bg: "bg-orange-500/15", text: "text-orange-400" },
  "Reset Day": { bg: "bg-violet-500/15", text: "text-violet-400" },
  "Fragmented Day": { bg: "bg-amber-500/15", text: "text-amber-400" },
  "Momentum Day": { bg: "bg-green-500/15", text: "text-green-400" },
  "Protected Day": { bg: "bg-sky-500/15", text: "text-sky-400" },
  "Catch-Up Day": { bg: "bg-rose-500/15", text: "text-rose-400" },
};

function tryParseStructured(content: string): BriefingStructured | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.day_type && parsed.interpretation && parsed.focus && parsed.watchout) {
      return parsed as BriefingStructured;
    }
  } catch {
    // Not JSON — legacy format
  }
  return null;
}

export function DailyBriefingCard({ isPaid, isTrialing, hasActiveSnapshot, onUpgrade, healthRecovery, plannerCount, ringsCompleted }: DailyBriefingCardProps) {
  const [content, setContent] = useState<string | null>(null);
  const [controllable, setControllable] = useState<string>("awareness");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchBriefing = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-briefing");
      if (error) throw error;
      if (data?.content) {
        setContent(data.content);
        setControllable(data.controllable || "awareness");
      }
    } catch (err) {
      console.error("Briefing fetch failed:", err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    if (!hasActiveSnapshot || hasLoaded) return;
    if (isPaid) {
      fetchBriefing();
    } else {
      setHasLoaded(true);
    }
  }, [hasActiveSnapshot, isPaid, hasLoaded]);

  if (!hasActiveSnapshot) return null;

  const meta = CONTROLLABLE_META[controllable] || CONTROLLABLE_META.awareness;

  // Teaser for free users
  if (!isPaid && !isTrialing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-gradient-to-br from-accent/5 to-muted/30 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🧠</span>
          <h3 className="text-sm font-semibold text-foreground">Your AI Morning Briefing</h3>
          <Lock className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Get a personalized daily briefing from The Controllables — pattern insights, today's focus, and one actionable suggestion.
        </p>
        <Button size="sm" variant="outline" onClick={onUpgrade} className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" /> Unlock with Pro
        </Button>
      </motion.div>
    );
  }

  if (isLoading && !content) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-gradient-to-br from-accent/5 to-muted/30 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg animate-pulse">🧠</span>
          <h3 className="text-sm font-semibold text-foreground">Generating your briefing...</h3>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
        </div>
      </motion.div>
    );
  }

  if (!content) return null;

  const structured = tryParseStructured(content);

  // Build context grounding line
  const groundingParts: string[] = [];
  if (healthRecovery != null) groundingParts.push(`${Math.round(healthRecovery)}% recovery`);
  if (plannerCount != null) groundingParts.push(`${plannerCount} planned items`);
  if (ringsCompleted != null) groundingParts.push(`${ringsCompleted}/5 rings`);
  const groundingLine = groundingParts.length > 0 ? `Based on ${groundingParts.join(" + ")}` : null;

  // Structured display
  if (structured) {
    const dayStyle = DAY_TYPE_STYLES[structured.day_type] || { bg: "bg-muted/30", text: "text-muted-foreground" };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-gradient-to-br from-accent/5 via-card to-muted/20 p-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8" />

        <div className="flex items-center justify-between mb-3 relative">
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.emoji}</span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Daily Briefing</h3>
              {groundingLine && (
                <p className="text-[10px] text-muted-foreground/60 font-mono">{groundingLine}</p>
              )}
            </div>
          </div>
          <button
            onClick={fetchBriefing}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
            title="Refresh briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Day Type Badge */}
        <div className="mb-3 relative">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dayStyle.bg} ${dayStyle.text}`}>
            {structured.day_type}
          </span>
        </div>

        {/* Interpretation */}
        <motion.p
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm text-foreground/90 leading-relaxed mb-3 relative"
        >
          {structured.interpretation}
        </motion.p>

        {/* Focus */}
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-2 mb-2 relative"
        >
          <Crosshair className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground/80 leading-relaxed">{structured.focus}</p>
        </motion.div>

        {/* Watchout */}
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-2 relative"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{structured.watchout}</p>
        </motion.div>
      </motion.div>
    );
  }

  // Legacy fallback: unstructured text
  const lines = content.split('\n').filter(l => l.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-gradient-to-br from-accent/5 via-card to-muted/20 p-4 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8" />

      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Morning Briefing</h3>
            <p className="text-[10px] text-muted-foreground">{meta.name} · Today</p>
          </div>
        </div>
        <button
          onClick={fetchBriefing}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
          title="Refresh briefing"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {groundingLine && (
        <p className="text-[10px] text-muted-foreground/60 font-mono mb-2 relative">{groundingLine}</p>
      )}

      <div className="space-y-2 relative">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="text-sm text-foreground/90 leading-relaxed"
          >
            {line}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}
