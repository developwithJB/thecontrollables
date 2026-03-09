import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { useAppResume } from "@/hooks/useAppResume";
import { lazy, Suspense, useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";

// Eagerly load Landing for fastest FCP
import Landing from "./pages/Landing";

// Lazy load other routes to reduce initial bundle size
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reset = lazy(() => import("./pages/Reset"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QuickStart = lazy(() => import("./pages/QuickStart"));
const Planner = lazy(() => import("./pages/Planner"));

// Production-hardened query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // Garbage collect after 5 mins
      refetchOnWindowFocus: false, // Don't refetch on tab focus (handled by useAppResume)
      refetchOnReconnect: true, // Refetch when connection restored
      retry: 1, // Only retry once on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: "offlineFirst", // Better offline handling
    },
    mutations: {
      retry: 0, // Don't auto-retry mutations to prevent duplicate submissions
      networkMode: "online", // Mutations require network
    },
  },
});

// Store query client globally for error boundary access
if (typeof window !== "undefined") {
  (window as any).__REACT_QUERY_CLIENT__ = queryClient;
}

// Page loader using splash screen style
const PageLoader = () => <SplashScreen />;

// Inner app component that uses hooks
const AppContent = () => {
  // Handle app resume from background
  useAppResume();

  return (
    <>
      <OfflineIndicator />
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/planner" element={<Planner />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Initialize theme from localStorage on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    }
    // If no saved theme, respect system preference (handled by CSS)
  }, []);

  useEffect(() => {
    // Quick splash for branding (800ms), then fade immediately
    // Reduced from 1500ms for faster perceived load
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 800);

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
