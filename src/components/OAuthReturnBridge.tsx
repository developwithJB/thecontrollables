import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { takeOAuthReturn } from "@/lib/oauthReturn";
import { toast } from "sonner";
export function OAuthReturnBridge() {
  const queries = useQueryClient();
  useEffect(() => {
    const pending = takeOAuthReturn();
    if (!pending) return;
    void (async () => {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        toast.error("Sign in, then restart the connection.");
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        pending.family + "-oauth-callback",
        { body: { code: pending.code, state: pending.state } },
      );
      if (error || !data?.provider) {
        toast.error("Connection could not be verified. Please reconnect.");
        return;
      }
      await queries.invalidateQueries({
        queryKey: [
          pending.family === "wearable"
            ? "wearable-connections"
            : "integration-connections",
        ],
      });
      if (window.opener) {
        window.opener.postMessage(
          {
            type:
              pending.family === "wearable"
                ? "oauth-callback"
                : "oauth-complete",
            provider: data.provider,
            success: true,
          },
          window.location.origin,
        );
        window.close();
      } else toast.success("Connection verified.");
    })().catch(() =>
      toast.error("Connection could not be verified. Please reconnect."),
    );
  }, [queries]);
  return null;
}
