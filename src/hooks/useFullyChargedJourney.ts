import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import type { FormationCircuitEntry } from "@/domain/formation/circuits";
import {
  cancelFullyChargedAttempt,
  closeFullyChargedDay,
  loadFullyChargedToday,
  startFullyChargedAttempt,
  type StartFullyChargedAttemptInput,
} from "@/data/formation/fullyChargedRepository";

export function useFullyChargedJourney(userId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const localOnly = isDevMockAuthEnabled();
  const queryKey = ["fully-charged-today", userId, localOnly] as const;

  const journeyQuery = useQuery({
    queryKey,
    queryFn: () => loadFullyChargedToday(userId, localOnly),
    enabled,
    staleTime: 10_000,
    refetchInterval: enabled ? 30_000 : false,
  });

  const startMutation = useMutation({
    mutationFn: (input: Omit<StartFullyChargedAttemptInput, "userId" | "localOnly">) =>
      startFullyChargedAttempt({ ...input, userId, localOnly }),
    onSuccess: (state) => queryClient.setQueryData(queryKey, state),
  });

  const closeMutation = useMutation({
    mutationFn: (input: { attemptId: string; idempotencyKey: string; circuitHistory: FormationCircuitEntry[] }) =>
      closeFullyChargedDay({ ...input, userId, localOnly }),
    onSuccess: (state) => queryClient.setQueryData(queryKey, state),
  });

  const cancelMutation = useMutation({
    mutationFn: (input: { attemptId: string; reasonCode: "user_cancelled" | "health_safety" }) =>
      cancelFullyChargedAttempt({ ...input, userId, localOnly }),
    onSuccess: (state) => queryClient.setQueryData(queryKey, state),
  });

  return {
    journey: journeyQuery.data ?? null,
    isLoadingJourney: journeyQuery.isLoading,
    journeyError: journeyQuery.error,
    refetchJourney: journeyQuery.refetch,
    startAttempt: startMutation.mutateAsync,
    isStartingAttempt: startMutation.isPending,
    startError: startMutation.error,
    closeDay: closeMutation.mutateAsync,
    isClosingDay: closeMutation.isPending,
    closeError: closeMutation.error,
    cancelAttempt: cancelMutation.mutateAsync,
    isCancellingAttempt: cancelMutation.isPending,
    cancelError: cancelMutation.error,
    localOnly,
  };
}
