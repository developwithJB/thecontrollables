import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFeatureFlag } from "@/lib/featureFlags";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { BookLoopContext } from "@/hooks/useBookLoopState";
import { bookQueryKey, type BookRecord } from "@/data/bookLoop/model";
import {
  collectLocalBookRecords,
  fingerprintImport,
  importDecisionKey,
} from "@/data/bookLoop/local";
import { importBookRecords, loadBookRecords } from "@/data/bookLoop/repository";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
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
      setDecision(found.length ? "ask" : "ready");
      if (!found.length)
        localStorage.setItem(importDecisionKey(userId), "empty");
    } catch {
      setError(
        "Browser data could not be read. You can continue with server data; the local copy will remain untouched.",
      );
      setDecision("ask");
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
  if (query.isError && !query.data)
    return (
      <div role="alert" className="p-6 space-y-3">
        <p>Could not load your synced book data.</p>
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </div>
    );
  if (!query.data || decision === "checking")
    return (
      <div role="status" className="p-6">
        Loading your book data…
      </div>
    );
  if (decision === "ask")
    return (
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import this browser’s book progress?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Copy {records.length || "your"} records from this account and
              guest progress on this browser into your private account so they
              are available on other devices. This includes promises, private
              Dex photos, local missions, notes, reading progress, and track
              choice. Existing server records will be kept when the same record
              already exists. Your browser copy stays untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert">{error}</p>}
          <AlertDialogFooter>
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  return (
    <BookLoopContext.Provider value={userId}>
      {children}
    </BookLoopContext.Provider>
  );
}
