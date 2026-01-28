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
  Zap,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  Circle,
  Play,
  RefreshCw,
  Lock,
  TrendingUp,
  Trophy,
  Award,
  Gift,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { BUCKETS, getSnapshotById, type BucketId } from "@/lib/snapshots";
import { useNavigate } from "react-router-dom";
import { SnapshotDetailView } from "@/components/experience/SnapshotDetailView";
import { WeeklyPatternView } from "@/components/experience/WeeklyPatternView";
import { SnapshotReviewModal } from "@/components/experience/SnapshotReviewModal";

interface SnapshotRecord {
  id: string;
  snapshotId: string | null;
  startDate: string;
  completedAt: string | null;
  status: "active" | "completed" | "expired" | "paused";
  daysCompleted: number;
  xpEarned: number;
  integrityDelta?: number;
}

interface SnapshotHistoryProps {
  sessions: SnapshotRecord[];
  className?: string;
  isPaid?: boolean;
  userId?: string;
  onStartNew?: () => void;
}

type ViewMode = "week" | "month" | "year" | "patterns";

// Get status info - enhanced with proof language for completed
function getStatusInfo(status: string, daysCompleted: number): { label: string; colorClass: string; isProof?: boolean } {
  if (status === "completed" && daysCompleted === 7) {
    return { label: "Proof Recorded", colorClass: "bg-emerald-500/80 text-white", isProof: true };
  }
  if (status === "completed") {
    return { label: "Completed", colorClass: "bg-emerald-500/80 text-white" };
  }
  if (status === "active") {
    return { label: "In Progress", colorClass: "bg-primary text-primary-foreground" };
  }
  if (daysCompleted >= 5) {
    return { label: "Almost", colorClass: "bg-amber-500/80 text-white" };
  }
  // No "incomplete" or "abandoned" - just neutral
  return { label: "Started", colorClass: "bg-muted text-muted-foreground" };
}

