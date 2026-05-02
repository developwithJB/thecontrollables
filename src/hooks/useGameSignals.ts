import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyzeCalendar } from "@/lib/calendarIntelligence";
import {
  interpretSignals,
  type GameSignals,
  type SignalCalendarInput,
  type SignalCheckInInput,
  type SignalWearableInput,
} from "@/lib/signalInterpreter";
import { useHealthData } from "@/hooks/useHealthData";
import { useTodayPlannerItems } from "@/hooks/usePlanner";
import { supabase } from "@/integrations/supabase/client";

interface UseGameSignalsOptions {
  userId?: string;
  enabled?: boolean;
  calendar?: SignalCalendarInput | null;
  wearable?: SignalWearableInput | null;
  checkIn?: SignalCheckInInput | null;
}

interface UseGameSignalsResult {
  signals: GameSignals | null;
  calendar: SignalCalendarInput | null;
  wearable: SignalWearableInput | null;
  checkIn: SignalCheckInInput | null;
  isLoading: boolean;
}

interface RecentCheckInState {
  current: SignalCheckInInput | null;
  recentLowEnergyHighStressCount: number;
}

function getRecentLowSleepHighStrainCount(
  trend: Array<{ sleepMinutes: number | null; strain: number | null }>,
): number {
  return trend.slice(0, 3).filter((day) => (day.sleepMinutes ?? Infinity) < 360 && (day.strain ?? -Infinity) >= 14).length;
}

function mapWearableSignal(
  isConnected: boolean,
  latest: {
    recovery: number | null;
    sleepMinutes: number | null;
    strain: number | null;
  },
  recentLowSleepHighStrainCount: number,
): SignalWearableInput | null {
  if (
    !isConnected &&
    latest.recovery === null &&
    latest.sleepMinutes === null &&
    latest.strain === null &&
    recentLowSleepHighStrainCount === 0
  ) {
    return null;
  }

  return {
    connected: isConnected,
    recovery: latest.recovery,
    sleepMinutes: latest.sleepMinutes,
    strain: latest.strain,
    recentLowSleepHighStrainCount,
  };
}

function mapCalendarSignal(
  calendarConnected: boolean,
  plannerCount: number,
  intelligence: ReturnType<typeof analyzeCalendar>,
): SignalCalendarInput | null {
  if (!calendarConnected && plannerCount === 0 && !intelligence) {
    return null;
  }

  return {
    connected: calendarConnected || plannerCount > 0,
    plannerCount,
    meetingCount: intelligence?.meetingCount ?? 0,
    meetingMinutes: intelligence?.meetingMinutes ?? 0,
    longestFocusBlock: intelligence?.longestFocusBlock ?? 0,
    contextSwitches: intelligence?.contextSwitches ?? 0,
    dayType: intelligence?.dayType ?? null,
    overloadedPeriod: intelligence?.overloadedPeriod ?? null,
  };
}

