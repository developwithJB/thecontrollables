import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { READING_LIBRARY, type Controllable } from "@/lib/readingLibrary";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";

interface DailyReadingCardProps {
  userId: string;
}

const CONTROLLABLE_META: Record<Controllable, { emoji: string; label: string }> = {
  awareness: { emoji: "👁️", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🔗", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

function getWeakestControllable(build: { awareness: number; perspective: number; habit: number; wellness: number; environment: number } | null): Controllable {
  if (!build) return "awareness"; // default
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
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
  // Map day of week to day pattern (1-7, Sun=7)
  const dayPattern = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  // Get readings for this controllable that match today's day pattern
  const matching = READING_LIBRARY.filter(
    (r) => r.controllable === controllable && r.dayPatterns.includes(dayPattern)
  );
  
  // Rotate based on week number of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  
  if (matching.length === 0) {
    // Fallback: any reading for this controllable
    const fallback = READING_LIBRARY.filter((r) => r.controllable === controllable);
    return fallback[weekNumber % fallback.length] || READING_LIBRARY[0];
  }
  
  return matching[weekNumber % matching.length];
}

export function DailyReadingCard({ userId }: DailyReadingCardProps) {
  const { currentBuild } = useBuildAssessment();
  const [expanded, setExpanded] = useState(false);
  const [completed, setCompleted] = useState(() => {
    try {
      const key = `reading_done_${userId}_${new Date().toLocaleDateString("sv-SE")}`;
      return localStorage.getItem(key) === "1";
    } catch { return false; }
  });

  const weakest = useMemo(() => getWeakestControllable(currentBuild), [currentBuild]);
  const reading = useMemo(() => getTodayReading(weakest), [weakest]);
  const meta = CONTROLLABLE_META[weakest];

  const markComplete = () => {
    setCompleted(true);
    try {
      const key = `reading_done_${userId}_${new Date().toLocaleDateString("sv-SE")}`;
      localStorage.setItem(key, "1");
    } catch {}
  };

  if (completed) {
    return (
      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            ✅ Today's reading complete — <span className="font-medium text-foreground">{meta.label}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
              {reading.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-primary">Today's Reading</p>
                <span className="text-[10px] text-muted-foreground">· {meta.label}</span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {reading.framingLine}
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {/* Expanded reading */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">
                  {/* Reading text */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      {reading.source} — {reading.chapter}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {reading.text}
                    </p>
                  </div>

                  {/* Control & Surrender */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-primary/5 p-3">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Control</p>
                      <p className="text-xs text-foreground">{reading.controlLine}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Surrender</p>
                      <p className="text-xs text-foreground">{reading.surrenderLine}</p>
                    </div>
                  </div>

                  {/* Today's action */}
                  <div className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Today's Action</p>
                    </div>
                    <p className="text-sm text-foreground">{reading.questAction}</p>
                  </div>

                  {/* Reflection */}
                  <p className="text-xs text-muted-foreground italic text-center">
                    "{reading.reflection}"
                  </p>

                  {/* Complete button */}
                  <Button
                    onClick={markComplete}
                    className="w-full"
                    size="sm"
                  >
                    ✓ I've read today's lesson
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
