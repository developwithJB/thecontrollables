import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  Circle,
  Clock,
  Heart,
  Shield,
  Moon,
  Dumbbell,
  Apple,
  FileText,
  Target,
  Calendar,
  Sparkles,
  Download,
  Share2,
  Loader2,
} from "lucide-react";
import { format, addDays, parseISO, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { BUCKETS, getSnapshotById } from "@/lib/snapshots";
import { toast } from "sonner";

interface SnapshotRecord {
  id: string;
  snapshotId: string | null;
  startDate: string;
  completedAt: string | null;
  status: "active" | "completed" | "expired" | "paused";
  daysCompleted: number;
  xpEarned: number;
}

interface CompletedAction {
  id: string;
  action_text: string;
  controllable: string | null;
  completed_at: string;
  xp_awarded: number;
}

interface DailyReset {
  day_number: number;
  reflection: string | null;
  commitment: string | null;
  release: string | null;
  completed_at: string;
}

interface TimeLog {
  log_date: string;
  time_invested_minutes: number | null;
  time_wasted_minutes: number | null;
  notes: string | null;
}

interface WellnessLog {
  log_date: string;
  sleep_rating: number | null;
  movement_rating: number | null;
  nutrition_rating: number | null;
  notes: string | null;
}

interface IntegrityLog {
  promise_text: string;
  promised_at: string;
  kept: boolean | null;
  kept_at: string | null;
  due_date: string | null;
}

interface XpLog {
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface SnapshotDetailData {
  completedActions: CompletedAction[];
  dailyResets: DailyReset[];
  timeLogs: TimeLog[];
  wellnessLogs: WellnessLog[];
  integrityLogs: IntegrityLog[];
  xpLogs: XpLog[];
}

interface SnapshotDetailViewProps {
  record: SnapshotRecord;
  onClose: () => void;
}

// Helper to get rating emoji
function getRatingEmoji(rating: number | null): string {
  if (rating === null) return "—";
  if (rating >= 5) return "🌟";
  if (rating >= 4) return "😊";
  if (rating >= 3) return "😐";
  if (rating >= 2) return "😟";
  return "😩";
}

// Helper to get intentionality label from minutes
function getIntentionalityLabel(invested: number | null): string {
  if (invested === null) return "Not recorded";
  if (invested >= 80) return "Highly intentional";
  if (invested >= 60) return "Mostly focused";
  if (invested >= 40) return "Mixed day";
  if (invested >= 20) return "Somewhat scattered";
  return "Scattered day";
}

export function SnapshotDetailView({ record, onClose }: SnapshotDetailViewProps) {
  const [data, setData] = useState<SnapshotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;
  const startDate = parseISO(record.startDate);
  const endDate = addDays(startDate, 6);
  const dateRange = `${format(startDate, "MMM d")} - ${format(endDate, "d, yyyy")}`;

  useEffect(() => {
    async function fetchSnapshotData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const startDateStr = format(startDate, "yyyy-MM-dd");
        const endDateStr = format(endDate, "yyyy-MM-dd");

        // Fetch all data in parallel
        const [
          actionsRes,
          resetsRes,
          timeRes,
          wellnessRes,
          integrityRes,
          xpRes,
        ] = await Promise.all([
          // Completed actions
          supabase
            .from("completed_actions")
            .select("*")
            .eq("user_id", user.id)
            .gte("completed_at", `${startDateStr}T00:00:00`)
            .lte("completed_at", `${endDateStr}T23:59:59`)
            .order("completed_at", { ascending: true }),
          // Daily resets (by session_id)
          supabase
            .from("daily_resets")
            .select("*")
            .eq("session_id", record.id)
            .order("day_number", { ascending: true }),
          // Time logs
          supabase
            .from("time_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("log_date", startDateStr)
            .lte("log_date", endDateStr)
            .order("log_date", { ascending: true }),
          // Wellness logs
          supabase
            .from("wellness_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("log_date", startDateStr)
            .lte("log_date", endDateStr)
            .order("log_date", { ascending: true }),
          // Integrity logs
          supabase
            .from("integrity_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("promised_at", `${startDateStr}T00:00:00`)
            .lte("promised_at", `${endDateStr}T23:59:59`)
            .order("promised_at", { ascending: true }),
          // XP logs
          supabase
            .from("xp_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("created_at", `${startDateStr}T00:00:00`)
            .lte("created_at", `${endDateStr}T23:59:59`)
            .order("created_at", { ascending: true }),
        ]);

        setData({
          completedActions: actionsRes.data || [],
          dailyResets: resetsRes.data || [],
          timeLogs: timeRes.data || [],
          wellnessLogs: wellnessRes.data || [],
          integrityLogs: integrityRes.data || [],
          xpLogs: xpRes.data || [],
        });
      } catch (error) {
        console.error("Error fetching snapshot data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSnapshotData();
  }, [record.id, record.startDate]);

  // Calculate summary stats
  const totalXP = data?.xpLogs.reduce((sum, log) => sum + log.amount, 0) || 0;
  const promisesKept = data?.integrityLogs.filter((l) => l.kept === true).length || 0;
  const promisesTotal = data?.integrityLogs.length || 0;
  // Calculate average wellness only from non-null ratings
  const avgWellness = data?.wellnessLogs.length
    ? (() => {
        let totalSum = 0;
        let totalCount = 0;
        data.wellnessLogs.forEach((log) => {
          const ratings = [log.sleep_rating, log.movement_rating, log.nutrition_rating];
          ratings.forEach((r) => {
            if (r !== null) {
              totalSum += r;
              totalCount++;
            }
          });
        });
        return totalCount > 0 ? totalSum / totalCount : null;
      })()
    : null;

  // Export as image using html2canvas
  const handleExport = async () => {
    if (!contentRef.current) return;
    
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `snapshot-${format(startDate, "yyyy-MM-dd")}.png`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("Snapshot exported!");
        }
      }, "image/png");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export snapshot");
    } finally {
      setExporting(false);
    }
  };

  // Share functionality
  const handleShare = async () => {
    const shareText = 
      `📊 My Week: ${snapshot?.name || "Week Record"}\n` +
      `${dateRange}\n\n` +
      `✅ ${record.daysCompleted}/7 days completed\n` +
      `⚡ ${totalXP} XP earned\n` +
      `🛡️ ${promisesKept}/${promisesTotal} promises kept\n` +
      (avgWellness ? `❤️ ${avgWellness.toFixed(1)}/5 avg wellness\n` : "") +
      `\nA quiet place to restart → thedashboard.agbcoaching.com\n\n` +
      `#TheDashboard`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Snapshot: ${snapshot?.name || "Week Record"}`,
          text: shareText,
        });
        toast.success("Shared! Thanks for spreading the word 🙏");
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== "AbortError") {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareText);
          toast.success("Copied to clipboard — ready to share!");
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard — ready to share!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden"
    >
      <div className="h-full flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header - with safe area padding for iOS PWA */}
        <div className="shrink-0 border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{snapshot?.emoji || "📅"}</span>
                <h1 className="text-lg font-display font-semibold truncate">
                  {snapshot?.name || "Week Record"}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">{dateRange}</p>
            </div>
            {/* Share/Export buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                title="Share snapshot"
                disabled={loading}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExport}
                title="Download as image"
                disabled={loading || exporting}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Badge
              variant="secondary"
              className={`shrink-0 ${
                record.status === "completed"
                  ? "bg-emerald-500/80 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {record.daysCompleted}/7 days
            </Badge>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div ref={contentRef} className="p-4 space-y-6 pb-20 bg-background">
            {/* Snapshot Theme */}
            {bucket && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bucket.emoji}</span>
                    <div>
                      <p className="font-medium text-foreground">{bucket.name}</p>
                      <p className="text-sm text-muted-foreground italic">
                        "{bucket.question}"
                      </p>
                    </div>
                  </div>
                  {snapshot && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Focus: <span className="capitalize font-medium text-foreground">{snapshot.focus}</span> — {snapshot.tagline}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="py-3 text-center">
                  <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <p className="text-lg font-bold text-foreground">{totalXP}</p>
                  <p className="text-xs text-muted-foreground">XP Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 text-center">
                  <Shield className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                  <p className="text-lg font-bold text-foreground">
                    {promisesKept}/{promisesTotal}
                  </p>
                  <p className="text-xs text-muted-foreground">Promises Kept</p>
                </CardContent>
              </Card>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="cursor-help">
                      <CardContent className="py-3 text-center">
                        <Heart className="w-4 h-4 mx-auto text-rose-500 mb-1" />
                        <p className="text-lg font-bold text-foreground">
                          {avgWellness ? avgWellness.toFixed(1) : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {avgWellness ? "Avg Wellness" : "Not tracked"}
                        </p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-center">
                    {avgWellness ? (
                      <p>Average of Sleep, Movement & Nutrition ratings (1-5 scale)</p>
                    ) : (
                      <p>Log your Battery Check on Day 4 to track Sleep, Movement & Nutrition</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading your week...</p>
              </div>
            ) : (
              <>
                {/* Daily Progress */}
                {data?.dailyResets && data.dailyResets.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Daily Check-ins
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.dailyResets.map((reset) => (
                        <div key={reset.day_number} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="text-xs">
                              Day {reset.day_number}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(reset.completed_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {reset.reflection && (
                            <p className="text-sm text-foreground italic">
                              "{reset.reflection}"
                            </p>
                          )}
                          {reset.commitment && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Commitment:</span> {reset.commitment}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Completed Actions */}
                {data?.completedActions && data.completedActions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Actions Completed ({data.completedActions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.completedActions.map((action) => (
                          <div
                            key={action.id}
                            className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{action.action_text}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {action.controllable && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {action.controllable}
                                  </Badge>
                                )}
                                <span>+{action.xp_awarded} XP</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Integrity (Promises) */}
                {data?.integrityLogs && data.integrityLogs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Promises Made
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.integrityLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0"
                          >
                            {log.kept === true ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            ) : log.kept === false ? (
                              <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-foreground">{log.promise_text}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.kept === true
                                  ? "Kept ✓"
                                  : log.kept === false
                                  ? "Not kept"
                                  : "Pending"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Time Reflections */}
                {data?.timeLogs && data.timeLogs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time Reflections
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.timeLogs.map((log, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {format(parseISO(log.log_date), "EEEE, MMM d")}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getIntentionalityLabel(log.time_invested_minutes)}
                              </Badge>
                            </div>
                            {log.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Wellness */}
                {data?.wellnessLogs && data.wellnessLogs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Wellness Logs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.wellnessLogs.map((log, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium text-foreground mb-2">
                              {format(parseISO(log.log_date), "EEEE, MMM d")}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Moon className="w-3 h-3 text-indigo-400" />
                                <span>{getRatingEmoji(log.sleep_rating)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Dumbbell className="w-3 h-3 text-orange-400" />
                                <span>{getRatingEmoji(log.movement_rating)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Apple className="w-3 h-3 text-green-400" />
                                <span>{getRatingEmoji(log.nutrition_rating)}</span>
                              </div>
                            </div>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* XP Activity */}
                {data?.xpLogs && data.xpLogs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        XP Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {data.xpLogs.slice(0, 10).map((log, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 text-sm border-b border-border/30 last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-foreground">
                                {log.description || log.source}
                              </span>
                            </div>
                            <span className="text-amber-500 font-medium shrink-0">
                              +{log.amount}
                            </span>
                          </div>
                        ))}
                        {data.xpLogs.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center pt-2">
                            +{data.xpLogs.length - 10} more entries
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {!data?.completedActions?.length &&
                  !data?.dailyResets?.length &&
                  !data?.timeLogs?.length &&
                  !data?.wellnessLogs?.length &&
                  !data?.integrityLogs?.length && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No detailed activity recorded for this week.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This is an honest record — showing exactly what happened.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                {/* Philosophy note */}
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground italic max-w-[280px] mx-auto">
                    "Each snapshot is an unbiased record in time — surfacing what's actually happening without judgment."
                  </p>
                </div>

                {/* Export Branding Footer - visible in exported image */}
                <div className="pt-6 mt-6 border-t border-border/30 text-center">
                  <p className="text-xs text-muted-foreground">
                    A quiet place to restart
                  </p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    thedashboard.agbcoaching.com
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