export function useGameSignals({
  userId,
  enabled = true,
  calendar,
  wearable,
  checkIn,
}: UseGameSignalsOptions = {}): UseGameSignalsResult {
  const shouldFetchWearable =
    enabled && !!userId && (wearable === undefined || wearable.recentLowSleepHighStrainCount === undefined);
  const shouldFetchCalendar = enabled && !!userId && calendar === undefined;
  const shouldFetchCheckIn =
    enabled && !!userId && (checkIn === undefined || checkIn.recentLowEnergyHighStressCount === undefined);

  const healthData = useHealthData(shouldFetchWearable ? userId : undefined);
  const { data: todayPlannerItems = [], isLoading: plannerLoading } = useTodayPlannerItems(
    shouldFetchCalendar ? userId : undefined,
  );

  const { data: calendarConnected = false, isLoading: calendarLoading } = useQuery({
    queryKey: ["planner-connection-active", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("planner_connections")
        .select("id")
        .eq("user_id", userId!)
        .eq("is_active", true)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: shouldFetchCalendar,
    staleTime: 60_000,
  });

  const { data: recentCheckInState = null, isLoading: checkInLoading } = useQuery({
    queryKey: ["notice-entry-window", userId],
    queryFn: async () => {
      const today = new Date().toLocaleDateString("sv-SE");
      const since = new Date();
      since.setDate(since.getDate() - 4);
      const sinceDate = since.toLocaleDateString("sv-SE");
      const { data, error } = await supabase
        .from("notice_entries")
        .select("mood, energy_level, stress_level, entry_date, created_at")
        .eq("user_id", userId!)
        .gte("entry_date", sinceDate)
        .lte("entry_date", today)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) {
        return {
          current: null,
          recentLowEnergyHighStressCount: 0,
        } satisfies RecentCheckInState;
      }

      const currentRow = data.find((row) => row.entry_date === today) ?? null;
      const recentLowEnergyHighStressDays = new Set<string>();

      for (const row of data) {
        if ((row.energy_level ?? 6) <= 2 && (row.stress_level ?? -1) >= 4) {
          recentLowEnergyHighStressDays.add(row.entry_date);
        }
      }

      return {
        current: currentRow
          ? {
              mood: currentRow.mood,
              energy: currentRow.energy_level,
              stress: currentRow.stress_level,
              recentLowEnergyHighStressCount: recentLowEnergyHighStressDays.size,
            }
          : null,
        recentLowEnergyHighStressCount: recentLowEnergyHighStressDays.size,
      } satisfies RecentCheckInState;
    },
    enabled: shouldFetchCheckIn,
    staleTime: 60_000,
  });

  const derivedCalendar = useMemo(() => {
    if (calendar !== undefined) return calendar;
    const intelligence = analyzeCalendar(todayPlannerItems);
    return mapCalendarSignal(calendarConnected, todayPlannerItems.length, intelligence);
  }, [calendar, todayPlannerItems, calendarConnected]);

  const derivedWearable = useMemo(() => {
    const recentLowSleepHighStrainCount = getRecentLowSleepHighStrainCount(healthData.trend);

    if (wearable !== undefined) {
      return {
        ...wearable,
        recentLowSleepHighStrainCount:
          wearable.recentLowSleepHighStrainCount ?? recentLowSleepHighStrainCount,
      };
    }

    return mapWearableSignal(healthData.isConnected, healthData.latest, recentLowSleepHighStrainCount);
  }, [wearable, healthData.isConnected, healthData.latest, healthData.trend]);

  const derivedCheckIn = useMemo(() => {
    if (checkIn !== undefined && checkIn !== null) {
      return {
        ...checkIn,
        recentLowEnergyHighStressCount:
          checkIn.recentLowEnergyHighStressCount ?? recentCheckInState?.recentLowEnergyHighStressCount ?? 0,
      };
    }

    if (recentCheckInState?.current) {
      return recentCheckInState.current;
    }

    if ((recentCheckInState?.recentLowEnergyHighStressCount ?? 0) > 0) {
      return {
        mood: null,
        energy: null,
        stress: null,
        recentLowEnergyHighStressCount: recentCheckInState!.recentLowEnergyHighStressCount,
      };
    }

    return null;
  }, [checkIn, recentCheckInState]);

  const signals = useMemo(
    () =>
      interpretSignals({
        calendar: derivedCalendar,
        wearable: derivedWearable,
        checkIn: derivedCheckIn,
      }),
    [derivedCalendar, derivedWearable, derivedCheckIn],
  );

  return {
    signals,
    calendar: derivedCalendar,
    wearable: derivedWearable,
    checkIn: derivedCheckIn,
    isLoading:
      (shouldFetchWearable && healthData.isLoading) ||
      (shouldFetchCalendar && (plannerLoading || calendarLoading)) ||
      (shouldFetchCheckIn && checkInLoading),
  };
}
