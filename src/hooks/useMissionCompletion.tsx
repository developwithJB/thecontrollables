import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import {
  addDevMockControllableXp,
  getDailyRingKeyForControllable,
  markDevMockDailyRing,
  readDevMockControllableXp,
} from "@/lib/devMockProgress";
import {
  MISSION_COMPLETION_SOURCE,
  MISSION_SELF_TRUST_SOURCE,
  applyMissionCompletionProgress,
  buildMissionCompletionActionText,
  buildMissionCompletionXpDescription,
  buildMissionSelfTrustDescription,
  type MissionCompletionProgress,
} from "@/lib/missionCompletion";
import type { MissionOfTheDay } from "@/lib/missionOfTheDay";

export interface MissionCompletionResult {
  alreadyCompleted: boolean;
  xpAwarded: number;
  selfTrustAwarded: number;
  progress: MissionCompletionProgress;
}

interface MissionCompletionHookResult {
  isCompleted: boolean;
  isLoading: boolean;
  isCompleting: boolean;
  completionResult: MissionCompletionResult | undefined;
  completeMission: () => Promise<MissionCompletionResult>;
}

const today = () => new Date().toLocaleDateString("sv-SE");

function getMissionStorageKey(userId: string, mission: MissionOfTheDay): string {
  return `mission_complete_${userId}_${mission.date}_${mission.targetControllable}`;
}

function readLocalMissionCompleted(userId: string, mission: MissionOfTheDay): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(getMissionStorageKey(userId, mission)) === "1";
  } catch {
    return false;
  }
}

function writeLocalMissionCompleted(userId: string, mission: MissionOfTheDay): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getMissionStorageKey(userId, mission), "1");
  } catch {
    // Local dev storage can be unavailable.
  }
}

async function getCurrentControllableXp(userId: string, controllable: string): Promise<number> {
  const { data, error } = await supabase
    .from("completed_actions")
    .select("xp_awarded")
    .eq("user_id", userId)
    .eq("controllable", controllable);

  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + (row.xp_awarded || 0), 0);
}

async function ensureXpLog(userId: string, amount: number, source: string, description: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("xp_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("source", source)
    .eq("description", description)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const { error } = await supabase.from("xp_logs").insert({
    user_id: userId,
    amount,
    source,
    description,
  });

  if (error) throw error;
}

async function markMissionDailyRing(userId: string, mission: MissionOfTheDay): Promise<void> {
  const ringKey = getDailyRingKeyForControllable(mission.targetControllable);
  const response = mission.missionInstruction;
  const { data: existing, error: existingError } = await supabase
    .from("daily_rings")
    .select("id")
    .eq("user_id", userId)
    .eq("ring_date", mission.date || today())
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    [`${ringKey}_completed`]: true,
    [`${ringKey}_response`]: response,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("daily_rings").update(payload).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("daily_rings").insert({
    user_id: userId,
    ring_date: mission.date || today(),
    ...payload,
  });

  if (error) throw error;
}

export function useMissionCompletion(
  userId: string | null,
  mission: MissionOfTheDay | null | undefined,
): MissionCompletionHookResult {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const devMock = isDevMockAuthEnabled();
  const actionText = mission ? buildMissionCompletionActionText(mission) : "";

  const completionQuery = useQuery({
    queryKey: ["mission-completion", userId, actionText],
    queryFn: async () => {
      if (!userId || !mission) return false;
      if (devMock) return readLocalMissionCompleted(userId, mission);

      const { data, error } = await supabase
        .from("completed_actions")
        .select("id")
        .eq("user_id", userId)
        .eq("action_text", actionText)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!mission,
    staleTime: 30_000,
  });

  const completionMutation = useMutation({
    mutationFn: async (): Promise<MissionCompletionResult> => {
      if (!userId || !mission) throw new Error("Mission unavailable");

      if (devMock) {
        const alreadyCompleted = readLocalMissionCompleted(userId, mission);
        const currentXp = readDevMockControllableXp()[mission.targetControllable] || 0;
        const totalXp = alreadyCompleted
          ? currentXp
          : addDevMockControllableXp(mission.targetControllable, mission.xpReward);

        if (!alreadyCompleted) {
          writeLocalMissionCompleted(userId, mission);
          markDevMockDailyRing(userId, mission.date || today(), mission.targetControllable, mission.missionInstruction);
        }

        return {
          alreadyCompleted,
          xpAwarded: alreadyCompleted ? 0 : mission.xpReward,
          selfTrustAwarded: alreadyCompleted ? 0 : mission.selfTrustReward,
          progress: applyMissionCompletionProgress(mission, totalXp, true),
        };
      }

      const { data: existing, error: existingError } = await supabase
        .from("completed_actions")
        .select("id")
        .eq("user_id", userId)
        .eq("action_text", actionText)
        .maybeSingle();

      if (existingError) throw existingError;

      const currentXp = await getCurrentControllableXp(userId, mission.targetControllable);
      const alreadyCompleted = !!existing;

      if (!alreadyCompleted) {
        const { error } = await supabase.from("completed_actions").insert({
          user_id: userId,
          action_text: actionText,
          controllable: mission.targetControllable,
          xp_awarded: mission.xpReward,
        });
        if (error) throw error;
      }

      await ensureXpLog(
        userId,
        mission.xpReward,
        MISSION_COMPLETION_SOURCE,
        buildMissionCompletionXpDescription(mission),
      );
      await ensureXpLog(
        userId,
        mission.selfTrustReward,
        MISSION_SELF_TRUST_SOURCE,
        buildMissionSelfTrustDescription(mission),
      );
      await markMissionDailyRing(userId, mission);

      return {
        alreadyCompleted,
        xpAwarded: alreadyCompleted ? 0 : mission.xpReward,
        selfTrustAwarded: alreadyCompleted ? 0 : mission.selfTrustReward,
        progress: applyMissionCompletionProgress(mission, currentXp, alreadyCompleted),
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mission-completion", userId] });
      queryClient.invalidateQueries({ queryKey: ["controllable-levels", userId] });
      queryClient.invalidateQueries({ queryKey: ["daily-rings", userId] });
      queryClient.invalidateQueries({ queryKey: ["completed-actions"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });

      toast({
        title: result.alreadyCompleted ? "Mission already complete" : result.progress.chargeStageLabel,
        description: result.alreadyCompleted
          ? "XP already awarded for today's mission."
          : `+${result.xpAwarded} XP · +${result.selfTrustAwarded} Self-Trust`,
      });
    },
  });

  return {
    isCompleted: completionQuery.data === true || !!completionMutation.data,
    isLoading: completionQuery.isLoading,
    isCompleting: completionMutation.isPending,
    completionResult: completionMutation.data,
    completeMission: completionMutation.mutateAsync,
  };
}
