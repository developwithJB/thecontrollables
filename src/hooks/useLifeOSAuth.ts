import { useState, useEffect, createContext, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getDevMockUser, isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { getAuthRedirectPath } from "@/lib/safeNavigation";

export function useLifeOSAuth() {
  const devMockAuth = isDevMockAuthEnabled();
  const [user, setUser] = useState<User | null>(() => (devMockAuth ? getDevMockUser() : null));
  const [isLoading, setIsLoading] = useState(!devMockAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const authPath = getAuthRedirectPath(location);

  useEffect(() => {
    if (devMockAuth) {
      setUser(getDevMockUser());
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session && event !== "INITIAL_SESSION") {
        navigate(authPath, { replace: true });
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
          navigate(authPath, { replace: true });
        }
      } catch {
        if (isMounted) navigate(authPath, { replace: true });
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
  }, [authPath, devMockAuth, navigate]);

  return { user, isLoading, isDevMockUser: devMockAuth };
}

// Context for providing user to child pages
export const LifeOSUserContext = createContext<User | null>(null);

export function useLifeOSUser(): User {
  const user = useContext(LifeOSUserContext);
  if (!user) throw new Error("useLifeOSUser must be used within LifeOSLayout");
  return user;
}
