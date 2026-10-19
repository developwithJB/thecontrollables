import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { isGospelReference } from "@/domain/formation/gospelAwareness";
import { getLocalDate } from "@/domain/formation/circuitRules";

export interface FormationEntryStatus {
  strictReady: boolean;
  reviewedDays: number;
  emailDeliveryReady: boolean;
  sample: { title: string; body: string; scriptureReference: string } | null;
}
export function normalizeEntryStatus(value: unknown): FormationEntryStatus {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const sample = row.sample as Record<string, unknown> | null;
  return {
    strictReady: row.strictReady === true && row.reviewedDays === 75,
    reviewedDays: typeof row.reviewedDays === "number" ? row.reviewedDays : 0,
    emailDeliveryReady: row.emailDeliveryReady === true,
    sample: sample && typeof sample.title === "string" && typeof sample.body === "string" && typeof sample.scriptureReference === "string" && isGospelReference(sample.scriptureReference)
      ? { title: sample.title, body: sample.body, scriptureReference: sample.scriptureReference } : null,
  };
}
export function useFormationEntryStatus(startDate = getLocalDate()) {
  return useQuery({
    queryKey: ["formation-entry-status", startDate],
    queryFn: async () => {
      if (isDevMockAuthEnabled()) return normalizeEntryStatus({ strictReady: true, reviewedDays: 75, emailDeliveryReady: false });
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const { data, error } = await supabase.rpc("get_formation_entry_status", { p_start_date: startDate }).abortSignal(controller.signal);
        if (error) throw new Error("Availability could not be checked. You can still choose Read Along.");
        return normalizeEntryStatus(data);
      } finally { window.clearTimeout(timer); }
    },
    staleTime: 30_000, retry: 1,
  });
}
