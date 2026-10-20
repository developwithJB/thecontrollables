import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFeatureFlag } from "@/lib/featureFlags";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { BookLoopContext } from "@/hooks/useBookLoopState";
import { bookQueryKey, type BookRecord } from "@/data/bookLoop/model";
import {
  collectLocalBookRecords,
  hasMeaningfulLocalProgress,
  importProgressTitle,
  fingerprintImport,
  importDecisionKey,
} from "@/data/bookLoop/local";
import { importBookRecords, loadBookRecords } from "@/data/bookLoop/repository";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function BookLoopProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const enabled =
    getFeatureFlag("server_book_loop_enabled") && !isDevMockAuthEnabled();
  const client = useQueryClient();
  useEffect(() => {
    client.removeQueries({
      queryKey: ["book-loop"],
      predicate: (q) => q.queryKey[1] !== userId,
    });
    return () => {
      client.removeQueries({ queryKey: ["book-loop"] });
    };
  }, [userId, client]);
  // The authenticated shell supplies its current account. Public auth/recovery routes
  // stay available even if the optional book-loop schema is not deployed yet.
  if (!enabled || !userId) return <>{children}</>;
  return (
    <SignedInBookLoop key={userId} userId={userId}>
      {children}
    </SignedInBookLoop>
  );
}

function SignedInBookLoop({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: bookQueryKey(userId),
    queryFn: () => loadBookRecords(userId),
    refetchOnWindowFocus: true,
  });
  const [decision, setDecision] = useState<"checking" | "ask" | "ready">(
    "checking",
  );
  const [records, setRecords] = useState<Omit<BookRecord, "revision">[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!query.data || decision !== "checking") return;
    try {
      if (localStorage.getItem(importDecisionKey(userId))) {
        setDecision("ready");
        return;
      }
      const found = collectLocalBookRecords(localStorage, userId);
      setRecords(found);
      setDecision(hasMeaningfulLocalProgress(found) ? "ask" : "ready");
      if (!hasMeaningfulLocalProgress(found))
        localStorage.setItem(importDecisionKey(userId), "empty");
    } catch {
      console.warn("Browser progress could not be checked; continuing with server data.");
      setDecision("ready");
    }
  }, [query.data, decision, userId]);
  const finish = (value: string) => {
    try {
      localStorage.setItem(importDecisionKey(userId), value);
    } catch {
      /* Server receipt still makes retries safe. */
    }
    setDecision("ready");
  };
  const importData = async () => {
    setSaving(true);
    setError("");
    try {
      // Re-read after confirmation so edits from another tab are not accidentally omitted.
      const snapshot = collectLocalBookRecords(localStorage, userId);
      const fingerprint = await fingerprintImport(snapshot);
      await importBookRecords(userId, fingerprint, snapshot);
      if (!mounted.current) return;
      const fresh = await loadBookRecords(userId);
      if (!mounted.current) return;
      client.setQueryData(bookQueryKey(userId), fresh);
      finish("imported");
    } catch {
      setError(
        "Import did not finish. Your local data is unchanged. Check your connection and retry; existing server records will not be overwritten.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (decision === "ask")
    return (
      <BookLoopContext.Provider value={userId}>
      {children}
      <Dialog open onOpenChange={open => { if (!open) setDecision("ready"); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importProgressTitle(records.length)}
            </DialogTitle>
            <DialogDescription>
              Import saved account and guest progress from this browser into your private account so they
              are available on other devices. This includes promises, private
              Dex photos, local missions, notes, reading progress, and track
              choice. Existing server records will be kept when the same record
              already exists. Your browser copy stays untouched.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => finish("declined")}
            >
              Use server data without importing
            </Button>
            <Button disabled={saving} onClick={() => void importData()}>
              {saving ? "Importing…" : "Import browser progress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </BookLoopContext.Provider>
    );
  return (
    <BookLoopContext.Provider value={userId}>
      {query.isError ? <div role="alert" className="p-4">Could not load your synced book data. <Button onClick={() => void query.refetch()}>Retry</Button></div> : null}
      {children}
    </BookLoopContext.Provider>
  );
}
