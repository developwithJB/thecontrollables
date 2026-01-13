import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Book, History, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ControllableCard, ControllableType } from "@/components/ControllableCard";
import { AIChat } from "@/components/AIChat";
import { ReadingCard } from "@/components/ReadingCard";
import { ChallengeHistoryCard } from "@/components/ChallengeHistoryCard";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { supabase } from "@/integrations/supabase/client";
import { getDayContent, RESET_DAYS } from "@/lib/resetContent";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

const controllables: { type: ControllableType; emoji: string; title: string }[] = [
  { type: "awareness", emoji: "🦉", title: "Awareness" },
  { type: "perspective", emoji: "🐢", title: "Perspective" },
  { type: "habit", emoji: "🦈", title: "Habit" },
  { type: "wellness", emoji: "🛰️", title: "Wellness" },
  { type: "environment", emoji: "🚀", title: "Environment" },
];

type TabType = "home" | "readings" | "history";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [selectedControllable, setSelectedControllable] = useState<{
    type: ControllableType;
    emoji: string;
    title: string;
  } | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeSession, currentDay, isCompleted, isLoading: resetLoading, completedDays } = useReset();

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

  if (isAuthLoading || resetLoading || sessionsLoading) {
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

  // Check if today's day is already completed
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
              { id: "home" as TabType, label: "Home", icon: "🏠" },
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
      <main className="flex-1 max-w-md mx-auto px-6 py-8 w-full">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Greeting */}
              <div className="mb-8">
                <h1 className="font-display text-2xl font-semibold text-foreground">{greeting()}</h1>
              </div>

              {/* Reset Status Card */}
              <div className="p-6 rounded-2xl bg-card border shadow-soft mb-6">
                {!activeSession ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Ready to begin your 7-Day Reset?</p>
                    <Button onClick={() => navigate("/reset")} className="w-full h-12 text-base">
                      Start My Reset
                    </Button>
                  </div>
                ) : isCompleted ? (
                  <div className="text-center">
                    <div className="text-4xl mb-3">⚡</div>
                    <h2 className="font-display font-semibold text-foreground mb-2">Reset Complete</h2>
                    <p className="text-muted-foreground text-sm mb-4">Carry forward what you've learned.</p>
                    <Button onClick={() => navigate("/reset")} variant="outline" className="w-full">
                      Start a New Reset
                    </Button>
                  </div>
                ) : todayAlreadyCompleted ? (
                  <div className="text-center">
                    <div className="text-4xl mb-3">✨</div>
                    <h2 className="font-display font-semibold text-foreground mb-1">You've reset for today.</h2>
                    <p className="text-muted-foreground text-sm">Come back tomorrow for Day {currentDay + 1}.</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Day {currentDay} of 7</p>
                    <div className="text-4xl mb-2">{todayContent?.emoji}</div>
                    <h2 className="font-display font-semibold text-foreground mb-1">{todayContent?.controllable}</h2>
                    <p className="text-muted-foreground text-sm mb-4">{todayContent?.framingLine}</p>
                    <Button onClick={() => navigate("/reset")} className="w-full h-12 text-base">
                      Continue Reset
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t my-6" />

              {/* Talk to a Controllable */}
              <div className="mb-6">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
                  Talk to a Controllable
                </h2>
                <div className="flex justify-center gap-3">
                  {controllables.map((c) => (
                    <button
                      key={c.type}
                      onClick={() => setSelectedControllable(c)}
                      className="w-12 h-12 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-2xl transition-colors"
                    >
                      {c.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Book Link */}
              <a
                href="https://a.co/d/1DGPGEV"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-center"
              >
                <Book className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">📖 The Book</p>
              </a>
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
                  Daily readings from the book to guide your journey.
                </p>
              </div>

              <div className="space-y-4">
                {RESET_DAYS.map((day) => (
                  <ReadingCard
                    key={day.day}
                    day={day.day}
                    emoji={day.emoji}
                    controllable={day.controllable}
                    chapter={day.reading.chapter}
                    text={day.reading.text}
                    isCompleted={completedDays.some((d) => d.day_number === day.day)}
                  />
                ))}
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
                  Track your progress through each 7-Day Reset.
                </p>
              </div>

              {allSessions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    No challenges yet
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Start your first 7-Day Reset to begin tracking your journey.
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

      {/* AI Chat Modal */}
      {selectedControllable && (
        <AIChat
          controllable={selectedControllable.type}
          emoji={selectedControllable.emoji}
          title={selectedControllable.title}
          isOpen={!!selectedControllable}
          onClose={() => setSelectedControllable(null)}
        />
      )}
    </div>
  );
}
