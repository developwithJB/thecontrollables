import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
  Calendar, 
  CalendarCheck, 
  TrendingUp,
  Zap,
  Trophy,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear, isWithinInterval, subDays, eachWeekOfInterval, eachMonthOfInterval, addDays, endOfMonth, isSameMonth, isSameYear } from "date-fns";
import { BUCKETS, SNAPSHOTS, getSnapshotById, type BucketId, type Snapshot } from "@/lib/snapshots";

interface SnapshotRecord {
  id: string;
  snapshotId: string | null;
  startDate: string;
  completedAt: string | null;
  status: "active" | "completed" | "expired" | "paused";
  daysCompleted: number;
  xpEarned: number;
  integrityDelta?: number; // Promises kept minus broken
}

interface SnapshotHistoryProps {
  sessions: SnapshotRecord[];
  className?: string;
}

type ViewMode = "week" | "month" | "year";

// Generate color based on completion percentage
function getBrickColor(completionRate: number, bucketId?: BucketId): string {
  if (completionRate === 0) return "bg-muted text-muted-foreground";
  if (completionRate < 0.3) return "bg-red-500/80 dark:bg-red-400/70 text-white dark:text-red-50";
  if (completionRate < 0.7) return "bg-amber-500/80 dark:bg-amber-400/70 text-white dark:text-amber-50";
  if (completionRate < 1) return "bg-emerald-500/80 dark:bg-emerald-400/70 text-white dark:text-emerald-50";
  return "bg-primary text-primary-foreground";
}

// Single brick component representing a 7-day snapshot
function SnapshotBrick({
  record,
  isExpanded,
  onClick,
}: {
  record: SnapshotRecord;
  isExpanded: boolean;
  onClick: () => void;
}) {
  const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;
  const completionRate = record.daysCompleted / 7;
  const isComplete = record.status === "completed";

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group transition-all ${
        isExpanded ? "col-span-full" : ""
      }`}
    >
      <motion.div
        layout
        className={`rounded-lg border transition-all overflow-hidden ${
          getBrickColor(completionRate)
        } ${isComplete ? "border-primary/30" : "border-border"} ${
          isExpanded ? "p-4" : "p-2"
        }`}
      >
        {/* Compact view */}
        {!isExpanded ? (
          <div className="flex flex-col items-center justify-center min-h-[48px]">
            <span className="text-lg">{snapshot?.emoji || "📅"}</span>
            <span className="text-[10px] font-semibold mt-0.5">
              {record.daysCompleted}/7
            </span>
          </div>
        ) : (
          /* Expanded view */
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{snapshot?.emoji || "📅"}</span>
                <div className="text-left">
                  <p className="font-medium text-sm text-foreground">
                    {snapshot?.name || "Unknown Snapshot"}
                  </p>
                  {bucket && (
                    <p className="text-xs text-muted-foreground">
                      {bucket.emoji} {bucket.name}
                    </p>
                  )}
                </div>
              </div>
              {isComplete && (
                <Badge variant="default" className="text-xs">
                  <Trophy className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {format(new Date(record.startDate), "MMM d")}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                +{record.xpEarned} XP
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {record.daysCompleted}/7 days
              </span>
            </div>

            {/* Day completion grid */}
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={`flex-1 h-2 rounded-sm ${
                    day <= record.daysCompleted
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completion indicator corner */}
        {isComplete && !isExpanded && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
            <Trophy className="w-2 h-2 text-primary-foreground" />
          </div>
        )}
      </motion.div>
    </motion.button>
  );
}

