import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { useAppResume } from "@/hooks/useAppResume";
import { lazy, Suspense, useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { LifeOSLayout } from "@/components/layout/LifeOSLayout";

// Eagerly load Landing for fastest FCP
import Landing from "./pages/Landing";

// Lazy load other routes
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Wellness = lazy(() => import("./pages/Wellness"));
const Growth = lazy(() => import("./pages/Growth"));
const Planner = lazy(() => import("./pages/Planner"));
const Money = lazy(() => import("./pages/Money"));
const Reset = lazy(() => import("./pages/Reset"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QuickStart = lazy(() => import("./pages/QuickStart"));
const Integrations = lazy(() => import("./pages/Integrations"));

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
  (window as any).__REACT_QUERY_CLIENT__ = queryClient;
}

const PageLoader = () => <SplashScreen />;

// Life OS pages wrapped in shared layout
const LifeOSPage = ({ children }: { children: React.ReactNode }) => (
  <LifeOSLayout>{children}</LifeOSLayout>
);

const AppContent = () => {
  useAppResume();

  return (
    <>
      <Toaster />
      <Sonner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/quick-start"
            element={onboardingQuickStartEnabled() ? <QuickStart /> : <Navigate to="/auth?mode=signup" replace />}
          />

          {/* Life OS pages - wrapped in shared layout */}
          <Route path="/home" element={<LifeOSPage><Home /></LifeOSPage>} />
          <Route path="/wellness" element={<LifeOSPage><Wellness /></LifeOSPage>} />
          <Route path="/growth" element={<LifeOSPage><Growth /></LifeOSPage>} />
          <Route path="/planner" element={<LifeOSPage><Planner /></LifeOSPage>} />
          <Route path="/wealth" element={<LifeOSPage><Money /></LifeOSPage>} />
          <Route path="/money" element={<Navigate to="/wealth" replace />} />

          {/* Back-compat redirect */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />

          {/* Standalone pages */}
          <Route path="/reset" element={<Reset />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/integrations" element={<Integrations />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <AnimatePresence mode="wait">
              {showSplash && <SplashScreen key="splash" />}
            </AnimatePresence>
            <AppContent />
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
