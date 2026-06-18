import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDexProofEntry,
  deleteDexProofEntry,
  getControllablesDexStorageKey,
  getDexCategorySummaries,
  getDexStats,
  getRecentDexProof,
  normalizeDexProofEntries,
  type CreateDexProofEntryInput,
  type DexProofEntry,
} from "@/lib/controllablesDex";

interface ControllablesDexState {
  entries: DexProofEntry[];
}

export function useControllablesDex(userId: string | null | undefined) {
  const storageKey = useMemo(() => getControllablesDexStorageKey(userId), [userId]);
  const [state, setState] = useState<ControllablesDexState>(() => readState(storageKey));

  useEffect(() => {
    setState(readState(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (updater: (current: ControllablesDexState) => ControllablesDexState) => {
      setState((current) => {
        const next = updater(current);
        writeState(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const addProofEntry = useCallback(
    (input: CreateDexProofEntryInput): DexProofEntry => {
      const entry = createDexProofEntry({
        ...input,
        userId: input.userId ?? userId ?? "local",
      });

      persist((current) => ({
        ...current,
        entries: [entry, ...current.entries],
      }));

      return entry;
    },
    [persist, userId],
  );

  const deleteProofEntry = useCallback(
    (proofEntryId: string) => {
      persist((current) => ({
        ...current,
        entries: deleteDexProofEntry(current.entries, proofEntryId),
      }));
    },
    [persist],
  );

  const stats = useMemo(() => getDexStats(state.entries), [state.entries]);
  const categories = useMemo(() => getDexCategorySummaries(state.entries), [state.entries]);
  const recentEntries = useMemo(() => getRecentDexProof(state.entries), [state.entries]);

  return {
    entries: state.entries,
    stats,
    categories,
    recentEntries,
    addProofEntry,
    deleteProofEntry,
  };
}

function readState(storageKey: string): ControllablesDexState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<ControllablesDexState>;
    return {
      entries: normalizeDexProofEntries(parsed.entries),
    };
  } catch {
    return createDefaultState();
  }
}

function writeState(storageKey: string, state: ControllablesDexState) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(storageKey, JSON.stringify({ entries: state.entries }));
  } catch {
    // Local storage can be full, blocked, or unavailable.
  }
}

function createDefaultState(): ControllablesDexState {
  return {
    entries: [],
  };
}
