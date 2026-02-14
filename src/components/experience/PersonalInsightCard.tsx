import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, TrendingUp, ChevronDown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, parseISO, format } from "date-fns";

interface PersonalInsightCardProps {
  userId: string;
}

// SVG Circular Progress Gauge
function CircularGauge({ value, size = 100, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform={`rotate(-90 ${center} ${center})`}
      />
      {/* Center text */}
      <text
        x={center}
        y={center - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-display font-bold"
        fontSize="22"
      >
        {value}%
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground"
        fontSize="10"
      >
        kept
      </text>
    </svg>
  );
}

// Mini sparkline SVG
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 32;
  const padding = 4;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {values.length > 0 && (() => {
        const lastIdx = values.length - 1;
        const x = padding + (lastIdx / (values.length - 1)) * (width - padding * 2);
        const y = height - padding - ((values[lastIdx] - min) / range) * (height - padding * 2);
        return <circle cx={x} cy={y} r="2.5" fill="hsl(var(--primary))" />;
      })()}
    </svg>
  );
}

const CONTROLLABLE_LABELS: Record<string, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

export function PersonalInsightCard({ userId }: PersonalInsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Fetch integrity logs
  const { data: integrityLogs = [] } = useQuery({
    queryKey: ["experience-integrity-logs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrity_logs")
        .select("promised_at, kept, kept_at")
        .eq("user_id", userId)
        .order("promised_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch completed actions for focus breakdown
  const { data: completedActions = [] } = useQuery({
    queryKey: ["experience-completed-actions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("completed_actions")
        .select("controllable, xp_awarded, completed_at")
        .eq("user_id", userId);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch XP logs for impact calculation
  const { data: xpLogs = [] } = useQuery({
    queryKey: ["experience-xp-total", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("xp_logs")
        .select("amount, source, created_at")
        .eq("user_id", userId);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch reset sessions for sparkline
  const { data: sessions = [] } = useQuery({
    queryKey: ["experience-sessions-sparkline", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reset_sessions")
        .select("id, start_date, completed_at, status")
        .eq("user_id", userId)
        .order("start_date", { ascending: true });
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const resolved = integrityLogs.filter(l => l.kept !== null);
    const kept = resolved.filter(l => l.kept === true);
    const overallRate = resolved.length > 0 ? Math.round((kept.length / resolved.length) * 100) : 0;

    // Monthly trend
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));

    const thisMonthLogs = resolved.filter(l => new Date(l.promised_at) >= thisMonthStart);
    const lastMonthLogs = resolved.filter(l => {
      const d = new Date(l.promised_at);
      return d >= lastMonthStart && d < thisMonthStart;
    });

    const thisMonthRate = thisMonthLogs.length > 0
      ? Math.round((thisMonthLogs.filter(l => l.kept).length / thisMonthLogs.length) * 100)
      : null;
    const lastMonthRate = lastMonthLogs.length > 0
      ? Math.round((lastMonthLogs.filter(l => l.kept).length / lastMonthLogs.length) * 100)
      : null;

    const trendDiff = thisMonthRate !== null && lastMonthRate !== null
      ? thisMonthRate - lastMonthRate
      : null;

    // Focus area breakdown from completed actions
    const focusBreakdown: Record<string, { total: number; completed: number }> = {};
    completedActions.forEach(a => {
      const c = a.controllable || "unknown";
      if (!focusBreakdown[c]) focusBreakdown[c] = { total: 0, completed: 0 };
      focusBreakdown[c].total++;
      focusBreakdown[c].completed++;
    });

    // Total XP from integrity-related sources
    const integrityXp = xpLogs
      .filter(l => l.source === "promise_kept" || l.source === "integrity")
      .reduce((sum, l) => sum + l.amount, 0);
    const totalXp = xpLogs.reduce((sum, l) => sum + l.amount, 0);

    // Sparkline: promise-keeping rate per session period (last 6)
    // Simple approach: group integrity logs by month for the last 6 months
    const sparklineValues: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = i > 0 ? startOfMonth(subMonths(now, i - 1)) : now;
      const monthLogs = resolved.filter(l => {
        const d = new Date(l.promised_at);
        return d >= monthStart && d < monthEnd;
      });
      if (monthLogs.length > 0) {
        sparklineValues.push(Math.round((monthLogs.filter(l => l.kept).length / monthLogs.length) * 100));
      } else {
        sparklineValues.push(sparklineValues.length > 0 ? sparklineValues[sparklineValues.length - 1] : 0);
      }
    }

    return {
      overallRate,
      trendDiff,
      thisMonthRate,
      focusBreakdown,
      integrityXp,
      totalXp,
      sparklineValues,
      totalPromises: integrityLogs.length,
      resolvedPromises: resolved.length,
    };
  }, [integrityLogs, completedActions, xpLogs]);

  if (stats.totalPromises === 0) {
    return null; // Don't show card if no promises made yet
  }

  const focusEntries = Object.entries(stats.focusBreakdown)
    .filter(([key]) => key !== "unknown" && CONTROLLABLE_LABELS[key])
    .sort((a, b) => b[1].completed - a[1].completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Personal Integrity</h3>
            <p className="text-xs text-muted-foreground">Your promise-keeping rate</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main gauge + trend */}
        <div className="flex items-center gap-4">
          <CircularGauge value={stats.overallRate} />
          <div className="flex-1 space-y-2">
            {/* Trend indicator */}
            {stats.trendDiff !== null && (
              <div className={`flex items-center gap-1 text-sm ${stats.trendDiff >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                <TrendingUp className={`w-4 h-4 ${stats.trendDiff < 0 ? "rotate-180" : ""}`} />
                <span>{stats.trendDiff >= 0 ? "+" : ""}{stats.trendDiff}% from last month</span>
              </div>
            )}

            {/* Mini sparkline */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last 6 months</p>
              <Sparkline values={stats.sparklineValues} />
            </div>

            {/* XP impact */}
            {stats.totalXp > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-accent" />
                <span>{stats.totalXp.toLocaleString()} XP earned total</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable focus breakdown */}
        {focusEntries.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="uppercase tracking-wider">Focus Area Breakdown</span>
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-3">
                    {focusEntries.map(([key, val]) => {
                      const info = CONTROLLABLE_LABELS[key];
                      if (!info) return null;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm w-5 text-center">{info.emoji}</span>
                          <span className="text-xs text-foreground w-20">{info.label}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (val.completed / Math.max(1, focusEntries[0][1].completed)) * 100)}%` }}
                              transition={{ duration: 0.5 }}
                              className="h-full bg-primary rounded-full"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{val.completed}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
