import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, ChevronRight, Award, Target, Eye, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getJourneyById } from "@/lib/guidedJourneys";
import { useInsights } from "@/hooks/useInsights";

interface SnapshotWrappedCardProps {
  userId: string;
  isPaid: boolean;
  onStartNewSnapshot?: () => void;
}

interface CompletedSnapshotData {
  sessionId: string;
  journeyId: string | null;
  startDate: string;
  endDate: string;
  completedAt: string;
  daysCompleted: number;
  xpEarned: number;
  promisesKept: number;
  promisesMade: number;
}

// Controllable icons and personalities for the "guide voice"
const CONTROLLABLE_GUIDES = [
  { emoji: "🦉", name: "Awareness Owl", voice: "observational" },
  { emoji: "🐢", name: "Perspective Turtle", voice: "patient" },
  { emoji: "🦈", name: "Habit Shark", voice: "direct" },
  { emoji: "🛰️", name: "Wellness Satellite", voice: "nurturing" },
  { emoji: "🚀", name: "Environment Rocket", voice: "energetic" },
];

export function SnapshotWrappedCard({ userId, isPaid, onStartNewSnapshot }: SnapshotWrappedCardProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch most recent completed session
  const { data: completedSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["recent-completed-session", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch XP earned during this session's date range
  const { data: sessionXp = 0 } = useQuery({
    queryKey: ["session-xp", completedSession?.id],
    queryFn: async () => {
      if (!completedSession) return 0;
      const { data, error } = await supabase
        .from("xp_logs")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", completedSession.start_date)
        .lte("created_at", completedSession.completed_at || new Date().toISOString());
      
      if (error) throw error;
      return data?.reduce((sum, log) => sum + log.amount, 0) || 0;
    },
    enabled: !!completedSession,
  });

  // Fetch promises during session
  const { data: promiseStats } = useQuery({
    queryKey: ["session-promises", completedSession?.id],
    queryFn: async () => {
      if (!completedSession) return { made: 0, kept: 0 };
      const { data, error } = await supabase
        .from("integrity_logs")
        .select("kept")
        .eq("user_id", userId)
        .gte("promised_at", completedSession.start_date)
        .lte("promised_at", completedSession.completed_at || new Date().toISOString());
      
      if (error) throw error;
      const made = data?.length || 0;
      const kept = data?.filter(p => p.kept === true).length || 0;
      return { made, kept };
    },
    enabled: !!completedSession,
  });

  // Fetch days completed
  const { data: completedDays = [] } = useQuery({
    queryKey: ["session-completed-days", completedSession?.id],
    queryFn: async () => {
      if (!completedSession) return [];
      const { data, error } = await supabase
        .from("daily_resets")
        .select("day_number, reflection, completed_at")
        .eq("session_id", completedSession.id)
        .order("day_number", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!completedSession,
  });

  // Get AI insights for premium users
  const { data: insightData } = useInsights(userId, isPaid);

  // Journey info
  const journey = completedSession?.journey_id ? getJourneyById(completedSession.journey_id) : null;

  // Calculate days since completion
  const daysSinceCompletion = useMemo(() => {
    if (!completedSession?.completed_at) return Infinity;
    const completedDate = new Date(completedSession.completed_at);
    const today = new Date();
    const diffTime = today.getTime() - completedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [completedSession?.completed_at]);

  // Choose a guide - cycle through them based on session ID
  const guideIndex = completedSession?.id 
    ? completedSession.id.charCodeAt(0) % CONTROLLABLE_GUIDES.length 
    : 0;
  const guide = CONTROLLABLE_GUIDES[guideIndex];

  // Don't show if no completed session or if it's been more than 7 days
  if (!completedSession || daysSinceCompletion > 7) {
    return null;
  }

  // Calculate end date (7 days from start)
  const getEndDate = () => {
    if (!completedSession.start_date) return "";
    const start = new Date(completedSession.start_date + "T00:00:00");
    start.setDate(start.getDate() + 6);
    return start.toISOString().split("T")[0];
  };

  const formatDateRange = () => {
    if (!completedSession.start_date) return "";
    const start = new Date(completedSession.start_date + "T00:00:00");
    const end = new Date(getEndDate() + "T00:00:00");
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  // Build narrative slides (Spotify Wrapped style)
  const slides = [
    // Slide 1: Celebration moment
    {
      id: "celebration",
      content: (
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            You Completed a 7-Day Snapshot
          </h3>
          <p className="text-muted-foreground text-sm">
            {formatDateRange()}
          </p>
          {journey && (
            <p className="text-primary mt-2 flex items-center justify-center gap-1">
              <span>{journey.emoji}</span>
              <span>{journey.title}</span>
            </p>
          )}
        </div>
      ),
    },
    // Slide 2: The numbers
    {
      id: "stats",
      content: (
        <div className="py-4">
          <p className="text-sm text-muted-foreground text-center mb-4">
            <span className="text-xl mr-1">{guide.emoji}</span> Let's look at what you built...
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{completedDays.length}/7</p>
              <p className="text-xs text-muted-foreground">Days Checked In</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{sessionXp}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
            {promiseStats && promiseStats.made > 0 && (
              <div className="col-span-2 bg-emerald-500/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {promiseStats.kept}/{promiseStats.made} Promises Kept
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((promiseStats.kept / promiseStats.made) * 100)}% integrity this week
                </p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    // Slide 3: The proof/meaning
    {
      id: "proof",
      content: (
        <div className="py-4 text-center">
          <p className="text-4xl mb-4">📜</p>
          <h3 className="text-lg font-semibold text-foreground mb-3">
            This Is Your Proof
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            You set an intention. You showed up. You kept your word to yourself.
            <br /><br />
            <em>That's not nothing. That's evidence of who you're becoming.</em>
          </p>
          {insightData?.insight && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-foreground italic">
                "{insightData.insight}"
              </p>
              <p className="text-xs text-muted-foreground mt-2">— The Controllables</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleViewCelebration = () => {
    navigate(`/reset?sessionId=${completedSession.id}&celebration=true`);
  };

  if (sessionLoading) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Your Week Wrapped</span>
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? "Minimize" : "View"}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Slide content */}
              <div className="px-4 min-h-[260px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slides[currentSlide].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {slides[currentSlide].content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation dots */}
              <div className="flex items-center justify-center gap-2 py-3">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentSlide 
                        ? "bg-primary w-4" 
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation arrows */}
              <div className="flex justify-between px-4 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="text-muted-foreground"
                >
                  ← Back
                </Button>
                {currentSlide < slides.length - 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextSlide}
                    className="text-primary"
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewCelebration}
                    className="text-primary"
                  >
                    <Award className="w-4 h-4 mr-1" />
                    Certificate
                  </Button>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 pt-2 border-t border-border/50 space-y-2">
                <Button
                  onClick={handleViewCelebration}
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Full Achievement
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                {onStartNewSnapshot && (
                  <Button
                    onClick={onStartNewSnapshot}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Start Next Snapshot
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
