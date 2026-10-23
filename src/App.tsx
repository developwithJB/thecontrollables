import { OAuthReturnBridge } from "@/components/OAuthReturnBridge";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { useAppResume } from "@/hooks/useAppResume";
import { lazy, Suspense, useEffect } from "react";
import {
  formationCircuitsEnabled,
  formationCompletionEnabled,
  onboardingQuickStartEnabled,
} from "@/lib/featureFlags";
import { AppLayout } from "@/components/layout/AppLayout";
import { APP_ROUTES } from "@/lib/appRoutes";
import { applyStoredThemePreference } from "@/lib/theme";

declare global {
  interface Window {
    __REACT_QUERY_CLIENT__?: QueryClient;
  }
}

// Route-split every page so authenticated formation routes do not download the
// marketing experience before rendering their primary action.
const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const CampaignStartPage = lazy(() => import("./pages/public/CampaignStartPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const AuthPage = lazy(() => import("./pages/onboarding/AuthPage"));
const DailyDashboardPage = lazy(
  () => import("./pages/practice/DailyDashboardPage"),
);
const MyControllablesPage = lazy(
  () => import("./pages/practice/MyControllablesPage"),
);
const TrainingPage = lazy(() => import("./pages/practice/TrainingPage"));
const EvidencePage = lazy(() => import("./pages/practice/EvidencePage"));
const ProofCollectionPage = lazy(
  () => import("./pages/practice/ProofCollectionPage"),
);
const WellnessPage = lazy(() => import("./pages/wellness/WellnessPage"));
const GrowthPage = lazy(() => import("./pages/reflection/GrowthPage"));
const ReflectionPage = lazy(() => import("./pages/reflection/ReflectionPage"));
const PlannerPage = lazy(() => import("./pages/planning/PlannerPage"));
const MoneyPage = lazy(() => import("./pages/money/MoneyPage"));
const ResetPage = lazy(() => import("./pages/wellness/ResetPage"));
const CoachPage = lazy(() => import("./pages/coaching/CoachPage"));
const PricingPage = lazy(() => import("./pages/public/PricingPage"));
const BillingPage = lazy(() => import("./pages/account/BillingPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));
const QuickStartPage = lazy(() => import("./pages/onboarding/QuickStartPage"));
const IntegrationsPage = lazy(() => import("./pages/account/IntegrationsPage"));
const ReadAlongPage = lazy(() => import("./pages/practice/ReadAlongPage"));
const GoalPage = lazy(() => import("./pages/planning/GoalPage"));
const TimelinePage = lazy(() => import("./pages/planning/TimelinePage"));
const FormationTodayPage = lazy(
  () => import("./pages/formation/FormationTodayPage"),
);
const FormationCircuitPage = lazy(
  () => import("./pages/formation/FormationCircuitPage"),
);
const FormationCompletionPage = lazy(
  () => import("./pages/formation/FormationCompletionPage"),
);

// Shared query cache; preserve these defaults when reorganizing routes.
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
          <Route path="/start" element={<CampaignStartPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path={APP_ROUTES.landing} element={<LandingPage />} />
          <Route path={APP_ROUTES.privacy} element={<PrivacyPage />} />
          <Route path={APP_ROUTES.terms} element={<TermsPage />} />
          <Route path={APP_ROUTES.auth} element={<AuthPage />} />
          <Route
            path={APP_ROUTES.quickStart}
            element={
              onboardingQuickStartEnabled() ? (
                <QuickStartPage />
              ) : (
                <Navigate to="/auth?mode=signup" replace />
              )
            }
          />

          {/* Authenticated pages share a persistent layout. */}
          <Route element={<AppLayout />}>
            <Route path="/settings" element={<Navigate to="/formation/today?settings=profile" replace />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route path={APP_ROUTES.home} element={<DailyDashboardPage />} />
            <Route
              path={APP_ROUTES.formationToday}
              element={
                formationCircuitsEnabled() ? (
                  <FormationTodayPage />
                ) : (
                  <Navigate to={APP_ROUTES.home} replace />
                )
              }
            />
            <Route
              path={APP_ROUTES.formationCircuit}
              element={
                formationCircuitsEnabled() ? (
                  <FormationCircuitPage />
                ) : (
                  <Navigate to={APP_ROUTES.home} replace />
                )
              }
            />
            <Route
              path={APP_ROUTES.formationCompletion}
              element={
                formationCircuitsEnabled() && formationCompletionEnabled() ? (
                  <FormationCompletionPage />
                ) : (
                  <Navigate to={APP_ROUTES.home} replace />
                )
              }
            />
            <Route path={APP_ROUTES.timeline} element={<TimelinePage />} />
            <Route path={APP_ROUTES.readAlong} element={<ReadAlongPage />} />
            <Route path={APP_ROUTES.goal} element={<GoalPage />} />
            <Route
              path={APP_ROUTES.myControllables}
              element={<MyControllablesPage />}
            />
            <Route path={APP_ROUTES.train} element={<TrainingPage />} />
            <Route path={APP_ROUTES.evidence} element={<EvidencePage />} />
            <Route
              path={APP_ROUTES.proofDex}
              element={<ProofCollectionPage />}
            />
            <Route path={APP_ROUTES.dex} element={<ProofCollectionPage />} />
            <Route path={APP_ROUTES.wellness} element={<WellnessPage />} />
            <Route path={APP_ROUTES.planner} element={<PlannerPage />} />
            <Route path={APP_ROUTES.growth} element={<GrowthPage />} />
            <Route path={APP_ROUTES.reflect} element={<ReflectionPage />} />
            <Route path={APP_ROUTES.wealth} element={<MoneyPage />} />
          </Route>

          <Route
            path={APP_ROUTES.money}
            element={<Navigate to={APP_ROUTES.wealth} replace />}
          />
          <Route
            path={APP_ROUTES.proof}
            element={<Navigate to={APP_ROUTES.evidence} replace />}
          />

          {/* Preserve existing dashboard bookmarks. */}
          <Route
            path={APP_ROUTES.dashboard}
            element={<Navigate to={APP_ROUTES.home} replace />}
          />

          {/* Standalone pages */}
          <Route path={APP_ROUTES.reset} element={<ResetPage />} />
          <Route path={APP_ROUTES.billing} element={<BillingPage />} />
          <Route path={APP_ROUTES.admin} element={<AdminPage />} />
          <Route
            path={APP_ROUTES.integrations}
            element={<IntegrationsPage />}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
};

// A data-router root enables supported navigation blockers without rewriting
// the existing page routes, auth boundary or OAuth return bridge.
const router = createBrowserRouter([
  { path: "*", element: (
    <ErrorBoundary>
      <TooltipProvider>
        <OAuthReturnBridge />
        <AppContent />
      </TooltipProvider>
    </ErrorBoundary>
  ) },
]);

const App = () => {
  useEffect(() => {
    applyStoredThemePreference();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
