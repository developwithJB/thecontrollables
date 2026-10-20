import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export interface HostedAiAllowance {
  enabled: boolean;
  plan: string;
  repliesRemaining: number;
  dailyRemaining: number;
  budgetPercentRemaining: number;
  resetsAt: string | null;
  byoActive: boolean;
  byoRemaining: number;
}
export function useHostedAiAllowance(ownerId?: string | null) {
  const [sessionOwner, setSessionOwner] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSessionOwner(data.session?.user.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSessionOwner(session?.user.id ?? null),
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const userId = ownerId ?? sessionOwner;
  return useQuery({
    queryKey: ["hosted-ai-allowance", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async (): Promise<HostedAiAllowance> => {
      const { data, error } = await supabase.rpc("get_hosted_ai_allowance");
      if (error || !data || typeof data !== "object" || Array.isArray(data))
        throw new Error("ai_allowance_unavailable");
      return data as unknown as HostedAiAllowance;
    },
  });
}
