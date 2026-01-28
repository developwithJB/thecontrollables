import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronRight, Award, Eye, Repeat, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSnapshotById, BUCKETS } from "@/lib/snapshots";
import { useSnapshotInsight } from "@/hooks/useSnapshotInsight";
import { toast } from "sonner";

interface SnapshotWrappedCardProps {
  userId: string;
  isPaid: boolean;
  onStartNewSnapshot?: () => void;
}

// Controllable icons and personalities for the "guide voice"
const CONTROLLABLE_GUIDES = [
  { emoji: "🦉", name: "Awareness Owl", controllable: "awareness" },
  { emoji: "🐢", name: "Perspective Turtle", controllable: "perspective" },
  { emoji: "🦈", name: "Habit Shark", controllable: "habit" },
  { emoji: "🛰️", name: "Wellness Satellite", controllable: "wellness" },
  { emoji: "🚀", name: "Environment Rocket", controllable: "environment" },
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

  // Get journey/snapshot info
  const snapshot = completedSession?.journey_id ? getSnapshotById(completedSession.journey_id) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;

  // Choose guide based on journey focus or session ID
  const guide = useMemo(() => {
    if (snapshot?.focus) {
      const focusGuide = CONTROLLABLE_GUIDES.find(g => g.controllable === snapshot.focus);
      if (focusGuide) return focusGuide;
    }
    // Fallback: cycle based on session ID
    const guideIndex = completedSession?.id 
      ? completedSession.id.charCodeAt(0) % CONTROLLABLE_GUIDES.length 
      : 0;
    return CONTROLLABLE_GUIDES[guideIndex];
  }, [completedSession?.id, snapshot?.focus]);

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

  // Fetch days completed with reflections and commitments
  const { data: completedDays = [] } = useQuery({
    queryKey: ["session-completed-days", completedSession?.id],
    queryFn: async () => {
      if (!completedSession) return [];
      const { data, error } = await supabase
        .from("daily_resets")
        .select("day_number, reflection, commitment, completed_at")
        .eq("session_id", completedSession.id)
        .order("day_number", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!completedSession,
  });

  // Extract reflections and commitments for personalized narrative
  const userReflections = completedDays
    .filter(d => d.reflection && d.reflection.trim().length > 10)
    .map(d => d.reflection as string)
    .slice(0, 2);
  
  const userCommitments = completedDays
    .filter(d => d.commitment && d.commitment.trim().length > 10)
    .map(d => d.commitment as string)
    .slice(0, 2);

  // Generate personalized proof narrative based on actual data
  const generateProofNarrative = () => {
    const narratives: string[] = [];
    
    // Opening based on completion
    if (completedDays.length === 7) {
      narratives.push("You showed up every single day.");
    } else if (completedDays.length >= 5) {
      narratives.push(`You showed up ${completedDays.length} of 7 days—that's consistency.`);
    } else {
      narratives.push("You started. You tried. That matters.");
    }
    
    // Promise keeping
    if (promiseStats && promiseStats.made > 0) {
      const rate = Math.round((promiseStats.kept / promiseStats.made) * 100);
      if (rate >= 80) {
        narratives.push(`You kept ${rate}% of your promises to yourself.`);
      } else if (rate >= 50) {
        narratives.push(`You kept more than half your promises—that's progress.`);
      }
    }
    
    // XP earned through actions
    if (sessionXp > 0 && completedDays.length > 0) {
      const avgXp = Math.round(sessionXp / completedDays.length);
      if (avgXp > 30) {
        narratives.push("Your daily actions added up to real momentum.");
      }
    }
    
    return narratives.slice(0, 2).join(" ");
  };

  // Get snapshot-specific AI insight (only looks at this snapshot's data)
  const { data: snapshotInsight, isLoading: insightLoading } = useSnapshotInsight(
    userId,
    completedSession?.id,
    isPaid,
    snapshot ? { id: snapshot.id, name: snapshot.name, focus: snapshot.focus } : undefined
  );

  // Calculate days since completion
  const daysSinceCompletion = useMemo(() => {
    if (!completedSession?.completed_at) return Infinity;
    const completedDate = new Date(completedSession.completed_at);
    const today = new Date();
    const diffTime = today.getTime() - completedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [completedSession?.completed_at]);

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

  // Share Wrapped summary
  const handleShareWrapped = async () => {
    const journeyText = snapshot ? `Journey: ${snapshot.name}` : "";
    const promiseText = promiseStats && promiseStats.made > 0 
      ? `🛡️ ${Math.round((promiseStats.kept / promiseStats.made) * 100)}% promises kept\n`
      : "";
    
    const shareText = 
      `🏆 7-Day Snapshot Complete\n` +
      `${formatDateRange()}\n\n` +
      (journeyText ? `${snapshot?.emoji || "📅"} ${journeyText}\n\n` : "") +
      `✅ ${completedDays.length}/7 days checked in\n` +
      `⚡ ${sessionXp} XP earned\n` +
      promiseText +
      `\nBuilding proof, one week at a time.\n` +
      `thedashboard.agbcoaching.com\n\n` +
      `#TheDashboard #TheControllables`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My 7-Day Snapshot Complete",
          text: shareText,
        });
        toast.success("Shared! Thanks for spreading the word 🙏");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareText);
          toast.success("Copied to clipboard — ready to share!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard — ready to share!");
    }
  };

  // Build narrative slides (Spotify Wrapped style)
  const slides = [
    // Slide 1: Celebration moment with journey context
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
          {snapshot && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
              <p className="text-primary flex items-center justify-center gap-2 font-medium">
                <span className="text-xl">{snapshot.emoji}</span>
                <span>{snapshot.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Focus: {snapshot.focus.charAt(0).toUpperCase() + snapshot.focus.slice(1)}
              </p>
            </div>
          )}
          {bucket && !snapshot && (
            <p className="text-primary mt-2 flex items-center justify-center gap-1">
              <span>{bucket.emoji}</span>
              <span>{bucket.name}</span>
            </p>
          )}
        </div>
      ),
    },
    // Slide 2: The numbers with journey-specific framing
    {
      id: "stats",
      content: (
        <div className="py-4">
          <p className="text-sm text-muted-foreground text-center mb-4">
            <span className="text-xl mr-1">{guide.emoji}</span> Here's what you built this week...
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
          {snapshot && (
            <p className="text-xs text-muted-foreground text-center mt-4 italic">
              Your {snapshot.focus} focus helped guide your week.
            </p>
          )}
        </div>
      ),
    },
    // Slide 3: The proof/meaning with personalized narrative + AI insight
    {
      id: "proof",
      content: (
        <div className="py-4 text-center">
          <p className="text-4xl mb-4">📜</p>
          <h3 className="text-lg font-semibold text-foreground mb-3">
            This Is Your Proof
          </h3>
          
          {/* Personalized narrative from actual data */}
          <p className="text-foreground text-sm leading-relaxed mb-4 font-medium">
            {generateProofNarrative()}
          </p>
          
          {/* Show user's own words if available */}
          {userReflections.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Your reflection this week:</p>
              <p className="text-sm text-foreground italic">"{userReflections[0]}"</p>
            </div>
          )}
          
          {userCommitments.length > 0 && !userReflections.length && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">What you committed to:</p>
              <p className="text-sm text-foreground italic">"{userCommitments[0]}"</p>
            </div>
          )}
          
          {/* AI insight from The Controllables */}
          {isPaid && snapshotInsight?.insight && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground italic">
                "{snapshotInsight.insight}"
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <span>{guide.emoji}</span>
                <span>— {guide.name}</span>
              </p>
            </div>
          )}
          {isPaid && insightLoading && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Generating your insight...</span>
              </div>
            </div>
          )}
          {!isPaid && (
            <p className="text-xs text-muted-foreground mt-4">
              ✨ Upgrade for personalized AI insights from The Controllables
            </p>
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWrapped}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
                title="Share your Wrapped"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? "Minimize" : "View"}
              </button>
            </div>
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
              <div className="px-4 min-h-[280px]">
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
