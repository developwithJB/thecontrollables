import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Zap, Trophy, Sparkles, Coffee, Share2, Download, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { getSnapshotById } from "@/lib/snapshots";
import { SnapshotShareModal } from "@/components/dashboard/SnapshotShareCard";
import { supabase } from "@/integrations/supabase/client";

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

interface SeasonProject {
  id: string;
  name: string;
  emoji: string | null;
  momentum_score: number | null;
  status: string | null;
  controllable: string | null;
}

interface HealthMetric {
  sync_date: string;
  recovery_score: number | null;
  hrv_ms: number | null;
  strain_score: number | null;
}

interface SeasonCompleteProps {
  season: {
    id: string;
    name: string | null;
    started_at: string;
    completed_at: string | null;
    created_at: string;
  };
  projects: SeasonProject[];
  seasonSnapshots: SeasonSnapshot[];
  progress: SeasonProgress;
  healthData: HealthMetric[];
  onStartNewSeason: () => void;
  onDismiss: () => void;
}

function computeWearableAggregates(healthData: HealthMetric[]) {
  const recoveryScores = healthData.filter(h => h.recovery_score != null).map(h => h.recovery_score!);
  const avgRecovery = recoveryScores.length > 0 ? Math.round(recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length) : null;

  // Group by ISO week
  const weekMap: Record<string, number[]> = {};
  for (const h of healthData) {
    if (h.recovery_score == null) continue;
    const d = new Date(h.sync_date + "T00:00:00");
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    if (!weekMap[weekKey]) weekMap[weekKey] = [];
    weekMap[weekKey].push(h.recovery_score);
  }
  const weekAvgs = Object.entries(weekMap).map(([wk, scores]) => ({
    week: wk,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
  weekAvgs.sort((a, b) => b.avg - a.avg);

  return {
    avgRecovery,
    bestWeek: weekAvgs[0] || null,
    hardestWeek: weekAvgs.length > 1 ? weekAvgs[weekAvgs.length - 1] : null,
  };
}

export function SeasonComplete({
  season,
  projects,
  seasonSnapshots,
  progress,
  healthData,
  onStartNewSeason,
  onDismiss,
}: SeasonCompleteProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [reflectionText, setReflectionText] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const startDate = season.started_at?.split("T")[0] || season.created_at?.split("T")[0];
  const endDate = (season.completed_at || new Date().toISOString()).split("T")[0];
  const durationDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);

  const wearable = useMemo(() => computeWearableAggregates(healthData), [healthData]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => (b.momentum_score || 0) - (a.momentum_score || 0));
  }, [projects]);

  const mostMomentum = sortedProjects[0] || null;
  const mostStruggled = sortedProjects.length > 1 ? sortedProjects[sortedProjects.length - 1] : null;

  // Generate certificate + AI reflection
  useEffect(() => {
    let cancelled = false;
    async function generate() {
      setIsGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-certificate", {
          body: { season_id: season.id, type: "season" },
        });
        if (!cancelled && data) {
          setCertificateUrl(data.certificate_url || null);
          setReflectionText(data.reflection_text || null);
        }
        if (error) console.error("Certificate generation error:", error);
      } catch (e) {
        console.error("Certificate generation failed:", e);
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    }
    generate();
    return () => { cancelled = true; };
  }, [season.id]);

  const handleDownload = async () => {
    if (!certificateUrl) return;
    setIsDownloading(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `season-certificate-${season.name || "complete"}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
            setIsDownloading(false);
          }, "image/png");
        }
      };
      img.onerror = () => setIsDownloading(false);
      img.src = certificateUrl;
    } catch {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4 overflow-y-auto py-8"
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: [0, 1, 0], y: -200 }}
            transition={{ duration: 3 + Math.random() * 2, delay: i * 0.25, repeat: Infinity, repeatDelay: 4 }}
            className="absolute bottom-0 text-2xl"
            style={{ left: `${5 + i * 8}%` }}
          >
            {["🏆", "✨", "🌟", "⭐"][i % 4]}
          </motion.div>
        ))}
      </div>

      <div className="max-w-md w-full relative z-10 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, delay: 0.2 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Season Complete</h1>
          <p className="text-muted-foreground mt-1">
            {season.name || "Your Season"} · {durationDays} days
          </p>
        </motion.div>

        {/* Project Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Projects</p>
              {sortedProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{project.emoji || "📁"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={project.momentum_score || 0} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{project.momentum_score ?? 0}%</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    project.status === "completed" ? "bg-primary/10 text-primary" :
                    project.status === "paused" ? "bg-muted text-muted-foreground" :
                    "bg-accent/10 text-accent-foreground"
                  }`}>
                    {project.status || "active"}
                  </span>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No projects tracked this season.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Wearable Aggregates */}
        {wearable.avgRecovery != null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase mb-3">Body Data</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <Activity className="w-4 h-4 mx-auto text-primary mb-1" />
                    <p className="text-lg font-bold text-foreground">{wearable.avgRecovery}%</p>
                    <p className="text-[10px] text-muted-foreground">Avg Recovery</p>
                  </div>
                  {wearable.bestWeek && (
                    <div className="text-center">
                      <TrendingUp className="w-4 h-4 mx-auto text-green-500 mb-1" />
                      <p className="text-lg font-bold text-foreground">{wearable.bestWeek.avg}%</p>
                      <p className="text-[10px] text-muted-foreground">Best Week</p>
                    </div>
                  )}
                  {wearable.hardestWeek && (
                    <div className="text-center">
                      <TrendingDown className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                      <p className="text-lg font-bold text-foreground">{wearable.hardestWeek.avg}%</p>
                      <p className="text-[10px] text-muted-foreground">Hardest Week</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Standout Projects */}
        {(mostMomentum || mostStruggled) && projects.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <div className="grid grid-cols-2 gap-3">
              {mostMomentum && (
                <Card className="border-primary/20">
                  <CardContent className="p-3 text-center">
                    <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Most Momentum</p>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">{mostMomentum.emoji} {mostMomentum.name}</p>
                  </CardContent>
                </Card>
              )}
              {mostStruggled && (
                <Card className="border-border">
                  <CardContent className="p-3 text-center">
                    <TrendingDown className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Most Struggled</p>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">{mostStruggled.emoji} {mostStruggled.name}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* Cumulative Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
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
              <p className="text-lg font-bold text-foreground">{progress.snapshotsCompleted}/4</p>
              <p className="text-[10px] text-muted-foreground">Snapshots</p>
            </div>
          </div>
        </motion.div>

        {/* AI Reflection */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {isGenerating ? (
            <div className="space-y-2 px-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : reflectionText ? (
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm text-foreground italic leading-relaxed">"{reflectionText}"</p>
              </CardContent>
            </Card>
          ) : null}
        </motion.div>

        {/* Badge */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <span className="text-xl">🏅</span>
            <span className="font-medium">Season Finisher badge earned</span>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="space-y-2">
          <Button onClick={onStartNewSeason} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Start a New Season
          </Button>
          <div className="flex gap-2">
            {certificateUrl && (
              <Button onClick={handleDownload} variant="outline" className="flex-1" disabled={isDownloading}>
                <Download className="w-4 h-4 mr-1" />
                {isDownloading ? "Saving…" : "Certificate"}
              </Button>
            )}
            <Button onClick={() => setIsShareOpen(true)} variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss} className="w-full text-xs">
            <Coffee className="w-3 h-3 mr-1" />
            Back to Dashboard
          </Button>
        </motion.div>

        <SnapshotShareModal
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          snapshotName={season.name || "Season Complete"}
          completionDate={season.completed_at || new Date().toISOString()}
        />
      </div>
    </motion.div>
  );
}
