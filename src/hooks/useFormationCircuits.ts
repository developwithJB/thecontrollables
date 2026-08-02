import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import {
  loadFormationCircuitHistory,
  saveFormationCircuit,
  type SaveFormationCircuitInput,
} from "@/data/formation/circuitRepository";
import { upsertFormationCircuitEntry } from "@/domain/formation/circuitSerialization";
import type { FormationCircuitEntry, TrainingTrack } from "@/domain/formation/circuits";

export function useFormationCircuits(userId: string, track: TrainingTrack) {
  const queryClient = useQueryClient();
  const localOnly = isDevMockAuthEnabled();
  const queryKey = ["formation-circuits", userId, track, localOnly] as const;

  const historyQuery = useQuery({
    queryKey,
    queryFn: () => loadFormationCircuitHistory(userId, track, localOnly),
    staleTime: 15_000,
  });

  const saveMutation = useMutation({
    mutationFn: (input: Omit<SaveFormationCircuitInput, "userId" | "track" | "localOnly">) =>
      saveFormationCircuit({ ...input, userId, track, localOnly }),
    onSuccess: (entry) => {
      queryClient.setQueryData<FormationCircuitEntry[]>(queryKey, (current = []) =>
        upsertFormationCircuitEntry(current, entry),
      );
    },
  });

  return {
    history: historyQuery.data ?? [],
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    saveCircuit: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    localOnly,
  };
}
