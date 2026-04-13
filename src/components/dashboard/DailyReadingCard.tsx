import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { READING_LIBRARY, type Controllable } from "@/lib/readingLibrary";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";

interface DailyReadingCardProps {
  userId: string;
}

const CONTROLLABLE_LABELS: Record<Controllable, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

function getWeakestControllable(build: { awareness: number; perspective: number; habit: number; wellness: number; environment: number } | null): Controllable {
  if (!build) return "awareness";
  const scores: [Controllable, number][] = [
    ["awareness", build.awareness],
    ["perspective", build.perspective],
    ["habit", build.habit],
    ["wellness", build.wellness],
    ["environment", build.environment],
  ];
  scores.sort((a, b) => a[1] - b[1]);
  return scores[0][0];
}

function getTodayReading(controllable: Controllable) {
  const dayOfWeek = new Date().getDay();
  const dayPattern = dayOfWeek === 0 ? 7 : dayOfWeek;
  const matching = READING_LIBRARY.filter(
    (r) => r.controllable === controllable && r.dayPatterns.includes(dayPattern)
  );
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (matching.length === 0) {
    const fallback = READING_LIBRARY.filter((r) => r.controllable === controllable);
    return fallback[weekNumber % fallback.length] || READING_LIBRARY[0];
  }
  return matching[weekNumber % matching.length];
}

export function DailyReadingCard({ userId }: DailyReadingCardProps) {
  const { currentBuild } = useBuildAssessment();
  const [completed, setCompleted] = useState(() => {
    try {
      const key = `reading_done_${userId}_${new Date().toLocaleDateString("sv-SE")}`;
      return localStorage.getItem(key) === "1";
    } catch { return false; }
  });

  const weakest = useMemo(() => getWeakestControllable(currentBuild), [currentBuild]);
  const reading = useMemo(() => getTodayReading(weakest), [weakest]);

  const markComplete = () => {
    setCompleted(true);
    try {
      const key = `reading_done_${userId}_${new Date().toLocaleDateString("sv-SE")}`;
      localStorage.setItem(key, "1");
    } catch {}
  };

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-border/30 bg-card/40 px-5 py-4 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm text-foreground">Today's reading complete</p>
          <p className="text-xs text-muted-foreground">{CONTROLLABLE_LABELS[weakest]} · {reading.framingLine}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border/30 bg-card/60 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            Today's Reading · {CONTROLLABLE_LABELS[weakest]}
          </p>
        </div>
        <p className="text-base font-medium text-foreground leading-snug">
          {reading.framingLine}
        </p>
      </div>

      {/* Reading content — always visible */}
      <div className="px-5 pb-5 space-y-4">
        {/* Source text */}
        <div className="rounded-lg bg-muted/30 p-4">
          <p className="text-[11px] text-muted-foreground font-medium mb-2">
            {reading.source} — {reading.chapter}
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {reading.text}
          </p>
        </div>

        {/* Control & Surrender — calm layout */}
        <div className="space-y-2">
          <div className="rounded-lg bg-primary/5 p-3">
            <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-1">What you can control</p>
            <p className="text-xs text-foreground leading-relaxed">{reading.controlLine}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">What to release</p>
            <p className="text-xs text-foreground leading-relaxed">{reading.surrenderLine}</p>
          </div>
        </div>

        {/* Today's direction */}
        <div className="rounded-lg border border-border/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Today's Direction</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{reading.questAction}</p>
        </div>

        {/* Reflection */}
        <p className="text-xs text-muted-foreground/80 italic text-center leading-relaxed">
          "{reading.reflection}"
        </p>

        {/* Complete */}
        <Button
          onClick={markComplete}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Mark as read
        </Button>
      </div>
    </motion.div>
  );
}
