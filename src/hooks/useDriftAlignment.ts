import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGameSignals } from "@/hooks/useGameSignals";
import {
  interpretDriftAlignment,
  type DriftAlignmentResult,
} from "@/lib/driftAlignment";
import type {
  GameSignals,
  SignalCalendarInput,
  SignalCheckInInput,
  SignalWearableInput,
} from "@/lib/signalInterpreter";

interface UseDriftAlignmentOptions {
  userId?: string;
  enabled?: boolean;
  signals?: GameSignals | null;
  calendar?: SignalCalendarInput | null;
  wearable?: SignalWearableInput | null;
  checkIn?: SignalCheckInInput | null;
}

interface DriftAlignmentSnapshot {
  awarenessCheckInsLast7: number;
  honestCheckInsLast7: number;
  dailyCheckInsLast7: number;
  completedMovesLast7: number;
  completedMovesToday: number;
  awarenessToday: boolean;
  keptPromiseRate14: number | null;
  resolvedPromises14: number;
  activeQuest: boolean;
  environmentResets7: number;
  daysSinceLastAction: number | null;
  hasHistory: boolean;
}

interface UseDriftAlignmentResult {
  drift: DriftAlignmentResult | null;
  isLoading: boolean;
  daysSinceLastVisit: number | null;
}

const HONEST_MOODS = new Set(["anxious", "frustrated", "overwhelmed", "flat"]);

function getLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("sv-SE");
}

function daysBetween(dateA: Date, dateB: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(dateA.getTime() - dateB.getTime()) / oneDay);
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.length <= 10 ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysSinceLastVisit(userId?: string): number | null {
  if (!userId || typeof window === "undefined") return null;

  try {
    const lastVisit = localStorage.getItem(`last_dashboard_visit_${userId}`);
    if (!lastVisit) return null;
    return daysBetween(new Date(lastVisit), new Date());
  } catch {
    return null;
  }
}

