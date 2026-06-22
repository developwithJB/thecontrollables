import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { useAppResume } from "@/hooks/useAppResume";
import { lazy, Suspense, useEffect } from "react";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { LifeOSLayout } from "@/components/layout/LifeOSLayout";
import { APP_ROUTES } from "@/lib/appRoutes";
import { applyStoredThemePreference } from "@/lib/theme";

declare global {
  interface Window {
    __REACT_QUERY_CLIENT__?: QueryClient;
  }
}

// Eagerly load Landing for fastest FCP
import Landing from "./pages/Landing";

// Lazy load other routes
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const MyControllables = lazy(() => import("./pages/MyControllables"));
const Train = lazy(() => import("./pages/Train"));
const Proof = lazy(() => import("./pages/Proof"));
const ControllablesDex = lazy(() => import("./pages/ControllablesDex"));
const Wellness = lazy(() => import("./pages/Wellness"));
const Growth = lazy(() => import("./pages/Growth"));
const Reflect = lazy(() => import("./pages/Reflect"));
const Planner = lazy(() => import("./pages/Planner"));
const Money = lazy(() => import("./pages/Money"));
const Reset = lazy(() => import("./pages/Reset"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QuickStart = lazy(() => import("./pages/QuickStart"));
const Integrations = lazy(() => import("./pages/Integrations"));
const ReadAlong = lazy(() => import("./pages/ReadAlong"));

// Production-hardened query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

if (typeof window !== "undefined") {
  window.__REACT_QUERY_CLIENT__ = queryClient;
}

const PageLoader = () => <SplashScreen />;

const AppContent = () => {
  useAppResume();

  return (
    <>
      <Toaster />
      <Sonner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path={APP_ROUTES.landing} element={<Landing />} />
          <Route path={APP_ROUTES.auth} element={<Auth />} />
          <Route
            path={APP_ROUTES.quickStart}
            element={onboardingQuickStartEnabled() ? <QuickStart /> : <Navigate to="/auth?mode=signup" replace />}
          />

          {/* Life OS pages - persistent layout, only content swaps */}
          <Route element={<LifeOSLayout />}>
            <Route path={APP_ROUTES.home} element={<Home />} />
            <Route path={APP_ROUTES.readAlong} element={<ReadAlong />} />
            <Route path={APP_ROUTES.myControllables} element={<MyControllables />} />
            <Route path={APP_ROUTES.train} element={<Train />} />
            <Route path={APP_ROUTES.proof} element={<Proof />} />
            <Route path={APP_ROUTES.proofDex} element={<ControllablesDex />} />
            <Route path={APP_ROUTES.dex} element={<ControllablesDex />} />
            <Route path={APP_ROUTES.wellness} element={<Wellness />} />
            <Route path={APP_ROUTES.planner} element={<Planner />} />
            <Route path={APP_ROUTES.growth} element={<Growth />} />
            <Route path={APP_ROUTES.reflect} element={<Reflect />} />
            <Route path={APP_ROUTES.wealth} element={<Money />} />
          </Route>

          <Route path={APP_ROUTES.money} element={<Navigate to={APP_ROUTES.wealth} replace />} />

          {/* Back-compat redirect */}
          <Route path={APP_ROUTES.dashboard} element={<Navigate to={APP_ROUTES.home} replace />} />

          {/* Standalone pages */}
          <Route path={APP_ROUTES.reset} element={<Reset />} />
          <Route path={APP_ROUTES.billing} element={<Billing />} />
          <Route path={APP_ROUTES.admin} element={<Admin />} />
          <Route path={APP_ROUTES.integrations} element={<Integrations />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => {
  useEffect(() => {
    applyStoredThemePreference();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
