import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Check, 
  Lock, 
  MessageCircle, 
  Download,
  Share2,
  Users,
  Copy,
  ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { AIChat } from "@/components/AIChat";
import { WellnessLogger } from "@/components/WellnessLogger";
import { useChallenge, CHALLENGE_DAYS } from "@/hooks/useChallenge";
import { useWellness } from "@/hooks/useWellness";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

export default function Challenge() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWellnessOpen, setIsWellnessOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeChallenge, progress, getCurrentDay, completeDay } = useChallenge(user?.id);
  const { logWellness, todayLog } = useWellness(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (activeChallenge && selectedDay === null) {
      setSelectedDay(getCurrentDay());
    }
  }, [activeChallenge, selectedDay, getCurrentDay]);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!activeChallenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Active Challenge</h1>
          <p className="text-muted-foreground mb-6">Start a challenge from your Dashboard.</p>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentDay = getCurrentDay();
  const dayInfo = selectedDay ? CHALLENGE_DAYS[selectedDay - 1] : CHALLENGE_DAYS[currentDay - 1];
  const dayProgress = progress.find(p => p.day_number === selectedDay);
  const isDayCompleted = dayProgress?.completed || false;
  const isDayUnlocked = selectedDay ? selectedDay <= currentDay : true;

  const handleCompleteDay = async () => {
    if (!selectedDay) return;
    await completeDay(selectedDay, reflection);
    setReflection("");
  };

  const copyInviteCode = async () => {
    if (activeChallenge.invite_code) {
      await navigator.clipboard.writeText(activeChallenge.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Share this code with friends." });
    }
  };

  const exportJournal = () => {
    const journalData = CHALLENGE_DAYS.map((day, i) => {
      const dayProg = progress.find(p => p.day_number === i + 1);
      return `Day ${i + 1}: ${day.theme}\n${day.action}\n${dayProg?.completed ? `Completed: ${dayProg.completed_at}\nReflection: ${dayProg.reflection || "None"}` : "Not completed"}\n`;
    }).join("\n---\n\n");

    const blob = new Blob([journalData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '7-day-challenge-journal.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Journal exported!", description: "Check your downloads." });
  };

  const shareChallenge = async () => {
    const text = `I just completed Day ${selectedDay} of the 7-Day Dashboard Challenge! 🚀 Join me: ${window.location.origin}/dashboard`;
    if (navigator.share) {
      await navigator.share({ title: "7-Day Dashboard Challenge", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!", description: "Share it anywhere." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Logo />
          </div>
          
          {!activeChallenge.is_solo && activeChallenge.invite_code && (
            <Button variant="outline" size="sm" onClick={copyInviteCode}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {activeChallenge.invite_code}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress Overview */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            7-Day Challenge
          </h1>
          <p className="text-muted-foreground">
            {activeChallenge.is_solo ? "Your solo journey" : "Team challenge"} • Day {currentDay} of 7
          </p>
        </motion.div>

        {/* Day Selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {CHALLENGE_DAYS.map((day, i) => {
            const dayNum = i + 1;
            const isCompleted = progress.some(p => p.day_number === dayNum && p.completed);
            const isUnlocked = dayNum <= currentDay;
            const isSelected = selectedDay === dayNum;

            return (
              <motion.button
                key={dayNum}
                onClick={() => isUnlocked && setSelectedDay(dayNum)}
                className={cn(
                  "flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all",
                  isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                  isCompleted ? "bg-accent/20" : isUnlocked ? "bg-card border" : "bg-muted/30 opacity-50",
                  isUnlocked && "hover:bg-card cursor-pointer"
                )}
                whileHover={isUnlocked ? { scale: 1.05 } : {}}
                whileTap={isUnlocked ? { scale: 0.95 } : {}}
              >
                <span className="text-lg">{day.emoji}</span>
                <span className="text-xs text-muted-foreground">{dayNum}</span>
                {isCompleted && (
                  <Check className="absolute -top-1 -right-1 w-4 h-4 text-accent" />
                )}
                {!isUnlocked && (
                  <Lock className="absolute w-3 h-3 text-muted-foreground" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Day Content */}
        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl bg-card border shadow-soft">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">{dayInfo.emoji}</span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Day {selectedDay}</p>
                      <h2 className="font-display text-xl font-bold text-foreground">{dayInfo.theme}</h2>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{dayInfo.description}</p>
                  
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <p className="text-sm font-medium text-foreground">Today's Action:</p>
                    <p className="text-foreground mt-1">{dayInfo.action}</p>
                  </div>
                </div>

                {/* Day-specific Tools */}
                {isDayUnlocked && !isDayCompleted && (
                  <div className="space-y-4">
                    {/* AI Chat for days 1, 2, 6 */}
                    {[1, 2, 6].includes(selectedDay) && dayInfo.controllable !== "review" && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-4"
                        onClick={() => setIsChatOpen(true)}
                      >
                        <MessageCircle className="w-5 h-5 text-accent" />
                        <div className="text-left">
                          <div className="font-medium">Talk to {dayInfo.emoji}</div>
                          <div className="text-xs text-muted-foreground">{dayInfo.action}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                      </Button>
                    )}

                    {/* Wellness Logger for day 4 */}
                    {selectedDay === 4 && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-4"
                        onClick={() => setIsWellnessOpen(true)}
                      >
                        <span className="text-xl">🛰️</span>
                        <div className="text-left">
                          <div className="font-medium">Open Battery Check</div>
                          <div className="text-xs text-muted-foreground">Log Sleep, Movement, Nutrition</div>
                        </div>
                        <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                      </Button>
                    )}

                    {/* Reflection for completion */}
                    <div className="p-4 rounded-xl bg-card border">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Reflection (optional)
                      </label>
                      <Textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="What did you learn today?"
                        className="min-h-[80px] resize-none mb-3"
                      />
                      <Button onClick={handleCompleteDay} className="w-full">
                        Complete Day {selectedDay}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Day 7 Special Actions */}
                {selectedDay === 7 && isDayUnlocked && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={exportJournal}
                    >
                      <Download className="w-4 h-4" />
                      Export Weekly Journal
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={shareChallenge}
                    >
                      <Share2 className="w-4 h-4" />
                      Share Your Journey
                    </Button>
                  </div>
                )}

                {/* Completed State */}
                {isDayCompleted && (
                  <motion.div
                    className="p-6 rounded-2xl bg-accent/10 border border-accent/20 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Check className="w-12 h-12 text-accent mx-auto mb-3" />
                    <h3 className="font-display font-semibold text-foreground mb-1">Day Complete!</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedDay < 7 ? "Come back tomorrow for Day " + (selectedDay + 1) : "You've completed the challenge!"}
                    </p>
                    {dayProgress?.reflection && (
                      <div className="mt-4 p-3 rounded-lg bg-background text-left">
                        <p className="text-xs text-muted-foreground mb-1">Your reflection:</p>
                        <p className="text-sm text-foreground">{dayProgress.reflection}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Sidebar - Progress Summary */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-card border">
                  <h3 className="font-display font-semibold text-foreground mb-3">Your Progress</h3>
                  <div className="space-y-2">
                    {CHALLENGE_DAYS.map((day, i) => {
                      const dayNum = i + 1;
                      const isComp = progress.some(p => p.day_number === dayNum && p.completed);
                      return (
                        <div key={dayNum} className="flex items-center gap-2 text-sm">
                          <span>{day.emoji}</span>
                          <span className={isComp ? "text-foreground" : "text-muted-foreground"}>
                            Day {dayNum}
                          </span>
                          {isComp && <Check className="w-3 h-3 text-accent ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!activeChallenge.is_solo && (
                  <div className="p-4 rounded-xl bg-card border">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-display font-semibold text-foreground">Team Challenge</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share code <span className="font-mono">{activeChallenge.invite_code}</span> with friends!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Chat Modal */}
      <AIChat
        controllable={dayInfo.controllable}
        emoji={dayInfo.emoji}
        title={CHALLENGE_DAYS[selectedDay ? selectedDay - 1 : 0].theme}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        challengeContext={{
          day: selectedDay || currentDay,
          theme: dayInfo.theme,
          action: dayInfo.action,
        }}
      />

      {/* Wellness Logger Modal */}
      <WellnessLogger
        isOpen={isWellnessOpen}
        onClose={() => setIsWellnessOpen(false)}
        onLog={logWellness}
        initialValues={todayLog ? {
          sleep: todayLog.sleep_rating,
          movement: todayLog.movement_rating,
          nutrition: todayLog.nutrition_rating,
          notes: todayLog.notes,
        } : undefined}
      />
    </div>
  );
}
