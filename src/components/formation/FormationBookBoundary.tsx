import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookLoopProvider } from "@/components/BookLoopProvider";
import { getFeatureFlag } from "@/lib/featureFlags";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { BookLoopContext } from "@/hooks/useBookLoopState";

/** Formation loads its own data. Retain authenticated cloud book semantics without waiting for import. */
export function FormationBookBoundary({ userId, formation, children }: { userId:string; formation:boolean; children:ReactNode }) {
  const client = useQueryClient();
  useEffect(() => {
    client.removeQueries({ queryKey:["book-loop"], predicate:q=>q.queryKey[1] !== userId });
    return () => { client.removeQueries({queryKey:["book-loop",userId]}); };
  },[client,userId]);
  if (formation && (!getFeatureFlag("server_book_loop_enabled") || isDevMockAuthEnabled())) return <>{children}</>;
  if (formation) return <BookLoopContext.Provider value={userId}>{children}</BookLoopContext.Provider>;
  return <BookLoopProvider userId={userId}>{children}</BookLoopProvider>;
}
