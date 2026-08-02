import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import type { Json } from "@/integrations/supabase/types";
import {
  getChicagoDayPrescription,
  getChicagoGoalWeek,
  getChicagoWeekDates,
  getGoalDriftSignal,
  getWeeklyGoalScore,
  type DatedGoalRecord,
  type GoalDailyLog,
  type GoalLogStatus,
} from "@/lib/datedGoal";

export interface DatedGoalLogRow {
  id: string;
  goal_id: string;
  user_id: string;
  log_date: string;
  session_type: string;
  status: GoalLogStatus;
  actual_miles: number | null;
  strength_completed: boolean;
  fueling_completed: boolean | null;
  pain_affecting_stride: boolean;
  body_feel: string | null;
  plan_snapshot: unknown;
}

export interface GoalHealthRow {
  sync_date: string;
  sleep_minutes: number | null;
  recovery_score: number | null;
}

export interface GoalLogInput {
  date: string;
  status: GoalLogStatus;
  actualMiles?: number | null;
  strengthCompleted?: boolean;
  fuelingCompleted?: boolean | null;
  painAffectingStride?: boolean;
  bodyFeel?: "good" | "normal" | "heavy" | "pain" | null;
}

function mapGoalLog(row: DatedGoalLogRow): GoalDailyLog {
  return {
    logDate: row.log_date,
    sessionType: row.session_type as GoalDailyLog["sessionType"],
    status: row.status,
    actualMiles: row.actual_miles === null ? null : Number(row.actual_miles),
    strengthCompleted: row.strength_completed,
    fuelingCompleted: row.fueling_completed,
    painAffectingStride: row.pain_affecting_stride,
  };
}

export function getLocalDateKey(date = new Date()): string {
  return date.toLocaleDateString("sv-SE");
}

export function getDateKeyInTimeZone(timeZone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : getLocalDateKey(date);
}