// Generate narrative for month - occasionally reference TGIM-style language
function getMonthNarrative(records: SnapshotRecord[]): string {
  if (records.length === 0) return "";
  
  // Find dominant bucket
  const bucketCounts = records.reduce((acc, r) => {
    const snapshot = r.snapshotId ? getSnapshotById(r.snapshotId) : null;
    if (snapshot) {
      acc[snapshot.bucketId] = (acc[snapshot.bucketId] || 0) + 1;
    }
    return acc;
  }, {} as Record<BucketId, number>);
  
  const topBucket = Object.entries(bucketCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  // Count restarts (snapshots after the first one)
  const restarts = records.length - 1;
  
  // Occasionally use TGIM-style language (not always - keep it subtle)
  if (restarts >= 2) {
    return "This month included a few quiet restarts.";
  }
  
  if (topBucket) {
    const narratives: Record<BucketId, string> = {
      "reset-reentry": "This month was about starting fresh.",
      "momentum-consistency": "This month was about building consistency.",
      "clarity-perspective": "This month was about gaining clarity.",
      "energy-care": "This month was about taking care of yourself.",
      "integrity-trust": "This month was about keeping your word.",
      "growth-expansion": "This month was about growing forward.",
    };
    return narratives[topBucket[0] as BucketId] || `This month was about ${BUCKETS[topBucket[0] as BucketId].name.toLowerCase()}.`;
  }
  
  return "This month, you showed up.";
}

// Generate narrative for year - occasionally reference TGIM-style language
function getYearNarrative(records: SnapshotRecord[]): string {
  if (records.length === 0) return "";
  
  const completed = records.filter(r => r.status === "completed").length;
  const returns = records.length - 1; // How many times they came back
  
  // Use TGIM-style language for resilience narratives
  if (returns >= 10) {
    return "This year, you kept giving yourself new beginnings.";
  }
  if (completed >= 10) {
    return "This year, you built something real.";
  }
  if (returns >= 5) {
    return "This year, you kept coming back.";
  }
  if (completed >= 5) {
    return "This year, you found your rhythm.";
  }
  if (records.length >= 3) {
    return "This year, you stayed in the game.";
  }
  return "This year, you started.";
}

// Get focus areas from records
function getFocusAreas(records: SnapshotRecord[]): { focus: string; count: number }[] {
  const focusCounts = records.reduce((acc, r) => {
    const snapshot = r.snapshotId ? getSnapshotById(r.snapshotId) : null;
    if (snapshot) {
      acc[snapshot.focus] = (acc[snapshot.focus] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(focusCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([focus, count]) => ({ focus, count }));
}

// Get primary bucket from records
function getPrimaryBucket(records: SnapshotRecord[]): { id: BucketId; count: number } | null {
  const bucketCounts = records.reduce((acc, r) => {
    const snapshot = r.snapshotId ? getSnapshotById(r.snapshotId) : null;
    if (snapshot) {
      acc[snapshot.bucketId] = (acc[snapshot.bucketId] || 0) + 1;
    }
    return acc;
  }, {} as Record<BucketId, number>);
  
  const top = Object.entries(bucketCounts).sort(([, a], [, b]) => b - a)[0];
  return top ? { id: top[0] as BucketId, count: top[1] } : null;
}

// Generate a unique visual based on week number for historical snapshots without journey data
function getHistoricalSnapshotVisual(startDate: Date, index: number): { emoji: string; name: string } {
  const weekOfYear = Math.ceil((startDate.getTime() - new Date(startDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const month = startDate.getMonth();
  
  // Cycle through visual variety based on week
  const visuals = [
    { emoji: "📝", name: "Week Record" },
    { emoji: "✨", name: "Progress Week" },
    { emoji: "🎯", name: "Focus Week" },
    { emoji: "💪", name: "Commitment Week" },
    { emoji: "🌟", name: "Growth Week" },
    { emoji: "🔥", name: "Momentum Week" },
  ];
  
  return visuals[(weekOfYear + index) % visuals.length];
}

// Week View: Snapshot Card (the unit of work)
function WeekCard({
  record,
  index = 0,
  onClick,
  onViewSnapshot,
}: {
  record: SnapshotRecord;
  index?: number;
  onClick?: () => void;
  onViewSnapshot?: () => void;
}) {
  const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;
  const statusInfo = getStatusInfo(record.status, record.daysCompleted);
  const startDate = new Date(record.startDate);
  const dateRange = `${format(startDate, "MMM d")} - ${format(addDays(startDate, 6), "d")}`;
  const isActive = record.status === "active";
  const isFullyCompleted = record.status === "completed" && record.daysCompleted === 7;
  
  // For historical snapshots without journey data, generate unique visuals
  const historicalVisual = !snapshot ? getHistoricalSnapshotVisual(startDate, index) : null;
  const displayEmoji = snapshot?.emoji || historicalVisual?.emoji || "📅";
  const displayName = snapshot?.name || historicalVisual?.name || "Week Record";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-all ${
        isActive 
          ? "bg-primary/5 border-primary/30" 
          : isFullyCompleted
          ? "bg-emerald-500/5 border-emerald-500/30"
          : "bg-card border-border"
      }`}
    >
      {/* Header - clickable for details */}
      <div 
        className="flex items-start gap-3 mb-3 cursor-pointer hover:opacity-80"
        onClick={onClick}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center relative ${
          isActive ? "bg-primary/20" : isFullyCompleted ? "bg-emerald-500/20" : "bg-muted"
        }`}>
          <span className="text-xl">{displayEmoji}</span>
          {/* Trophy badge for 7/7 completed */}
          {isFullyCompleted && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Trophy className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">{dateRange}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusInfo.isProof ? (
            <Badge variant="secondary" className={`text-xs shrink-0 ${statusInfo.colorClass}`}>
              <Trophy className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          ) : (
            <Badge variant="secondary" className={`text-xs shrink-0 ${statusInfo.colorClass}`}>
              {statusInfo.label}
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Bucket & Focus - only show if we have actual snapshot data */}
      {bucket && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span>{bucket.emoji} {bucket.name}</span>
          {snapshot && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="capitalize">{snapshot.focus}</span>
            </>
          )}
        </div>
      )}

      {/* Completion Dots - soft, neutral */}
      <div className="flex gap-1.5 mb-3">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div
            key={day}
            className={`flex-1 h-2 rounded-full transition-colors ${
              day <= record.daysCompleted
                ? record.status === "completed" 
                  ? "bg-emerald-500/80" 
                  : "bg-primary/80"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Footer: Days + XP + Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {record.daysCompleted}/7 days
        </span>
        <div className="flex items-center gap-2">
          {record.xpEarned > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3" />
              +{record.xpEarned}
            </span>
          )}
          {record.status !== "active" && onViewSnapshot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewSnapshot();
              }}
              className={`flex items-center gap-1 text-xs font-medium hover:underline ${
                isFullyCompleted 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-primary/70"
              }`}
            >
              <Gift className="w-3 h-3" />
              Review This Week
            </button>
          )}
          {record.status === "active" && (
            <span 
              className="text-xs text-primary/70 cursor-pointer hover:underline"
              onClick={onClick}
            >
              View details →
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Month View: Meaning + Pattern
function MonthView({
  records,
  label,
  onSelectRecord,
}: {
  records: SnapshotRecord[];
  label: string;
  onSelectRecord?: (record: SnapshotRecord) => void;
}) {
  const narrative = getMonthNarrative(records);
  const completed = records.filter(r => r.status === "completed").length;
  const primaryBucket = getPrimaryBucket(records);
  const focusAreas = getFocusAreas(records);
  const totalXP = records.reduce((sum, r) => sum + r.xpEarned, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-card border border-border"
    >
      {/* Month label */}
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      
      {/* Narrative - the emotional anchor */}
      <p className="text-lg font-medium text-foreground mb-4 leading-snug">
        {narrative}
      </p>

      {/* Snapshot count */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-foreground">
          <span className="font-semibold">{records.length}</span> Snapshot{records.length !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{completed}</span> completed
        </span>
      </div>

      {/* Primary Bucket */}
      {primaryBucket && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{BUCKETS[primaryBucket.id].emoji}</span>
          <span className="text-sm text-foreground">{BUCKETS[primaryBucket.id].name}</span>
        </div>
      )}

      {/* Focus chips */}
      {focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {focusAreas.map(({ focus, count }) => (
            <Badge key={focus} variant="secondary" className="text-xs capitalize">
              {focus} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* XP - subdued */}
      {totalXP > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4">
          <Zap className="w-3 h-3" />
          +{totalXP} XP earned
        </p>
      )}

      {/* Week breakdown - clickable list */}
      <div className="border-t border-border pt-3 mt-3">
        <p className="text-xs text-muted-foreground mb-2">Weekly breakdown</p>
        <div className="space-y-2">
          {records.slice(0, 4).map((record) => {
            const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
            const statusInfo = getStatusInfo(record.status, record.daysCompleted);
            const startDate = new Date(record.startDate);
            
            return (
              <motion.button
                key={record.id}
                onClick={() => onSelectRecord?.(record)}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-base">{snapshot?.emoji || "📅"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{snapshot?.name || "Week Record"}</p>
                  <p className="text-xs text-muted-foreground">{format(startDate, "MMM d")}</p>
                </div>
                <Badge variant="secondary" className={`text-xs shrink-0 ${statusInfo.colorClass}`}>
                  {record.daysCompleted}/7
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            );
          })}
          {records.length > 4 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{records.length - 4} more weeks
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Year View: Identity + Story
function YearView({
  records,
  year,
  onSelectRecord,
}: {
  records: SnapshotRecord[];
  year: string;
  onSelectRecord?: (record: SnapshotRecord) => void;
}) {
  const narrative = getYearNarrative(records);
  const completed = records.filter(r => r.status === "completed").length;
  const primaryBucket = getPrimaryBucket(records);
  const focusAreas = getFocusAreas(records);
  const returns = records.length - 1; // Times they came back

  // Group by month for the breakdown
  const monthBreakdown = useMemo(() => {
    const groups = new Map<string, SnapshotRecord[]>();
    records.forEach((record) => {
      const monthKey = format(new Date(record.startDate), "yyyy-MM");
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(record);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, recs]) => ({
        key,
        label: format(new Date(key + "-01"), "MMMM"),
        records: recs,
      }));
  }, [records]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-muted/30 border border-primary/20"
    >
      {/* Year label */}
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{year}</p>
      
      {/* Year Narrative - the signature line */}
      <p className="text-xl font-display font-semibold text-foreground mb-5 leading-snug">
        {narrative}
      </p>

      {/* Stats grid - no percentages, no rankings */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-xs text-muted-foreground">Snapshots taken</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completed}</p>
          <p className="text-xs text-muted-foreground">Weeks completed</p>
        </div>
      </div>

      {/* Most returned bucket */}
      {primaryBucket && (
        <div className="p-3 rounded-lg bg-background/50 border border-border mb-4">
          <p className="text-xs text-muted-foreground mb-1">Most returned to</p>
          <div className="flex items-center gap-2">
            <span className="text-xl">{BUCKETS[primaryBucket.id].emoji}</span>
            <span className="text-sm font-medium text-foreground">{BUCKETS[primaryBucket.id].name}</span>
          </div>
        </div>
      )}

      {/* Primary focus */}
      {focusAreas.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Primary focus</p>
          <p className="text-sm font-medium text-foreground capitalize">{focusAreas[0].focus}</p>
        </div>
      )}

      {/* Returns - reinforces resilience */}
      {returns > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4">
          <RefreshCw className="w-3 h-3" />
          You came back {returns} time{returns !== 1 ? "s" : ""}
        </p>
      )}

      {/* Month breakdown - clickable */}
      <div className="border-t border-border pt-3 mt-3">
        <p className="text-xs text-muted-foreground mb-2">Monthly breakdown</p>
        <div className="space-y-2">
          {monthBreakdown.slice(0, 6).map(({ key, label, records: monthRecords }) => {
            const monthCompleted = monthRecords.filter(r => r.status === "completed").length;
            
            return (
              <div
                key={key}
                className="p-2 rounded-lg bg-background/50 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{label}</p>
                  <Badge variant="secondary" className="text-xs">
                    {monthCompleted}/{monthRecords.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {monthRecords.slice(0, 4).map((record) => {
                    const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
                    
                    return (
                      <motion.button
                        key={record.id}
                        onClick={() => onSelectRecord?.(record)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors text-xs"
                        whileTap={{ scale: 0.95 }}
                      >
                        <span>{snapshot?.emoji || "📅"}</span>
                        <span className="text-muted-foreground">{record.daysCompleted}/7</span>
                      </motion.button>
                    );
                  })}
                  {monthRecords.length > 4 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      +{monthRecords.length - 4}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Locked view placeholder
function LockedView({ viewType, requiredCount }: { viewType: string; requiredCount: number }) {
  return (
    <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/30 text-center">
      <Lock className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">
        Complete {requiredCount}+ Snapshots to unlock {viewType} view
      </p>
    </div>
  );
}

export function SnapshotHistory({ sessions, className, isPaid = false, userId, onStartNew }: SnapshotHistoryProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedRecord, setSelectedRecord] = useState<SnapshotRecord | null>(null);
  const [showOlderWeeks, setShowOlderWeeks] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

  // Filter to only show sessions with meaningful data
  const validSessions = useMemo(() => 
    sessions.filter(s => s.daysCompleted > 0 || s.status === "active"),
    [sessions]
  );

  // Progressive unlock logic
  const canViewMonth = validSessions.length >= 3;
  const canViewYear = validSessions.length >= 6 || isPaid;

  // Group sessions by time period
  const monthGroups = useMemo(() => {
    const groups = new Map<string, SnapshotRecord[]>();
    validSessions.forEach((session) => {
      const monthKey = format(new Date(session.startDate), "yyyy-MM");
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(session);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, records]) => ({
        key,
        label: format(new Date(key + "-01"), "MMMM yyyy"),
        records,
      }));
  }, [validSessions]);

  const yearGroups = useMemo(() => {
    const groups = new Map<string, SnapshotRecord[]>();
    validSessions.forEach((session) => {
      const yearKey = format(new Date(session.startDate), "yyyy");
      if (!groups.has(yearKey)) {
        groups.set(yearKey, []);
      }
      groups.get(yearKey)!.push(session);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, records]) => ({ year: key, records }));
  }, [validSessions]);

  // Sort weeks most recent first
  const sortedWeeks = useMemo(() => 
    [...validSessions].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ),
    [validSessions]
  );

  const handleContinue = () => navigate("/reset");

  if (validSessions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Your history starts here.
          </p>
          {onStartNew && (
            <Button variant="outline" onClick={onStartNew}>
              Start your first Snapshot
            </Button>
          )}
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
            Your Story
          </CardTitle>
          
          {/* Only show tabs if there's enough data */}
          {validSessions.length >= 2 && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger 
                  value="patterns" 
                  className="text-xs px-2 h-6"
                >
                  Patterns
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-2 h-6">
                  Week
                </TabsTrigger>
                <TabsTrigger 
                  value="month" 
                  className="text-xs px-2 h-6"
                  disabled={!canViewMonth}
                >
                  Month
                </TabsTrigger>
                <TabsTrigger 
                  value="year" 
                  className="text-xs px-2 h-6"
                  disabled={!canViewYear}
                >
                  Year
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <AnimatePresence mode="wait">
          {viewMode === "week" && (
            <motion.div
              key="week"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Show only the first (current/most recent) week */}
              {sortedWeeks.slice(0, 1).map((record, index) => (
                <WeekCard
                  key={record.id}
                  record={record}
                  index={index}
                  onClick={() => setSelectedRecord(record)}
                  onViewSnapshot={record.status !== "active" && userId
                    ? () => setReviewSessionId(record.id)
                    : undefined
                  }
                />
              ))}

              {/* Collapsible section for older weeks */}
              {sortedWeeks.length > 1 && (
                <>
                  <button
                    onClick={() => setShowOlderWeeks(!showOlderWeeks)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {sortedWeeks.length - 1} previous {sortedWeeks.length === 2 ? 'week' : 'weeks'}
                    </span>
                    <motion.div
                      animate={{ rotate: showOlderWeeks ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {showOlderWeeks && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-3 overflow-hidden"
                      >
                        {sortedWeeks.slice(1).map((record, index) => (
                          <WeekCard
                            key={record.id}
                            record={record}
                            index={index + 1}
                            onClick={() => setSelectedRecord(record)}
                            onViewSnapshot={record.status !== "active" && userId
                              ? () => setReviewSessionId(record.id)
                              : undefined
                            }
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {viewMode === "patterns" && (
            <motion.div
              key="patterns"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <WeeklyPatternView snapshots={validSessions} userId={userId} isPaid={isPaid} />
            </motion.div>
          )}


          {viewMode === "month" && (
            <motion.div
              key="month"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {canViewMonth ? (
                monthGroups.map(({ key, label, records }) => (
                  <MonthView 
                    key={key} 
                    records={records} 
                    label={label} 
                    onSelectRecord={setSelectedRecord}
                  />
                ))
              ) : (
                <LockedView viewType="Month" requiredCount={3} />
              )}
            </motion.div>
          )}

          {viewMode === "year" && (
            <motion.div
              key="year"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {canViewYear ? (
                yearGroups.map(({ year, records }) => (
                  <YearView 
                    key={year} 
                    records={records} 
                    year={year} 
                    onSelectRecord={setSelectedRecord}
                  />
                ))
              ) : (
                <LockedView viewType="Year" requiredCount={6} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <SnapshotDetailView
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </AnimatePresence>

      {/* Snapshot Review Modal */}
      <AnimatePresence>
        {reviewSessionId && userId && (
          <SnapshotReviewModal
            sessionId={reviewSessionId}
            userId={userId}
            isPaid={isPaid}
            onClose={() => setReviewSessionId(null)}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
