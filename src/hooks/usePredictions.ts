import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Prediction {
  id: string;
  prediction_type: string;
  forecast: string;
  confidence: number;
  reasons: string[];
  recommended_intervention: string | null;
  intervention_deep_link: string | null;
  urgency: "low" | "medium" | "high";
  explanation: string | null;
  prediction_date: string;
  intervention_taken: boolean | null;
}

export function usePredictions(userId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: predictions = [], isLoading, error } = useQuery({
    queryKey: ["predictions", userId, today],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("prediction_date", today)
        .order("urgency");
      if (error) throw error;
      return (data || []) as unknown as Prediction[];
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const highUrgency = useMemo(() => predictions.filter(p => p.urgency === "high"), [predictions]);
  const mediumUrgency = useMemo(() => predictions.filter(p => p.urgency === "medium"), [predictions]);

  const generatePredictions = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.functions.invoke("generate-predictions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["predictions", userId] });
    } catch (err) {
      console.error("Error generating predictions:", err);
    }
  }, [userId, queryClient]);

  const markInterventionTaken = useMutation({
    mutationFn: async (predictionId: string) => {
      const { error } = await supabase
        .from("user_predictions")
        .update({
          intervention_taken: true,
          intervention_taken_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", predictionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predictions", userId] });
    },
  });

  return {
    predictions,
    highUrgency,
    mediumUrgency,
    generatePredictions,
    markInterventionTaken: markInterventionTaken.mutate,
    isLoading,
    error,
  };
}