export function useDatedGoal(userId?: string) {
  const queryClient = useQueryClient();
  const deviceToday = getLocalDateKey();
  const devMock = isDevMockAuthEnabled();
  const devStorageKey = `dev_dated_goal_logs_${userId ?? "anonymous"}`;

  const goalQuery = useQuery({
    queryKey: ["dated-goal", userId],
    queryFn: async () => {
      if (devMock) {
        return {
          id: "dev-chicago-goal",
          user_id: userId!,
          plan_id: "chicago-marathon-2026-sub-4",
          title: "Sub-4 Chicago",
          event_name: "2026 Chicago Marathon",
          event_date: "2026-10-11",
          start_date: "2026-07-13",
          timezone: "America/Chicago",
          target_result: "3:58-3:59 finish (9:09/mi)",
          status: "active",
        } satisfies DatedGoalRecord;
      }
      const { data, error } = await supabase
        .from("dated_goals")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "active")
        .gte("event_date", deviceToday)
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DatedGoalRecord | null;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const goal = goalQuery.data ?? null;
  const today = goal ? getDateKeyInTimeZone(goal.timezone) : deviceToday;

  const logsQuery = useQuery({
    queryKey: ["dated-goal-logs", goal?.id],
    queryFn: async () => {
      if (devMock) {
        try {
          return JSON.parse(localStorage.getItem(devStorageKey) ?? "[]") as DatedGoalLogRow[];
        } catch {
          return [];
        }
      }
      const { data, error } = await supabase
        .from("dated_goal_daily_logs")
        .select("*")
        .eq("goal_id", goal!.id)
        .order("log_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DatedGoalLogRow[];
    },
    enabled: Boolean(goal?.id),
  });

  const healthQuery = useQuery({
    queryKey: ["dated-goal-health", userId],
    queryFn: async () => {
      if (devMock) {
        return [
          { sync_date: today, sleep_minutes: 485, recovery_score: 72 },
          { sync_date: getLocalDateKey(new Date(Date.now() - 86_400_000)), sleep_minutes: 450, recovery_score: 61 },
          { sync_date: getLocalDateKey(new Date(Date.now() - 2 * 86_400_000)), sleep_minutes: 505, recovery_score: 79 },
        ] satisfies GoalHealthRow[];
      }
      const start = new Date();
      start.setDate(start.getDate() - 13);
      const { data, error } = await supabase
        .from("health_sync_data")
        .select("sync_date, sleep_minutes, recovery_score")
        .eq("user_id", userId!)
        .gte("sync_date", getLocalDateKey(start))
        .order("sync_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GoalHealthRow[];
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const saveLog = useMutation({
    mutationFn: async (input: GoalLogInput) => {
      if (!goal || !userId) throw new Error("No active dated goal");
      const prescription = getChicagoDayPrescription(input.date);
      if (devMock) {
        const row: DatedGoalLogRow = {
          id: `dev-log-${input.date}`,
          goal_id: goal.id,
          user_id: userId,
          log_date: input.date,
          session_type: prescription.sessionType,
          status: input.status,
          actual_miles: input.actualMiles ?? null,
          strength_completed: input.strengthCompleted ?? false,
          fueling_completed: input.fuelingCompleted ?? null,
          pain_affecting_stride: input.painAffectingStride ?? false,
          body_feel: input.bodyFeel ?? null,
          plan_snapshot: prescription,
        };
        const current = (() => {
          try {
            return JSON.parse(localStorage.getItem(devStorageKey) ?? "[]") as DatedGoalLogRow[];
          } catch {
            return [];
          }
        })();
        const next = [...current.filter((entry) => entry.log_date !== input.date), row]
          .sort((a, b) => a.log_date.localeCompare(b.log_date));
        localStorage.setItem(devStorageKey, JSON.stringify(next));
        return row;
      }
      const { data, error } = await supabase
        .from("dated_goal_daily_logs")
        .upsert(
          {
            goal_id: goal.id,
            user_id: userId,
            log_date: input.date,
            session_type: prescription.sessionType,
            status: input.status,
            actual_miles: input.actualMiles ?? null,
            strength_completed: input.strengthCompleted ?? false,
            fueling_completed: input.fuelingCompleted ?? null,
            pain_affecting_stride: input.painAffectingStride ?? false,
            body_feel: input.bodyFeel ?? null,
            plan_snapshot: prescription as unknown as Json,
          },
          { onConflict: "goal_id,log_date" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data as DatedGoalLogRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dated-goal-logs", goal?.id] });
      queryClient.invalidateQueries({ queryKey: ["drift-alignment-snapshot", userId] });
    },
  });

  const logs = (logsQuery.data ?? []).map(mapGoalLog);
  const healthRows = healthQuery.data ?? [];
  const week = getChicagoGoalWeek(today);
  const weekDates = week ? getChicagoWeekDates(week) : [];
  const weekLogs = logs.filter((log) => weekDates.includes(log.logDate));
  const weekHealth = healthRows.filter((row) => weekDates.includes(row.sync_date));
  const sleepPerformances = weekHealth
    .filter((row) => row.sleep_minutes !== null)
    .map((row) => Math.min(100, Math.round((Number(row.sleep_minutes) / 480) * 100)));
  const recentLogs = logs.filter((log) => {
    const date = new Date(`${log.logDate}T12:00:00`);
    return date.getTime() >= Date.now() - 13 * 86_400_000;
  });
  const recentRecoveries = healthRows.slice(0, 3).map((row) => row.recovery_score);
  const drift = getGoalDriftSignal({
    currentDate: today,
    logs: recentLogs,
    sleepPerformances,
    recentRecoveries,
  });
  const weeklyScore = week ? getWeeklyGoalScore({ week, logs: weekLogs, sleepPerformances }) : null;

  return {
    goal,
    logs,
    healthRows,
    week,
    weekLogs,
    drift,
    weeklyScore,
    today,
    todayLog: (logsQuery.data ?? []).find((log) => log.log_date === today) ?? null,
    isLoading: goalQuery.isLoading || logsQuery.isLoading || healthQuery.isLoading,
    error: goalQuery.error || logsQuery.error || healthQuery.error,
    saveLog: saveLog.mutateAsync,
    isSaving: saveLog.isPending,
  };
}
