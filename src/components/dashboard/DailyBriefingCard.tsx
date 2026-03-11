import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface DailyBriefingCardProps {
  isPaid: boolean;
  isTrialing?: boolean;
  hasActiveSnapshot: boolean;
  onUpgrade?: () => void;
  healthRecovery?: number | null;
  plannerCount?: number | null;
}

const CONTROLLABLE_META: Record<string, { emoji: string; name: string }> = {
  awareness: { emoji: "🦉", name: "Awareness" },
  perspective: { emoji: "🐢", name: "Perspective" },
  habit: { emoji: "🦈", name: "Habit" },
  wellness: { emoji: "🛰️", name: "Wellness" },
  environment: { emoji: "🚀", name: "Environment" },
};

export function DailyBriefingCard({ isPaid, isTrialing, hasActiveSnapshot, onUpgrade, healthRecovery, plannerCount }: DailyBriefingCardProps) {
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
    // Only auto-fetch for paid users
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

  const lines = content.split('\n').filter(l => l.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-gradient-to-br from-accent/5 via-card to-muted/20 p-4 relative overflow-hidden"
    >
      {/* Subtle glow */}
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