// Stack of bricks representing aggregated time period
function BrickStack({
  records,
  label,
  sublabel,
  isExpanded,
  onClick,
}: {
  records: SnapshotRecord[];
  label: string;
  sublabel?: string;
  isExpanded: boolean;
  onClick: () => void;
}) {
  const totalDays = records.reduce((sum, r) => sum + r.daysCompleted, 0);
  const totalXP = records.reduce((sum, r) => sum + r.xpEarned, 0);
  const completedCount = records.filter((r) => r.status === "completed").length;
  const avgCompletion = records.length > 0 ? totalDays / (records.length * 7) : 0;

  // Get bucket distribution
  const bucketCounts = records.reduce((acc, r) => {
    const snapshot = r.snapshotId ? getSnapshotById(r.snapshotId) : null;
    if (snapshot) {
      acc[snapshot.bucketId] = (acc[snapshot.bucketId] || 0) + 1;
    }
    return acc;
  }, {} as Record<BucketId, number>);

  const topBuckets = Object.entries(bucketCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group transition-all ${isExpanded ? "col-span-full" : ""}`}
    >
      <motion.div
        layout
        className={`rounded-xl border border-border bg-card transition-all overflow-hidden ${
          isExpanded ? "p-4" : "p-3"
        }`}
      >
        {!isExpanded ? (
          /* Compact stacked view */
          <div className="flex flex-col items-center">
            {/* Visual brick stack */}
            <div className="relative w-12 mb-2">
              {records.slice(0, 4).map((record, idx) => {
                const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
                const completionRate = record.daysCompleted / 7;
                return (
                  <motion.div
                    key={record.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ 
                      zIndex: records.length - idx,
                      marginTop: idx > 0 ? "-4px" : 0
                    }}
                    className={`w-full h-6 rounded-sm border border-background/50 flex items-center justify-center text-xs ${
                      getBrickColor(completionRate, snapshot?.bucketId)
                    }`}
                  >
                    {snapshot?.emoji || "📅"}
                  </motion.div>
                );
              })}
              {records.length > 4 && (
                <div className="text-[10px] text-muted-foreground text-center mt-1">
                  +{records.length - 4}
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-foreground">{label}</p>
            {sublabel && (
              <p className="text-[10px] text-muted-foreground">{sublabel}</p>
            )}
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <span>{completedCount}</span>
              <Trophy className="w-2.5 h-2.5" />
            </div>
          </div>
        ) : (
          /* Expanded view */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{label}</p>
                {sublabel && (
                  <p className="text-xs text-muted-foreground">{sublabel}</p>
                )}
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{records.length}</p>
                <p className="text-[10px] text-muted-foreground">Snapshots</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-primary">+{totalXP}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>

            {/* Bucket breakdown */}
            {topBuckets.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Focus Areas</p>
                <div className="flex flex-wrap gap-1">
                  {topBuckets.map(([bucketId, count]) => {
                    const bucket = BUCKETS[bucketId as BucketId];
                    return (
                      <Badge key={bucketId} variant="secondary" className="text-xs">
                        {bucket.emoji} {bucket.name} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual bricks in expanded */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 pt-2 border-t border-border">
              {records.map((record) => {
                const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
                const completionRate = record.daysCompleted / 7;
                return (
                  <div
                    key={record.id}
                    className={`h-8 rounded flex items-center justify-center text-sm ${getBrickColor(completionRate)}`}
                    title={`${snapshot?.name || "Unknown"}: ${record.daysCompleted}/7 days`}
                  >
                    {snapshot?.emoji || "📅"}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.button>
  );
}

export function SnapshotHistory({ sessions, className }: SnapshotHistoryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter to only show sessions with meaningful data
  const validSessions = useMemo(() => 
    sessions.filter(s => s.daysCompleted > 0 || s.status === "active"),
    [sessions]
  );

  // Group sessions by time period
  const groupedData = useMemo(() => {
    if (validSessions.length === 0) return [];

    const now = new Date();

    if (viewMode === "week") {
      // Show individual weeks as bricks
      return validSessions.map((session) => ({
        type: "single" as const,
        id: session.id,
        record: session,
        label: format(new Date(session.startDate), "MMM d"),
      }));
    }

    if (viewMode === "month") {
      // Group by month
      const monthGroups = new Map<string, SnapshotRecord[]>();
      validSessions.forEach((session) => {
        const monthKey = format(new Date(session.startDate), "yyyy-MM");
        if (!monthGroups.has(monthKey)) {
          monthGroups.set(monthKey, []);
        }
        monthGroups.get(monthKey)!.push(session);
      });

      return Array.from(monthGroups.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthKey, records]) => ({
          type: "stack" as const,
          id: monthKey,
          records,
          label: format(new Date(monthKey + "-01"), "MMMM"),
          sublabel: format(new Date(monthKey + "-01"), "yyyy"),
        }));
    }

    // Year view
    const yearGroups = new Map<string, SnapshotRecord[]>();
    validSessions.forEach((session) => {
      const yearKey = format(new Date(session.startDate), "yyyy");
      if (!yearGroups.has(yearKey)) {
        yearGroups.set(yearKey, []);
      }
      yearGroups.get(yearKey)!.push(session);
    });

    return Array.from(yearGroups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([yearKey, records]) => ({
        type: "stack" as const,
        id: yearKey,
        records,
        label: yearKey,
        sublabel: `${records.length} snapshots`,
      }));
  }, [validSessions, viewMode]);

  // Summary stats
  const stats = useMemo(() => {
    const completed = validSessions.filter((s) => s.status === "completed").length;
    const totalXP = validSessions.reduce((sum, s) => sum + s.xpEarned, 0);
    const avgDays = validSessions.length > 0
      ? validSessions.reduce((sum, s) => sum + s.daysCompleted, 0) / validSessions.length
      : 0;
    return { total: validSessions.length, completed, totalXP, avgDays };
  }, [validSessions]);

  if (validSessions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No Snapshot history yet. Start your first 7-day Snapshot!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Snapshot History
          </CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs px-2 h-6">
                <CalendarDays className="w-3 h-3 mr-1" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2 h-6">
                <Calendar className="w-3 h-3 mr-1" />
                Month
              </TabsTrigger>
              <TabsTrigger value="year" className="text-xs px-2 h-6">
                <CalendarCheck className="w-3 h-3 mr-1" />
                Year
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">+{stats.totalXP}</p>
            <p className="text-[10px] text-muted-foreground">XP</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{stats.avgDays.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Avg Days</p>
          </div>
        </div>

        {/* Brick Grid */}
        <motion.div
          layout
          className={`grid gap-2 ${
            viewMode === "week"
              ? "grid-cols-4 sm:grid-cols-7"
              : viewMode === "month"
              ? "grid-cols-3 sm:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          <AnimatePresence mode="popLayout">
            {groupedData.map((item) => {
              const isExpanded = expandedId === item.id;

              if (item.type === "single") {
                return (
                  <SnapshotBrick
                    key={item.id}
                    record={item.record}
                    isExpanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  />
                );
              }

              return (
                <BrickStack
                  key={item.id}
                  records={item.records}
                  label={item.label}
                  sublabel={item.sublabel}
                  isExpanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  );
}
