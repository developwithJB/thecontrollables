import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Book, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ControllableCard, ControllableType } from "@/components/ControllableCard";
import { AIChat } from "@/components/AIChat";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { supabase } from "@/integrations/supabase/client";
import { getDayContent } from "@/lib/resetContent";
import type { User } from "@supabase/supabase-js";

const controllables: { type: ControllableType; emoji: string; title: string }[] = [
  { type: "awareness", emoji: "🦉", title: "Awareness" },
  { type: "perspective", emoji: "🐢", title: "Perspective" },
  { type: "habit", emoji: "🦈", title: "Habit" },
  { type: "wellness", emoji: "🛰️", title: "Wellness" },
  { type: "environment", emoji: "🚀", title: "Environment" },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedControllable, setSelectedControllable] = useState<{
    type: ControllableType;
    emoji: string;
    title: string;
  } | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeSession, currentDay, isCompleted, isLoading: resetLoading, completedDays } = useReset();

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

  if (isAuthLoading || resetLoading) {
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

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto px-6 py-8 w-full">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl font-semibold text-foreground">{greeting()}</h1>
        </motion.div>

        {/* Reset Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-6 rounded-2xl bg-card border shadow-soft mb-6"
        >
          {!activeSession ? (
            // No active reset
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Ready to begin your 7-Day Reset?</p>
              <Button onClick={() => navigate("/reset")} className="w-full h-12 text-base">
                Start My Reset
              </Button>
            </div>
          ) : isCompleted ? (
            // Reset completed
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h2 className="font-display font-semibold text-foreground mb-2">Reset Complete</h2>
              <p className="text-muted-foreground text-sm mb-4">Carry forward what you've learned.</p>
              <Button onClick={() => navigate("/reset")} variant="outline" className="w-full">
                Start a New Reset
              </Button>
            </div>
          ) : todayAlreadyCompleted ? (
            // Today already done
            <div className="text-center">
              <div className="text-4xl mb-3">✨</div>
              <h2 className="font-display font-semibold text-foreground mb-1">You've reset for today.</h2>
              <p className="text-muted-foreground text-sm">Come back tomorrow for Day {currentDay + 1}.</p>
            </div>
          ) : (
            // Active reset, ready for today
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
        </motion.div>

        {/* Divider */}
        <div className="border-t my-6" />

        {/* Talk to a Controllable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6"
        >
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
        </motion.div>

        {/* Book Link */}
        <motion.a
          href="https://a.co/d/1DGPGEV"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="block p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-center"
        >
          <Book className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">📖 The Book</p>
        </motion.a>
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
