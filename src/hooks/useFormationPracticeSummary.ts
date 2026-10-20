import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { loadFormationCircuitHistory } from "@/data/formation/circuitRepository";
import { CIRCUIT_TYPES, TRAINING_TRACKS, type FormationCircuitEntry } from "@/domain/formation/circuits";

type Practice = Pick<FormationCircuitEntry, "userId" | "track" | "localDate" | "circuit" | "updatedAt" | "completedActionIds">;
export function summarizeFormationPractices(history: Practice[]) {
  const unique = new Map<string, Practice>();
  for (const entry of history) {
    const key = `${entry.userId}:${entry.track}:${entry.localDate}:${entry.circuit}`;
    if (!unique.has(key) || unique.get(key)!.updatedAt < entry.updatedAt) unique.set(key, entry);
  }
  const recorded = [...unique.values()].filter(e => e.completedActionIds.length > 0);
  return {
    total: recorded.length,
    days: new Set(recorded.map(e => e.localDate)).size,
    perCircuit: Object.fromEntries(CIRCUIT_TYPES.map(c => [c, recorded.filter(e => e.circuit === c).length])),
  };
}
export async function loadFormationPracticeSummary(userId: string, localOnly: boolean) {
  if (localOnly) return summarizeFormationPractices((await Promise.all(TRAINING_TRACKS.map(track => loadFormationCircuitHistory(userId, track, true)))).flat());
  // Read only count inputs, never proof URLs or private reflection bodies. Paginate so totals do not stop at 500/1000.
  const history: Practice[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("formation_circuit_entries")
      .select("user_id,track,local_date,circuit_type,updated_at,completed_action_ids").eq("user_id",userId).order("id").range(offset,offset+499);
    if (error) throw error;
    for (const row of data ?? []) history.push({ userId:row.user_id,track:row.track as Practice["track"],localDate:row.local_date,circuit:row.circuit_type as Practice["circuit"],updatedAt:row.updated_at,completedActionIds:row.completed_action_ids as Practice["completedActionIds"] });
    if (!data || data.length < 500) break;
  }
  return summarizeFormationPractices(history);
}
export function useFormationPracticeSummary(userId: string) {
  const localOnly = isDevMockAuthEnabled();
  const query = useQuery({ queryKey:["formation-practice-summary",userId,localOnly],queryFn:()=>loadFormationPracticeSummary(userId,localOnly),staleTime:15_000 });
  return { ...(query.data ?? summarizeFormationPractices([])), isLoading:query.isLoading,error:query.error };
}
