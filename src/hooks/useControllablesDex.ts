import { useCallback, useMemo } from "react";
import { useBookLoopState } from "@/hooks/useBookLoopState";
import {
  createDexProofEntry,
  deleteDexProofEntry,
  getDexCategorySummaries,
  getDexStats,
  getRecentDexProof,
  type CreateDexProofEntryInput,
} from "@/lib/controllablesDex";

export function useControllablesDex(userId: string | null | undefined) {
  const { state, persist, isSaving, error } = useBookLoopState("dex", userId);
  const addProofEntry = useCallback(
    async (input: CreateDexProofEntryInput) => {
      const entry = createDexProofEntry({
        ...input,
        userId: userId || "local",
      });
      const saved = await persist((current) => ({
        entries: [
          entry,
          ...current.entries.filter((candidate) => candidate.id !== entry.id),
        ],
      }));
      return saved ? entry : null;
    },
    [persist, userId],
  );
  const deleteProofEntry = useCallback(
    (id: string) =>
      persist((current) => ({
        entries: deleteDexProofEntry(current.entries, id),
      })),
    [persist],
  );
  return {
    entries: state.entries,
    stats: useMemo(() => getDexStats(state.entries), [state.entries]),
    categories: useMemo(
      () => getDexCategorySummaries(state.entries),
      [state.entries],
    ),
    recentEntries: useMemo(
      () => getRecentDexProof(state.entries),
      [state.entries],
    ),
    addProofEntry,
    deleteProofEntry,
    isSaving,
    error,
  };
}
