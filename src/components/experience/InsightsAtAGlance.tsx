import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Trophy, Star, TrendingUp, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, getDay, parseISO, differenceInDays, startOfYear } from "date-fns";

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface InsightsAtAGlanceProps {
  userId: string;
  consecutiveStreak?: number;
}

export function InsightsAtAGlance({ userId, consecutiveStreak = 0 }: InsightsAtAGlanceProps) {
  // Fetch daily checkins for streak & pattern data
  const { data: checkins = [] } = useQuery({
    queryKey: ["experience-checkins-insights", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("check_in_date")
        .eq("user_id", userId)
        .order("check_in_date", { ascending: true });
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch completed actions for day-of-week analysis
  const { data: actions = [] } = useQuery({
    queryKey: ["experience-actions-insights", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("completed_actions")
        .select("completed_at")
        .eq("user_id", userId);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const insights = useMemo(() => {
    // Longest streak from checkin dates
    const dates = [...new Set(checkins.map(c => c.check_in_date))].sort();
    let longestStreak = 0;
    let longestStreakStart = "";
    let longestStreakEnd = "";
    let currentRun = 1;
    let runStart = dates[0] || "";

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = differenceInDays(curr, prev);
      if (diff === 1) {
        currentRun++;
      } else {
        if (currentRun > longestStreak) {
          longestStreak = currentRun;
          longestStreakStart = runStart;
          longestStreakEnd = dates[i - 1];
        }
        currentRun = 1;
        runStart = dates[i];
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
      longestStreakStart = runStart;
      longestStreakEnd = dates[dates.length - 1] || "";
    }

    // Best day of week
    const dayActionCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayActionCounts[i] = 0;
    actions.forEach(a => {
      const day = getDay(parseISO(a.completed_at));
      dayActionCounts[day]++;
    });
    const bestDayIdx = Object.entries(dayActionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    const bestDay = bestDayIdx !== undefined ? DAY_NAMES_FULL[parseInt(bestDayIdx)] : "N/A";
    const bestDayCount = bestDayIdx !== undefined ? dayActionCounts[parseInt(bestDayIdx)] : 0;

    // Trend vs last month
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const thisMonthCheckins = checkins.filter(c => new Date(c.check_in_date) >= thisMonthStart).length;
    const lastMonthCheckins = checkins.filter(c => {
      const d = new Date(c.check_in_date);
      return d >= lastMonthStart && d < thisMonthStart;
    }).length;
    const trendPercent = lastMonthCheckins > 0
      ? Math.round(((thisMonthCheckins - lastMonthCheckins) / lastMonthCheckins) * 100)
      : thisMonthCheckins > 0 ? 100 : 0;

    // Projected weeks this year
    const yearStart = startOfYear(now);
    const daysSoFar = Math.max(1, differenceInDays(now, yearStart));
    const weeksWithCheckins = new Set(
      checkins
        .filter(c => new Date(c.check_in_date) >= yearStart)
        .map(c => {
          const d = new Date(c.check_in_date);
          const weekNum = Math.ceil((differenceInDays(d, yearStart) + 1) / 7);
          return weekNum;
        })
    ).size;
    const weekRate = weeksWithCheckins / Math.max(1, Math.ceil(daysSoFar / 7));
    const projectedWeeks = Math.round(weekRate * 52);

    return {
      longestStreak,
      longestStreakStart,
      longestStreakEnd,
      bestDay,
      bestDayCount,
      trendPercent,
      projectedWeeks,
    };
  }, [checkins, actions]);

  const items = [
    {
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      label: "Current Streak",
      value: `${consecutiveStreak} day${consecutiveStreak !== 1 ? "s" : ""}`,
    },
    {
      icon: <Trophy className="w-4 h-4 text-amber-500" />,
      label: "Longest Streak",
      value: `${insights.longestStreak} day${insights.longestStreak !== 1 ? "s" : ""}`,
    },
    {
      icon: <Star className="w-4 h-4 text-primary" />,
      label: "Best Day",
      value: insights.bestDay,
      detail: actions.length > 0 ? `${insights.bestDayCount} actions` : undefined,
    },
    {
      icon: <TrendingUp className={`w-4 h-4 ${insights.trendPercent >= 0 ? "text-emerald-500" : "text-red-400"}`} />,
      label: "Trend",
      value: `${insights.trendPercent >= 0 ? "+" : ""}${insights.trendPercent}% vs last month`,
    },
    {
      icon: <Target className="w-4 h-4 text-accent" />,
      label: "On Track",
      value: `${insights.projectedWeeks}/52 weeks projected`,
    },
  ];

  if (checkins.length < 3) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-accent/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Flame className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Insights at a Glance</h3>
            <p className="text-xs text-muted-foreground">Your key metrics</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
            >
              {item.icon}
              <span className="text-xs text-muted-foreground w-24 shrink-0">{item.label}</span>
              <span className="text-sm font-medium text-foreground flex-1">{item.value}</span>
              {item.detail && (
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
