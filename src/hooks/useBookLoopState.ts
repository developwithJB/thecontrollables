import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bookQueryKey,
  changesForState,
  decodeState,
  type BookArea,
  type BookRecord,
  type BookState,
} from "@/data/bookLoop/model";
import { loadBookRecords, saveBookChanges } from "@/data/bookLoop/repository";
import {
  localBookKey,
  readLocalBook,
  writeLocalBook,
} from "@/data/bookLoop/local";

// Supplied only after real auth, initial server load, and the import decision.
export const BookLoopContext = createContext<string | null>(null);
export function useBookLoopState<A extends BookArea>(
  area: A,
  userId?: string | null,
  key = "current",
) {
  const serverUserId = useContext(BookLoopContext);
  const server = !!userId && serverUserId === userId;
  const accountMismatch = !!serverUserId && serverUserId !== userId;
  const client = useQueryClient();
  const localKey = localBookKey(area, userId, key);
  const [local, setLocal] = useState(() => ({
    key: localKey,
    value: readLocalBook(area, userId, key),
  }));
  useEffect(() => {
    const refresh = () =>
      setLocal({ key: localKey, value: readLocalBook(area, userId, key) });
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("book-loop-local-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("book-loop-local-change", refresh);
    };
  }, [area, userId, key, localKey]);
  const query = useQuery({
    queryKey: bookQueryKey(userId || "guest"),
    queryFn: () => loadBookRecords(userId!),
    enabled: server,
    refetchOnWindowFocus: true,
    refetchInterval: server ? 30_000 : false,
  });
  const state = useMemo(
    () =>
      accountMismatch
        ? decodeState(area, key, [])
        : server
          ? decodeState(area, key, query.data ?? [])
          : local.key === localKey
            ? local.value
            : readLocalBook(area, userId, key),
    [accountMismatch, server, area, key, query.data, local, localKey, userId],
  );
  const mutation = useMutation({
    networkMode: "always",
    mutationFn: async ({
      update,
      rows,
      snapshot,
      owner,
    }: {
      owner: string | null | undefined;
      update: (current: BookState<A>) => BookState<A>;
      rows: BookRecord[] | undefined;
      snapshot: BookState<A>;
    }) => {
      if (accountMismatch || owner !== userId)
        throw new Error("Account changed; retry in the current account");
      if (server && !navigator.onLine) throw new Error("Offline");
      if (!server) {
        const next = update(readLocalBook(area, userId, key));
        writeLocalBook(area, userId, key, next);
        setLocal({ key: localKey, value: next });
        return;
      }
      // Use the rendered revision: do not silently apply a stale form to a newer cache.
      if (!rows) throw new Error("Book data is still loading");
      const changes = changesForState(area, key, rows, update(snapshot));
      await saveBookChanges(userId!, changes);
      // A failed refresh must not turn a confirmed write into a claimed failed write.
      await client.invalidateQueries({ queryKey: bookQueryKey(userId!) });
    },
    onError: () => {
      toast.error(
        "Could not save. Check your connection or reload the latest data and try again. Your browser backup is unchanged.",
      );
      if (server)
        void client.invalidateQueries({ queryKey: bookQueryKey(userId!) });
    },
  });
  const { mutateAsync } = mutation;
  const persist = useCallback(
    async (
      update: (current: BookState<A>) => BookState<A>,
    ): Promise<boolean> => {
      try {
        await mutateAsync({
          update,
          rows: query.data,
          snapshot: state,
          owner: userId,
        });
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync, query.data, state, userId],
  );
  return {
    state,
    persist,
    isSaving: mutation.isPending,
    isLoading: server && query.isLoading,
    error: query.error ?? mutation.error,
    server,
  };
}
