import { useState, useCallback, Suspense } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { Book, FlaskConical, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SplashScreen } from "@/components/SplashScreen";
import { ProfileSettingsModal } from "@/components/ProfileSettingsModal";
import { InstallNudge } from "@/components/pwa/InstallNudge";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PullToRefreshIndicator } from "@/components/pwa/PullToRefreshIndicator";
import { PageShimmer } from "./PageShimmer";
import { BottomNav, DesktopNavRail } from "./BottomNav";
import { useLifeOSAuth, LifeOSUserContext } from "@/hooks/useLifeOSAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { APP_ROUTES } from "@/lib/appRoutes";

export const LifeOSLayout = () => {
  const { user, isLoading, isDevMockUser } = useLifeOSAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const { isPaid } = useEntitlements(user?.id || null);

  const {
    showNudge: showInstallNudge,
    isIOSDevice,
    handleInstall,
    handleDismiss: handleInstallDismiss,
  } = usePWAInstall({
    isAuthenticated: !!user,
    hasCompletedMeaningfulAction: true,
  });

  const handlePullRefresh = useCallback(async () => {
    const refreshPromise = queryClient.refetchQueries({ type: "active" });
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, 8000)
    );
    try {
      await Promise.race([refreshPromise, timeoutPromise]);
    } catch {
      // Refresh failures are non-blocking; the user can keep using cached data.
    }
    toast({ title: "Refreshed", description: "Data updated successfully." });
  }, [queryClient, toast]);

  const {
    containerRef: pullRefreshRef,
    isRefreshing: isPullRefreshing,
    pullProgress,
    pullDistance,
    triggerRefresh,
  } = usePullToRefresh({ onRefresh: handlePullRefresh, threshold: 80 });

  const handleSignOut = async () => {
    if (isDevMockAuthEnabled()) {
      toast({ title: "Dev mock session cleared", description: "Mock auth stays active while the env flag is on." });
      navigate("/");
      return;
    }

    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "See you tomorrow." });
    navigate("/");
  };

  if (isLoading) return <SplashScreen />;
  if (!user) return null;

  return (
    <LifeOSUserContext.Provider value={user}>
      <div className="app-future-shell relative flex min-h-screen flex-col bg-background">
        <div className="future-chrome-grid pointer-events-none fixed inset-0 opacity-100" />

        <header className="future-header pt-[env(safe-area-inset-top)]">
          <div className="max-w-md md:max-w-none mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={triggerRefresh}
                disabled={isPullRefreshing}
                className="rounded-xl text-muted-foreground hover:text-foreground md:hidden"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isPullRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(APP_ROUTES.readAlong)}
                className="rounded-xl text-muted-foreground hover:text-foreground"
                title="Read Along Training"
              >
                <Book className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfileSettings(true)}
                className="rounded-xl text-muted-foreground hover:text-foreground"
                title="Profile Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {isDevMockUser ? (
          <div className="relative z-20 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-amber-900 dark:text-amber-200">
            <div className="mx-auto flex max-w-md items-center gap-2 text-xs font-medium md:max-w-none md:px-2">
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              <span>Dev QA mock auth active. Local review data only; production auth is unchanged.</span>
            </div>
          </div>
        ) : null}

        {/* Main area: desktop rail + content */}
        <div className="relative z-10 flex flex-1 overflow-hidden">
          <DesktopNavRail />

          <main
            ref={pullRefreshRef}
            className="flex-1 overflow-y-auto pb-20 md:pb-6"
          >
            <PullToRefreshIndicator
              pullProgress={pullProgress}
              isRefreshing={isPullRefreshing}
              pullDistance={pullDistance}
            />
            <div className="mx-auto w-full max-w-md px-3 py-4 sm:px-5 md:max-w-3xl md:px-6 lg:max-w-5xl xl:max-w-7xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Suspense fallback={<PageShimmer />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Bottom nav (mobile only) */}
        <BottomNav />

        {/* Global overlays */}
        <OfflineIndicator />
        <InstallNudge
          show={showInstallNudge}
          isIOS={isIOSDevice}
          onInstall={handleInstall}
          onDismiss={handleInstallDismiss}
        />
        <UpdatePrompt />
        <WhatsNewModal />
        <ProfileSettingsModal
          open={showProfileSettings}
          onOpenChange={setShowProfileSettings}
          userId={user.id}
          userEmail={user.email ?? ""}
          isPaid={isPaid}
          onSignOut={handleSignOut}
        />
      </div>
    </LifeOSUserContext.Provider>
  );
};
