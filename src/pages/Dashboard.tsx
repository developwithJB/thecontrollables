import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Book, BookOpen, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { useLifeDashboard } from "@/hooks/useLifeDashboard";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useDailyReadings } from "@/hooks/useDailyReadings";
import { supabase } from "@/integrations/supabase/client";
import { getDayContent, RESET_DAYS } from "@/lib/resetContent";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

// Dashboard modules
import { MainQuestModule } from "@/components/dashboard/MainQuestModule";
import { XpMomentumModule } from "@/components/dashboard/XpMomentumModule";
import { IntegrityMeterModule } from "@/components/dashboard/IntegrityMeterModule";
import { TimeCurrencyModule } from "@/components/dashboard/TimeCurrencyModule";
import { BuildOverviewModule } from "@/components/dashboard/BuildOverviewModule";
import { AIGuidePanel } from "@/components/dashboard/AIGuidePanel";
import { ResetProgressModule } from "@/components/dashboard/ResetProgressModule";
import { ReadingCard } from "@/components/ReadingCard";
import { ChallengeHistoryCard } from "@/components/ChallengeHistoryCard";
import { GameRulesSection } from "@/components/GameRulesSection";

type TabType = "dashboard" | "readings" | "history";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Reset data
  const { activeSession, currentDay, isCompleted, isLoading: resetLoading, completedDays } = useReset();
  
  // Life dashboard data
  const {
    isLoading: dashboardLoading,
    activeQuest,
    createQuest,
    isCreatingQuest,
    updateQuest,
    isUpdatingQuest,
    completeQuest,
    isCompletingQuest,
    totalXp,
    xpLogs,
    integrityScore,
    pendingPromises,
    createPromise,
    resolvePromise,
    todayTimeLog,
    logTime,
    isLoggingTime,
  } = useLifeDashboard();

  // Daily readings from database
  const { readings, isLoading: readingsLoading } = useDailyReadings();

  // Build data for AI Guide
  const { currentBuild, buildLoading } = useBuildAssessment();

  // Fetch all reset sessions for history
  const { data: allSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["all-reset-sessions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch completed days per session for history
  const { data: allCompletedDays = [] } = useQuery({
    queryKey: ["all-completed-days", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("daily_resets")
        .select("session_id, day_number")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you tomorrow.",
    });
    navigate("/");
  };

  // Get completed days count per session
  const getCompletedDaysForSession = (sessionId: string) => {
    return allCompletedDays.filter((d) => d.session_id === sessionId).length;
  };

  if (isAuthLoading || resetLoading || dashboardLoading || sessionsLoading || readingsLoading || buildLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground">
          Loading...
        </motion.div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning.";
    if (hour < 18) return "Good afternoon.";
    return "Good evening.";
  };

  const todayContent = activeSession && !isCompleted ? getDayContent(currentDay) : null;
  const todayAlreadyCompleted = completedDays.some((d) => d.day_number === currentDay);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <a href="https://a.co/d/1DGPGEV" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Book className="w-4 h-4" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-[65px] z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-md mx-auto px-6">
          <div className="flex gap-1 py-2">
            {[
              { id: "dashboard" as TabType, label: "Dashboard", icon: "🎮" },
              { id: "readings" as TabType, label: "Readings", icon: "📖" },
              { id: "history" as TabType, label: "History", icon: "📅" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto px-6 py-6 w-full">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Greeting */}
              <div className="mb-2">
                <h1 className="font-display text-2xl font-semibold text-foreground">{greeting()}</h1>
                <p className="text-sm text-muted-foreground">Your life dashboard</p>
              </div>

              {/* Main Quest Module */}
              <MainQuestModule
                activeQuest={activeQuest}
                onCreateQuest={createQuest}
                onUpdateQuest={updateQuest}
                onCompleteQuest={completeQuest}
                isCreating={isCreatingQuest}
                isUpdating={isUpdatingQuest}
                isCompleting={isCompletingQuest}
              />

              {/* Reset Progress Module */}
              <ResetProgressModule
                hasActiveSession={!!activeSession}
                isCompleted={isCompleted}
                currentDay={currentDay}
                completedDays={completedDays}
                todayAlreadyCompleted={todayAlreadyCompleted}
                readings={readings}
              />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <XpMomentumModule totalXp={totalXp} recentLogs={xpLogs} />
                <IntegrityMeterModule
                  integrityScore={integrityScore}
                  pendingPromises={pendingPromises}
                  onCreatePromise={createPromise}
                  onResolvePromise={resolvePromise}
                />
              </div>

              {/* Time & Build */}
              <div className="grid grid-cols-2 gap-3">
                <TimeCurrencyModule
                  todayTimeLog={todayTimeLog}
                  onLogTime={logTime}
                  isLogging={isLoggingTime}
                />
                <BuildOverviewModule />
              </div>

              {/* AI Guide */}
              <AIGuidePanel
                activeQuest={activeQuest}
                totalXp={totalXp}
                integrityScore={integrityScore}
                currentBuild={currentBuild}
              />
            </motion.div>
          )}

          {activeTab === "readings" && (
            <motion.div
              key="readings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
                  The Controllables
                </h1>
                <p className="text-muted-foreground text-sm">
                  Play your life on purpose.
                </p>
              </div>

              {/* Game Philosophy Rules */}
              <GameRulesSection />

              {/* Section Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">Daily Readings</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-4">
                {readings.length > 0 ? (
                  readings.map((reading) => (
                    <ReadingCard
                      key={reading.id}
                      day={reading.day_number}
                      emoji={reading.emoji}
                      controllable={reading.controllable}
                      chapter={reading.reading_chapter}
                      text={reading.reading_text}
                      isCompleted={completedDays.some((d) => d.day_number === reading.day_number)}
                    />
                  ))
                ) : (
                  // Fallback to static content if database is empty
                  RESET_DAYS.map((day) => (
                    <ReadingCard
                      key={day.day}
                      day={day.day}
                      emoji={day.emoji}
                      controllable={day.controllable}
                      chapter={day.reading.chapter}
                      text={day.reading.text}
                      isCompleted={completedDays.some((d) => d.day_number === day.day)}
                    />
                  ))
                )}
              </div>

              {/* Book promo */}
              <motion.a
                href="https://a.co/d/1DGPGEV"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="block mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-center"
              >
                <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-display font-semibold text-foreground mb-2">
                  Read the Full Book
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Dive deeper into The Controllables on Amazon
                </p>
                <Button variant="outline" size="sm">
                  Get the Book →
                </Button>
              </motion.a>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
                  Your Journey
                </h1>
                <p className="text-muted-foreground text-sm">
                  Track your progress through each reset.
                </p>
              </div>

              {allSessions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    No resets yet
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Start your first 7-Day Reset to begin.
                  </p>
                  <Button onClick={() => navigate("/reset")}>
                    Start Your First Reset
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {allSessions.map((session, index) => (
                    <ChallengeHistoryCard
                      key={session.id}
                      session={session}
                      completedDays={getCompletedDaysForSession(session.id)}
                      index={index}
                    />
                  ))}
                </div>
              )}

              {/* Stats summary */}
              {allSessions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 p-6 rounded-2xl bg-muted/30 border"
                >
                  <h3 className="font-display font-semibold text-foreground mb-4 text-center">
                    Journey Stats
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-display font-bold text-primary">
                        {allSessions.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Resets</p>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-primary">
                        {allCompletedDays.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-primary">
                        {allSessions.filter((s) => s.status === "completed").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} The Controllables</p>
      </footer>
    </div>
  );
}
