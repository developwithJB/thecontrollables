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
  Layers,
  CheckCircle2,
  Circle,
  Play,
  RefreshCw,
  Lock,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { BUCKETS, getSnapshotById, type BucketId } from "@/lib/snapshots";
import { useNavigate } from "react-router-dom";

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
  onStartNew?: () => void;
}

type ViewMode = "week" | "month" | "year";

// Get status info - no negative language
function getStatusInfo(status: string, daysCompleted: number): { label: string; colorClass: string } {
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

// Generate narrative for month
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
  
  if (topBucket) {
    const bucket = BUCKETS[topBucket[0] as BucketId];
    const narratives: Record<BucketId, string> = {
      "reset-reentry": "This month was about starting fresh.",
      "momentum-consistency": "This month was about building consistency.",
      "clarity-perspective": "This month was about gaining clarity.",
      "energy-care": "This month was about taking care of yourself.",
      "integrity-trust": "This month was about keeping your word.",
      "growth-expansion": "This month was about growing forward.",
    };
    return narratives[topBucket[0] as BucketId] || `This month was about ${bucket.name.toLowerCase()}.`;
  }
  
  return "This month, you showed up.";
}

// Generate narrative for year
function getYearNarrative(records: SnapshotRecord[]): string {
  if (records.length === 0) return "";
  
  const completed = records.filter(r => r.status === "completed").length;
  const returns = records.length - 1; // How many times they came back
  
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

// Week View: Snapshot Card (the unit of work)
function WeekCard({
  record,
  onContinue,
}: {
  record: SnapshotRecord;
  onContinue?: () => void;
}) {
  const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;
  const statusInfo = getStatusInfo(record.status, record.daysCompleted);
  const startDate = new Date(record.startDate);
  const dateRange = `${format(startDate, "MMM d")} - ${format(addDays(startDate, 6), "d")}`;
  const isActive = record.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-all ${
        isActive 
          ? "bg-primary/5 border-primary/30" 
          : "bg-card border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isActive ? "bg-primary/20" : "bg-muted"
        }`}>
          <span className="text-xl">{snapshot?.emoji || "📅"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {snapshot?.name || "7-Day Snapshot"}
          </p>
          <p className="text-xs text-muted-foreground">{dateRange}</p>
        </div>
        <Badge variant="secondary" className={`text-xs shrink-0 ${statusInfo.colorClass}`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Bucket & Focus */}
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

      {/* Footer: Days + XP */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {record.daysCompleted}/7 days
        </span>
        {record.xpEarned > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" />
            +{record.xpEarned}
          </span>
        )}
      </div>

      {/* CTA for active */}
      {isActive && onContinue && (
        <Button 
          onClick={onContinue}
          size="sm" 
          className="w-full mt-3"
        >
          <Play className="w-3 h-3 mr-1" />
          Finish this Snapshot
        </Button>
      )}
    </motion.div>
  );
}

// Month View: Meaning + Pattern
function MonthView({
  records,
  label,
}: {
  records: SnapshotRecord[];
  label: string;
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
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3" />
          +{totalXP} XP earned
        </p>
      )}
    </motion.div>
  );
}

// Year View: Identity + Story
function YearView({
  records,
  year,
}: {
  records: SnapshotRecord[];
  year: string;
}) {
  const narrative = getYearNarrative(records);
  const completed = records.filter(r => r.status === "completed").length;
  const primaryBucket = getPrimaryBucket(records);
  const focusAreas = getFocusAreas(records);
  const returns = records.length - 1; // Times they came back

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
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          You came back {returns} time{returns !== 1 ? "s" : ""}
        </p>
      )}
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

export function SnapshotHistory({ sessions, className, isPaid = false, onStartNew }: SnapshotHistoryProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("week");

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
              {sortedWeeks.map((record) => (
                <WeekCard
                  key={record.id}
                  record={record}
                  onContinue={record.status === "active" ? handleContinue : undefined}
                />
              ))}
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
                  <MonthView key={key} records={records} label={label} />
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
                  <YearView key={year} records={records} year={year} />
                ))
              ) : (
                <LockedView viewType="Year" requiredCount={6} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
