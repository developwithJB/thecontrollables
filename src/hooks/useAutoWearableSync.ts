import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const SYNC_THROTTLE_MS = 4 * 60 * 60 * 1000; // 4 hours
const SESSION_KEY = "auto_wearable_sync_last";

/**
 * Automatically triggers a wearable-sync on dashboard load
 * if a wearable is connected and hasn't been synced in the last 4 hours.
 */
export function useAutoWearableSync(
  userId: string | undefined,
  provider: string | null,
  isConnected: boolean
) {
  const queryClient = useQueryClient();
  const triggered = useRef(false);

  useEffect(() => {
    if (!userId || !provider || !isConnected || triggered.current) return;

    // Check throttle
    try {
      const last = sessionStorage.getItem(SESSION_KEY);
      if (last && Date.now() - Number(last) < SYNC_THROTTLE_MS) return;
    } catch {}

    triggered.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("wearable-sync", {
          body: { provider },
        });
        if (!error && !data?.error) {
          sessionStorage.setItem(SESSION_KEY, String(Date.now()));
          queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
          queryClient.invalidateQueries({ queryKey: ["health-sync-today"] });
          queryClient.invalidateQueries({ queryKey: ["wearable-connection-any"] });
          queryClient.invalidateQueries({ queryKey: ["brain-body"] });
          queryClient.invalidateQueries({ queryKey: ["wellness-goals"] });
        }
      } catch {
        // Silent fail — user can always manually sync
      }
    })();
  }, [userId, provider, isConnected, queryClient]);
}
