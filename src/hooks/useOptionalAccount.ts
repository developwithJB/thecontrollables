import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
/** Public-page navigation only. Server billing and authorization remain authoritative. */
export function useOptionalAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let sessionChanged = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        sessionChanged = true;
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !sessionChanged) {
          setUser(data.session?.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return { user, isLoading };
}