export function useDriftAlignment({
  userId,
  enabled = true,
  signals,
  calendar,
  wearable,
  checkIn,
}: UseDriftAlignmentOptions = {}): UseDriftAlignmentResult {
  const needsSignalFetch =
    signals === undefined ||
    calendar === undefined ||
    wearable === undefined ||
    checkIn === undefined;

  const gameSignals = useGameSignals({
    userId,
    enabled: enabled && needsSignalFetch,
    calendar,
    wearable,
    checkIn,
  });

  const resolvedSignals = signals ?? gameSignals.signals;
  const resolvedCalendar = calendar ?? gameSignals.calendar;
  const resolvedWearable = wearable ?? gameSignals.wearable;
  const resolvedCheckIn = checkIn ?? gameSignals.checkIn;
  const daysSinceLastVisit = useMemo(() => getDaysSinceLastVisit(userId), [userId]);

  const { data: snapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ["drift-alignment-snapshot", userId],
    queryFn: async (): Promise<DriftAlignmentSnapshot> => {
      const today = getLocalDateString();
      const sevenDaysAgo = getLocalDateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
      const fourteenDaysAgo = getLocalDateString(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = getLocalDateString(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

      const [
        noticeEntriesRes,
        dailyCheckinsRes,
        dailyRingsRes,
        integrityLogsRes,
        environmentResetsRes,
        activeQuestRes,
        completedActionsRes,
        latestResetRes,
        latestTimeLogRes,
      ] = await Promise.all([
        supabase
          .from("notice_entries")
          .select("entry_date, mood, stress_level, energy_level, note")
          .eq("user_id", userId!)
          .gte("entry_date", thirtyDaysAgo)
          .order("entry_date", { ascending: false }),
        supabase
          .from("daily_checkins")
          .select("check_in_date, completed")
          .eq("user_id", userId!)
          .gte("check_in_date", thirtyDaysAgo)
          .order("check_in_date", { ascending: false }),
        supabase
          .from("daily_rings")
          .select("ring_date, notice_completed, choose_completed, prove_completed, charge_completed, align_completed")
          .eq("user_id", userId!)
          .gte("ring_date", thirtyDaysAgo)
          .order("ring_date", { ascending: false }),
        supabase
          .from("integrity_logs")
          .select("promised_at, kept, kept_at")
          .eq("user_id", userId!)
          .gte("promised_at", thirtyDaysAgo)
          .order("promised_at", { ascending: false }),
        supabase
          .from("environment_resets")
          .select("reset_date")
          .eq("user_id", userId!)
          .gte("reset_date", thirtyDaysAgo)
          .order("reset_date", { ascending: false }),
        supabase
          .from("main_quests")
          .select("id")
          .eq("user_id", userId!)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("completed_actions")
          .select("completed_at")
          .eq("user_id", userId!)
          .gte("completed_at", `${thirtyDaysAgo}T00:00:00`)
          .order("completed_at", { ascending: false }),
        supabase
          .from("daily_resets")
          .select("completed_at")
          .eq("user_id", userId!)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("time_logs")
          .select("log_date")
          .eq("user_id", userId!)
          .order("log_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (noticeEntriesRes.error) throw noticeEntriesRes.error;
      if (dailyCheckinsRes.error) throw dailyCheckinsRes.error;
      if (dailyRingsRes.error) throw dailyRingsRes.error;
      if (integrityLogsRes.error) throw integrityLogsRes.error;
      if (environmentResetsRes.error) throw environmentResetsRes.error;
      if (activeQuestRes.error) throw activeQuestRes.error;
      if (completedActionsRes.error) throw completedActionsRes.error;
      if (latestResetRes.error) throw latestResetRes.error;
      if (latestTimeLogRes.error) throw latestTimeLogRes.error;

      const noticeEntries = noticeEntriesRes.data ?? [];
      const dailyCheckins = dailyCheckinsRes.data ?? [];
      const dailyRings = dailyRingsRes.data ?? [];
      const integrityLogs = integrityLogsRes.data ?? [];
      const environmentResets = environmentResetsRes.data ?? [];
      const completedActions = completedActionsRes.data ?? [];

      const awarenessCheckInDays = new Set<string>();
      const honestCheckInDays = new Set<string>();

      for (const entry of noticeEntries) {
        if (entry.entry_date >= sevenDaysAgo) {
          awarenessCheckInDays.add(entry.entry_date);
          if (
            HONEST_MOODS.has(entry.mood) ||
            (entry.stress_level ?? 0) >= 4 ||
            (entry.energy_level ?? 6) <= 2 ||
            Boolean(entry.note?.trim())
          ) {
            honestCheckInDays.add(entry.entry_date);
          }
        }
      }

      const completedDailyCheckInDays = new Set(
        dailyCheckins
          .filter((entry) => entry.completed && entry.check_in_date >= sevenDaysAgo)
          .map((entry) => entry.check_in_date),
      );

      const ringsLast7 = dailyRings.filter((entry) => entry.ring_date >= sevenDaysAgo);
      const completedMovesLast7 = ringsLast7.reduce((total, entry) => {
        return (
          total +
          [entry.notice_completed, entry.choose_completed, entry.prove_completed, entry.charge_completed, entry.align_completed]
            .filter(Boolean).length
        );
      }, 0);

      const todayRing = ringsLast7.find((entry) => entry.ring_date === today);
      const completedMovesToday = todayRing
        ? [todayRing.notice_completed, todayRing.choose_completed, todayRing.prove_completed, todayRing.charge_completed, todayRing.align_completed]
            .filter(Boolean).length
        : 0;

      const resolvedPromises14 = integrityLogs.filter(
        (entry) => entry.promised_at.slice(0, 10) >= fourteenDaysAgo && entry.kept !== null,
      );
      const keptPromises14 = resolvedPromises14.filter((entry) => entry.kept === true).length;
      const keptPromiseRate14 =
        resolvedPromises14.length > 0 ? Math.round((keptPromises14 / resolvedPromises14.length) * 100) : null;

      const environmentResetDays = new Set(
        environmentResets.filter((entry) => entry.reset_date >= sevenDaysAgo).map((entry) => entry.reset_date),
      );

      const latestDates = [
        noticeEntries[0]?.entry_date,
        dailyCheckins.find((entry) => entry.completed)?.check_in_date,
        completedActions[0]?.completed_at,
        dailyRings.find((entry) =>
          entry.notice_completed ||
          entry.choose_completed ||
          entry.prove_completed ||
          entry.charge_completed ||
          entry.align_completed,
        )?.ring_date,
        integrityLogs[0]?.kept_at ?? integrityLogs[0]?.promised_at,
        environmentResets[0]?.reset_date,
        latestResetRes.data?.completed_at ?? null,
        latestTimeLogRes.data?.log_date ?? null,
      ]
        .map((value) => parseDateOnly(value))
        .filter((value): value is Date => Boolean(value));

      const lastActionDate =
        latestDates.length > 0
          ? new Date(Math.max(...latestDates.map((value) => value.getTime())))
          : null;

      const daysSinceLastAction = lastActionDate ? daysBetween(lastActionDate, new Date()) : null;
      const hasHistory =
        noticeEntries.length > 0 ||
        dailyCheckins.length > 0 ||
        dailyRings.length > 0 ||
        completedActions.length > 0 ||
        integrityLogs.length > 0 ||
        environmentResets.length > 0 ||
        Boolean(latestResetRes.data) ||
        Boolean(latestTimeLogRes.data);

      return {
        awarenessCheckInsLast7: awarenessCheckInDays.size,
        honestCheckInsLast7: honestCheckInDays.size,
        dailyCheckInsLast7: completedDailyCheckInDays.size,
        completedMovesLast7,
        completedMovesToday,
        awarenessToday: awarenessCheckInDays.has(today),
        keptPromiseRate14,
        resolvedPromises14: resolvedPromises14.length,
        activeQuest: Boolean(activeQuestRes.data?.id),
        environmentResets7: environmentResetDays.size,
        daysSinceLastAction,
        hasHistory,
      };
    },
    enabled: enabled && !!userId,
    staleTime: 60_000,
  });

  const drift = useMemo(() => {
    if (!snapshot?.hasHistory) return null;

    return interpretDriftAlignment({
      daysSinceLastVisit,
      daysSinceLastAction: snapshot.daysSinceLastAction,
      awarenessCheckInsLast7: snapshot.awarenessCheckInsLast7,
      honestCheckInsLast7: snapshot.honestCheckInsLast7,
      dailyCheckInsLast7: snapshot.dailyCheckInsLast7,
      completedMovesLast7: snapshot.completedMovesLast7,
      completedMovesToday: snapshot.completedMovesToday,
      awarenessToday: snapshot.awarenessToday,
      keptPromiseRate14: snapshot.keptPromiseRate14,
      resolvedPromises14: snapshot.resolvedPromises14,
      activeQuest: snapshot.activeQuest,
      environmentResets7: snapshot.environmentResets7,
      calendar: resolvedCalendar,
      wearable: resolvedWearable,
      checkIn: resolvedCheckIn,
      signals: resolvedSignals,
    });
  }, [
    snapshot,
    daysSinceLastVisit,
    resolvedCalendar,
    resolvedWearable,
    resolvedCheckIn,
    resolvedSignals,
  ]);

  return {
    drift,
    isLoading: snapshotLoading || (needsSignalFetch && gameSignals.isLoading),
    daysSinceLastVisit,
  };
}
