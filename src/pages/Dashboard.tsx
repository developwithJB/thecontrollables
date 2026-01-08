import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Book, MessageCircle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { StreakDisplay } from "@/components/StreakDisplay";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { ControllableCard, ControllableType } from "@/components/ControllableCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const controllables: { type: ControllableType; emoji: string; title: string; description: string }[] = [
  { type: "awareness", emoji: "🦉", title: "Awareness", description: "See things as they are. Reframe your thoughts with clarity." },
  { type: "perspective", emoji: "🐢", title: "Perspective", description: "Pause before reacting. Find patience in the process." },
  { type: "habit", emoji: "🦈", title: "Habit", description: "Keep moving forward. Small actions build momentum." },
  { type: "wellness", emoji: "🛰️", title: "Wellness", description: "Maintain your systems. Balance body and mind." },
  { type: "environment", emoji: "🚀", title: "Environment", description: "Shape your surroundings. Curate the people around you." },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayFocus, setTodayFocus] = useState("");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you tomorrow!",
    });
    navigate("/");
  };

  const handleCheckIn = async (focus: string) => {
    setTodayFocus(focus);
    setIsCheckedIn(true);
    setCurrentStreak(prev => prev + 1);
    if (currentStreak + 1 > longestStreak) {
      setLongestStreak(currentStreak + 1);
    }
    toast({
      title: "You're checked in!",
      description: "Go take action. Come back tomorrow.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <a 
              href="https://a.co/d/1DGPGEV"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Book className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">The Book</span>
              </Button>
            </a>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            {greeting()}
          </h1>
          <p className="text-muted-foreground">
            {isCheckedIn 
              ? "You're all set. Go take action."
              : "What will you focus on today?"
            }
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <DailyCheckIn 
              isCheckedIn={isCheckedIn}
              focus={todayFocus}
              onCheckIn={handleCheckIn}
            />

            <StreakDisplay 
              currentStreak={currentStreak}
              longestStreak={longestStreak}
            />

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <motion.button
                className="p-5 rounded-xl bg-card border shadow-soft text-left group hover:border-accent/30 transition-all"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Compass className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">7-Day Challenge</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  A guided journey through all 5 Controllables
                </p>
              </motion.button>

              <motion.button
                className="p-5 rounded-xl bg-card border shadow-soft text-left group hover:border-accent/30 transition-all"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <MessageCircle className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">Talk to a Guide</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Chat with your Controllables for clarity
                </p>
              </motion.button>
            </div>
          </div>

          {/* Right Column - Controllables */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
              The 5 Controllables
            </h2>
            {controllables.map((c, i) => (
              <motion.div
                key={c.type}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <ControllableCard
                  type={c.type}
                  emoji={c.emoji}
                  title={c.title}
                  description={c.description}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 mt-12 border-t">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} The Controllables</p>
          <a 
            href="https://a.co/d/1DGPGEV"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Get the book →
          </a>
        </div>
      </footer>
    </div>
  );
}
