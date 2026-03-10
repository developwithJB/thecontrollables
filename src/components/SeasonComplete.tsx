import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Zap, Trophy, Sparkles, Coffee, Share2 } from "lucide-react";
import { getSnapshotById } from "@/lib/snapshots";
import { SnapshotShareModal } from "@/components/dashboard/SnapshotShareCard";

interface SeasonSnapshot {
  id: string;
  journey_id: string | null;
  start_date: string;
  completed_at: string | null;
  status: string;
  current_day: number;
}

interface SeasonProgress {
  weekNumber: number;
  snapshotsCompleted: number;
  totalCheckIns: number;
  totalXP: number;
  isComplete: boolean;
}

interface SeasonCompleteProps {
  seasonName?: string | null;
  snapshots: SeasonSnapshot[];
  progress: SeasonProgress;
  onStartNewSeason: () => void;
  onTakeBreak: () => void;
  onDismiss: () => void;
}

export function SeasonComplete({
  seasonName,
  snapshots,
  progress,
  onStartNewSeason,
  onTakeBreak,
  onDismiss,
}: SeasonCompleteProps) {
  const consistencyRate = Math.round((progress.totalCheckIns / 28) * 100);

  const getNarrative = () => {
    if (consistencyRate >= 90) return "28 days. Near-perfect attendance. That's a season of showing up.";
    if (consistencyRate >= 70) return `28 days. ${progress.totalCheckIns} check-ins. Consistency is the proof.`;
    return `28 days. ${progress.totalCheckIns} check-ins. You stayed in the game.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6"
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: [0, 1, 0], y: -200 }}
            transition={{ duration: 3 + Math.random() * 2, delay: i * 0.2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute bottom-0 text-2xl"
            style={{ left: `${5 + i * 6}%` }}
          >
            {["🏆", "✨", "🌟", "⭐"][i % 4]}
          </motion.div>
        ))}
      </div>

      <div className="max-w-sm w-full text-center relative z-10 space-y-6">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, delay: 0.2 }}
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl font-display font-bold text-foreground">
            Season Complete
          </h1>
          <p className="text-muted-foreground mt-1">
            {seasonName || "4 Weeks. Your Record."}
          </p>
        </motion.div>

        {/* Narrative */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-muted-foreground italic"
        >
          "{getNarrative()}"
        </motion.p>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <CalendarDays className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{progress.totalCheckIns}</p>
                  <p className="text-[10px] text-muted-foreground">Check-ins</p>
                </div>
                <div className="text-center">
                  <Zap className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{progress.totalXP}</p>
                  <p className="text-[10px] text-muted-foreground">Total XP</p>
                </div>
                <div className="text-center">
                  <Sparkles className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{consistencyRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Consistency</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 pt-2 border-t border-border">
                {snapshots.slice(0, 4).map((snapshot, i) => {
                  const info = snapshot.journey_id ? getSnapshotById(snapshot.journey_id) : null;
                  const isCompleted = snapshot.status === "completed";
                  return (
                    <div key={snapshot.id} className="flex items-center gap-3 text-left">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isCompleted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {info?.emoji || (i + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          Week {i + 1}: {info?.name || "Snapshot"}
                        </p>
                      </div>
                      {isCompleted && (
                        <span className="text-[10px] text-primary">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badge unlock notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-2 text-sm text-primary"
        >
          <span className="text-xl">🏅</span>
          <span className="font-medium">Season Finisher badge earned</span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="space-y-2"
        >
          <Button onClick={onStartNewSeason} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Another Season
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onTakeBreak} className="flex-1 text-xs">
              <Coffee className="w-3 h-3 mr-1" />
              Take a Break
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss} className="flex-1 text-xs">
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
