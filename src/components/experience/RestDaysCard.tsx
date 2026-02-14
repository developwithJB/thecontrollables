import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Moon, CheckCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, getDay, parseISO, format, addDays, isSameDay } from "date-fns";

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface RestDaysCardProps {
  userId: string;
}

export function RestDaysCard({ userId }: RestDaysCardProps) {
  // Fetch completed actions for activity pattern
  const { data: actions = [] } = useQuery({
    queryKey: ["experience-actions-rest", userId],
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

  // Fetch checkins
  const { data: checkins = [] } = useQuery({
    queryKey: ["experience-checkins-rest", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("check_in_date")
        .eq("user_id", userId);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const restData = useMemo(() => {
    // Count activity per day of week
    const dayCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayCounts[i] = 0;

    actions.forEach(a => {
      const day = getDay(parseISO(a.completed_at));
      dayCounts[day]++;
    });
    checkins.forEach(c => {
      const day = getDay(new Date(c.check_in_date));
      dayCounts[day]++;
    });

    // Find 2 lowest activity days = rest days
    const sorted = Object.entries(dayCounts)
      .sort(([, a], [, b]) => a - b);
    const restDayIndices = sorted.slice(0, 2).map(([idx]) => parseInt(idx));

    // Rest compliance this month
    const now = new Date();
    const monthStart = startOfMonth(now);
    let totalRestDaysThisMonth = 0;
    let honoredRestDays = 0;

    const actionDatesThisMonth = new Set(
      actions
        .filter(a => new Date(a.completed_at) >= monthStart)
        .map(a => format(parseISO(a.completed_at), "yyyy-MM-dd"))
    );
    const checkinDatesThisMonth = new Set(
      checkins
        .filter(c => new Date(c.check_in_date) >= monthStart)
        .map(c => c.check_in_date)
    );

    // Walk through days this month
    let d = new Date(monthStart);
    while (d <= now) {
      if (restDayIndices.includes(getDay(d))) {
        totalRestDaysThisMonth++;
        const dateStr = format(d, "yyyy-MM-dd");
        if (!actionDatesThisMonth.has(dateStr) && !checkinDatesThisMonth.has(dateStr)) {
          honoredRestDays++;
        }
      }
      d = addDays(d, 1);
    }

    const compliance = totalRestDaysThisMonth > 0
      ? Math.round((honoredRestDays / totalRestDaysThisMonth) * 100)
      : 0;

    // Rest streak (consecutive rest days honored, going backwards)
    let restStreak = 0;
    let checkDate = new Date(now);
    for (let i = 0; i < 30; i++) {
      checkDate = addDays(now, -i);
      if (!restDayIndices.includes(getDay(checkDate))) continue;
      const dateStr = format(checkDate, "yyyy-MM-dd");
      if (!actionDatesThisMonth.has(dateStr) && !checkinDatesThisMonth.has(dateStr)) {
        restStreak++;
      } else {
        break;
      }
    }

    // Next rest day
    let nextRestDay: Date | null = null;
    for (let i = 1; i <= 7; i++) {
      const upcoming = addDays(now, i);
      if (restDayIndices.includes(getDay(upcoming))) {
        nextRestDay = upcoming;
        break;
      }
    }

    // Is today a rest day?
    const isTodayRestDay = restDayIndices.includes(getDay(now));

    // Time-of-day phase
    const hour = now.getHours();
    const isRestPhase = hour >= 20 || hour < 6;

    return {
      restDayIndices,
      compliance,
      honoredRestDays,
      totalRestDaysThisMonth,
      restStreak,
      nextRestDay,
      isTodayRestDay,
      isRestPhase,
    };
  }, [actions, checkins]);

  if (actions.length < 5 && checkins.length < 5) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Moon className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Rest Days</h3>
            <p className="text-xs text-muted-foreground">Recovery is part of the game</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Compliance gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">This Month</span>
            <span className="font-medium text-foreground">
              {restData.honoredRestDays}/{restData.totalRestDaysThisMonth} rest days honored
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${restData.compliance}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-purple-500 rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{restData.compliance}%</p>
        </div>

        {/* Rest day info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <Calendar className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Your rest days</p>
            <p className="text-sm font-medium text-foreground">
              {restData.restDayIndices.map(i => DAY_NAMES[i]).join(" & ")}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Rest streak</p>
            <p className="text-sm font-medium text-foreground">
              {restData.restStreak} consecutive
            </p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="space-y-2">
          {restData.isTodayRestDay && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Moon className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-foreground">Today is a rest day</span>
            </div>
          )}
          {restData.isRestPhase && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-foreground">Current phase: Rest Phase</span>
            </div>
          )}
          {restData.nextRestDay && !restData.isTodayRestDay && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Next rest day: {format(restData.nextRestDay, "EEEE")}
              </span>
            </div>
          )}
        </div>

        {/* Philosophy note */}
        <p className="text-xs text-muted-foreground text-center italic pt-1">
          Rest is strategic. It's how you stay in the game long-term.
        </p>
      </div>
    </motion.div>
  );
}
