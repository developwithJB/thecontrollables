import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BookRecord, BookChange } from "./model";

export async function loadBookRecords(userId: string): Promise<BookRecord[]> {
  const rows: BookRecord[] = [];
  // PostgREST normally caps each response at 1,000 records.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("controllables_book_records")
      .select("kind,record_key,payload,revision")
      .eq("user_id", userId)
      .order("kind")
      .order("record_key")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data as BookRecord[]));
    if (data.length < 500) return rows;
  }
}
export async function saveBookChanges(
  userId: string,
  changes: BookChange[],
): Promise<void> {
  if (!changes.length) return;
  const { error } = await supabase.rpc("save_book_loop_changes", {
    p_user_id: userId,
    p_changes: changes as unknown as Json,
  });
  if (error) throw error;
}
export async function importBookRecords(
  userId: string,
  importId: string,
  records: Omit<BookRecord, "revision">[],
): Promise<void> {
  const { error } = await supabase.rpc("import_book_loop", {
    p_user_id: userId,
    p_import_id: importId,
    p_records: records as unknown as Json,
  });
  if (error) throw error;
}
