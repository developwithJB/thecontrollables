import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Observation {
  id: string;
  observation_type: string;
  title: string;
  description: string | null;
  source: string;
  confidence: number;
  status: "pending" | "confirmed" | "dismissed";
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  supporting_refs: Array<{ table: string; id: string; context: string }>;
}

export interface InferredPreference {
  id: string;
  preference_key: string;
  preference_value: Record<string, unknown>;
  confidence: number;
  first_derived_at: string;
  last_updated_at: string;
}

export function useObservations(userId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastDeriveDate, setLastDeriveDate] = useState<string | null>(null);

  // Fetch observations
  const {
    data: observations = [],
    isLoading: isLoadingObservations,
    error: observationsError,
  } = useQuery({
    queryKey: ["observations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_observations")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "dismissed")
        .order("last_seen_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as Observation[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch inferred preferences
  const {
    data: inferredPreferences = [],
    isLoading: isLoadingPreferences,
  } = useQuery({
    queryKey: ["inferred-preferences", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_preferences_inferred")
        .select("*")
        .eq("user_id", userId);
      
      if (error) throw error;
      return (data || []) as InferredPreference[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Pending observations (high-value, surfaceable)
  const pendingObservations = useMemo(() => {
    return observations.filter(
      (obs) => obs.status === "pending" && obs.confidence >= 0.65 && obs.occurrences >= 2
    );
  }, [observations]);

  // Confirmed observations
  const confirmedObservations = useMemo(() => {
    return observations.filter((obs) => obs.status === "confirmed");
  }, [observations]);

  // Confirm observation mutation
  const confirmMutation = useMutation({
    mutationFn: async (observationId: string) => {
      const { error } = await supabase
        .from("user_observations")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", observationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observations", userId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not confirm observation",
        variant: "destructive",
      });
    },
  });

  // Dismiss observation mutation
  const dismissMutation = useMutation({
    mutationFn: async (observationId: string) => {
      const { error } = await supabase
        .from("user_observations")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .eq("id", observationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observations", userId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not dismiss observation",
        variant: "destructive",
      });
    },
  });

  // Derive observations (call edge function)
  const deriveObservations = useCallback(async () => {
    if (!userId) return;
    
    // Only derive once per day
    const today = new Date().toISOString().split("T")[0];
    if (lastDeriveDate === today) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("derive-observations", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error("Error deriving observations:", response.error);
        return;
      }

      setLastDeriveDate(today);
      queryClient.invalidateQueries({ queryKey: ["observations", userId] });
      queryClient.invalidateQueries({ queryKey: ["inferred-preferences", userId] });
    } catch (error) {
      console.error("Error calling derive-observations:", error);
    }
  }, [userId, lastDeriveDate, queryClient]);

  // Get preference by key
  const getPreference = useCallback(
    (key: string) => {
      const pref = inferredPreferences.find((p) => p.preference_key === key);
      return pref?.preference_value ?? null;
    },
    [inferredPreferences]
  );

  return {
    observations,
    pendingObservations,
    confirmedObservations,
    inferredPreferences,
    getPreference,
    confirmObservation: confirmMutation.mutate,
    dismissObservation: dismissMutation.mutate,
    deriveObservations,
    isLoading: isLoadingObservations || isLoadingPreferences,
    error: observationsError,
  };
}
