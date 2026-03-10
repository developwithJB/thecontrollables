import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useLifeOSAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session && event !== "INITIAL_SESSION") {
        navigate("/auth");
      }
    });

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session) {
          setUser(session.user);
          supabase.auth.refreshSession().then(({ data, error }) => {
            if (!isMounted) return;
            if (!error && data.session) setUser(data.session.user);
          });
        } else {
          navigate("/auth");
        }
      } catch {
        if (isMounted) navigate("/auth");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return { user, isLoading };
}

// Context for providing user to child pages
export const LifeOSUserContext = createContext<User | null>(null);

export function useLifeOSUser(): User {
  const user = useContext(LifeOSUserContext);
  if (!user) throw new Error("useLifeOSUser must be used within LifeOSLayout");
  return user;
}
