import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface OperatorAction {
  id: string;
  label: string;
  deep_link: string | null;
  xp_reward: number;
}

export interface OperatorSuggestion {
  mode: string;
  headline: string;
  summary: string;
  rationale: string;
  recommended_actions: OperatorAction[];
  alternate_actions: OperatorAction[];
  warnings: string[];
  fallback_if_low_energy: { label: string; deep_link: string } | null;
  confidence: number;
  generated_by: "ai" | "rules";
}

async function fetchOperatorSuggestion(
  command?: string | null
): Promise<OperatorSuggestion | null> {
  const today = new Date().toLocaleDateString("sv-SE");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, error } = await supabase.functions.invoke("operator-console", {
    body: { command: command || null, localDate: today, timezone },
  });

  if (error) throw error;
  return data as OperatorSuggestion;
}

export function useOperatorConsole(userId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: suggestion,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["operator-console", userId],
    queryFn: () => fetchOperatorSuggestion(),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const commandMutation = useMutation({
    mutationFn: (command: string) => fetchOperatorSuggestion(command),
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(["operator-console", userId], data);
      }
    },
  });

  const sendCommand = useCallback(
    (command: string) => {
      commandMutation.mutate(command);
    },
    [commandMutation]
  );

  const updateSuggestionStatus = useCallback(
    async (status: string) => {
      if (!userId) return;
      const today = new Date().toLocaleDateString("sv-SE");
      const mode = suggestion?.mode || "plan";

      await supabase
        .from("operator_suggestions" as any)
        .update({
          status,
          status_changed_at: new Date().toISOString(),
        } as any)
        .eq("user_id", userId)
        .eq("suggestion_date", today)
        .eq("mode", mode);
    },
    [userId, suggestion?.mode]
  );

  const acceptAction = useCallback(
    async (actionId: string) => {
      await updateSuggestionStatus("accepted");
      // Track event
      await supabase.from("app_events").insert({
        event_type: "interaction",
        event_name: "operator_action_accepted",
        event_data: { action_id: actionId },
        user_id: userId,
        page_path: "/dashboard",
      });
    },
    [updateSuggestionStatus, userId]
  );

  const snoozeSuggestion = useCallback(async () => {
    await updateSuggestionStatus("snoozed");
    await supabase.from("app_events").insert({
      event_type: "interaction",
      event_name: "operator_suggestion_snoozed",
      event_data: { mode: suggestion?.mode },
      user_id: userId,
      page_path: "/dashboard",
    });
  }, [updateSuggestionStatus, userId, suggestion?.mode]);

  const dismissSuggestion = useCallback(async () => {
    await updateSuggestionStatus("dismissed");
    queryClient.setQueryData(["operator-console", userId], null);
    await supabase.from("app_events").insert({
      event_type: "interaction",
      event_name: "operator_suggestion_dismissed",
      event_data: { mode: suggestion?.mode },
      user_id: userId,
      page_path: "/dashboard",
    });
  }, [updateSuggestionStatus, userId, suggestion?.mode, queryClient]);

  return {
    suggestion: suggestion ?? null,
    isLoading,
    error,
    sendCommand,
    isCommandLoading: commandMutation.isPending,
    acceptAction,
    snoozeSuggestion,
    dismissSuggestion,
  };
}
