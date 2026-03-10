import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useDailyRings } from "@/hooks/useDailyRings";
import { useDashboardIntelligence } from "@/hooks/useDashboardIntelligence";
import { useIntegrationConnections } from "@/hooks/useIntegrations";
import { useReset } from "@/hooks/useReset";
import { getDefaultCheckoutPlan } from "@/lib/featureFlags";

import { DailyRings } from "@/components/dashboard/DailyRings";
import { WeeklyRecapCard } from "@/components/dashboard/WeeklyRecapCard";
import { ForecastCard } from "@/components/dashboard/ForecastCard";
import { QuickHistoryEntry } from "@/components/dashboard/QuickHistoryEntry";
import { AskDashboardBar } from "@/components/dashboard/AskDashboardBar";
import { AIRecommendedActions } from "@/components/dashboard/AIRecommendedActions";
import { BuildOverviewModule } from "@/components/dashboard/BuildOverviewModule";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { InstagramInputCard } from "@/components/dashboard/InstagramInputCard";
import { IGProofHistory } from "@/components/dashboard/IGProofHistory";
import { ControllablePoweredBy } from "@/components/layout/ControllablePoweredBy";
import { GameRulesSection } from "@/components/GameRulesSection";
import { DashboardManualSection } from "@/components/DashboardManualSection";

export default function Growth() {
  usePageViewTracking("Growth");
  const user = useLifeOSUser();
  const navigate = useNavigate();

  const { isPaid, initiateCheckout, isCheckingOut } = useEntitlements(user.id);
  const { currentBuild } = useBuildAssessment();
  const { rings, completedCount } = useDailyRings(user.id);
  const intelligence = useDashboardIntelligence(user.id, completedCount, rings);
  const { data: connections } = useIntegrationConnections();
  const { activeSession, isCompleted, isExpired } = useReset(user.id);

  const hasInstagram = (connections || []).some(
    (c) => c.provider === "instagram" && c.status === "active"
  );

  const [showIGProof, setShowIGProof] = useState(false);
  const hasActiveSession = !!activeSession && !isCompleted && !isExpired;

  const startCheckout = useCallback(
    (source = "growth") => {
      void initiateCheckout(getDefaultCheckoutPlan(), { source });
    },
    [initiateCheckout],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🌱</span>
          <h1 className="font-display text-2xl font-semibold text-foreground">Growth</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your self-leadership operating panel.</p>
      </div>

      <ControllablePoweredBy controllables={["perspective", "habit", "environment"]} />

      {/* Reset nudge */}
      {hasActiveSession && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border border-border bg-card text-center"
        >
          <p className="text-xs text-muted-foreground mb-2">🧱 Active Snapshot: Day {activeSession?.current_day}</p>
          <Button size="sm" onClick={() => navigate("/reset")} className="gap-1.5">
            Continue Reset
          </Button>
        </motion.div>
      )}

      {/* 5 Daily Rings — the hero of Growth */}
      <DailyRings userId={user.id} />

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-sm mx-auto w-full flex justify-center gap-2 flex-wrap"
      >
        {hasInstagram && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIGProof(!showIGProof)}
            className="gap-1.5 text-xs border-accent/30 hover:bg-accent/10"
          >
            <Camera className="w-3.5 h-3.5 text-accent-foreground" />
            IG Proof
          </Button>
        )}
        <QuickHistoryEntry userId={user.id} />
      </motion.div>

      {/* Ask bar */}
      <div className="max-w-sm mx-auto w-full">
        <AskDashboardBar />
      </div>

      {/* Forecast */}
      {completedCount >= 3 && (
        <div className="max-w-sm mx-auto w-full">
          <ForecastCard data={intelligence.data} />
        </div>
      )}

      {/* Weekly Review */}
      <div className="max-w-sm mx-auto w-full">
        <WeeklyRecapCard userId={user.id} />
      </div>

      {/* IG Proof card + history */}
      <AnimatePresence>
        {showIGProof && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-sm mx-auto w-full overflow-hidden space-y-3"
          >
            <InstagramInputCard userId={user.id} onClose={() => setShowIGProof(false)} />
            <IGProofHistory userId={user.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Recommended Actions */}
      <div className="max-w-sm mx-auto w-full">
        <AIRecommendedActions data={intelligence.data} />
      </div>

      {/* Build Overview */}
      <BuildOverviewModule compact />

      {/* Controllable Levels */}
      <ControllableLevelsCard userId={user.id} />

      {/* Game Rules & Manual - moved from Guide tab */}
      <GameRulesSection />
      <DashboardManualSection />

      {/* Book promo */}
      <motion.a
        href="https://a.co/d/1DGPGEV"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="block p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-center"
      >
        <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
        <h3 className="font-display font-semibold text-foreground mb-2">Read the Full Book</h3>
        <p className="text-sm text-muted-foreground mb-4">Dive deeper into The Controllables on Amazon</p>
        <Button variant="outline" size="sm">Get the Book →</Button>
      </motion.a>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
