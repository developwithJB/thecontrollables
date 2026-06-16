import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronRight, Award, Eye, Repeat, Share2, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSnapshotById, BUCKETS } from "@/lib/snapshots";
import { useSnapshotInsight } from "@/hooks/useSnapshotInsight";
import { toast } from "sonner";
import { buildResetProofSharePayload } from "@/lib/shareProof";

interface SnapshotReviewCardProps {
  userId: string;
  isPaid: boolean;
  onStartNewSnapshot?: () => void;
  onUpgrade?: () => void;
}

// Controllable icons and personalities for the "guide voice"
const CONTROLLABLE_GUIDES = [
  { emoji: "🦉", name: "Awareness", controllable: "awareness" },
  { emoji: "🐢", name: "Perspective", controllable: "perspective" },
  { emoji: "🦈", name: "Habit", controllable: "habit" },
  { emoji: "🛰️", name: "Wellness", controllable: "wellness" },
  { emoji: "🚀", name: "Environment", controllable: "environment" },
];

export function SnapshotReviewCard({ userId, isPaid, onStartNewSnapshot, onUpgrade }: SnapshotReviewCardProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch most recent ended session (completed OR expired/paused)
  const { data: lastSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["last-ended-session", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["completed", "expired", "paused"])
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Get journey/snapshot info
  const snapshot = lastSession?.journey_id ? getSnapshotById(lastSession.journey_id) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;
  
  // Check if session was completed (vs expired/paused)
  const isCompleted = lastSession?.status === "completed";

  // Choose guide based on journey focus or session ID
  const guide = useMemo(() => {
    if (snapshot?.focus) {
      const focusGuide = CONTROLLABLE_GUIDES.find(g => g.controllable === snapshot.focus);
      if (focusGuide) return focusGuide;
    }
    // Fallback: cycle based on session ID
    const guideIndex = lastSession?.id 
      ? lastSession.id.charCodeAt(0) % CONTROLLABLE_GUIDES.length 
      : 0;
    return CONTROLLABLE_GUIDES[guideIndex];
  }, [lastSession?.id, snapshot?.focus]);

  // Fetch XP earned during this session's date range
  const { data: sessionXp = 0 } = useQuery({
    queryKey: ["session-xp", lastSession?.id],
    queryFn: async () => {
      if (!lastSession) return 0;
      const endDate = lastSession.completed_at || lastSession.start_date;
      const endDatePlusDays = new Date(lastSession.start_date + "T00:00:00");
      endDatePlusDays.setDate(endDatePlusDays.getDate() + 7);
      
      const { data, error } = await supabase
        .from("xp_logs")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", lastSession.start_date)
        .lte("created_at", lastSession.completed_at || endDatePlusDays.toISOString());
      
      if (error) throw error;
      return data?.reduce((sum, log) => sum + log.amount, 0) || 0;
    },
    enabled: !!lastSession,
  });

  // Fetch promises during session
  const { data: promiseStats } = useQuery({
    queryKey: ["session-promises", lastSession?.id],
    queryFn: async () => {
      if (!lastSession) return { made: 0, kept: 0 };
      const endDatePlusDays = new Date(lastSession.start_date + "T00:00:00");
      endDatePlusDays.setDate(endDatePlusDays.getDate() + 7);
      
      const { data, error } = await supabase
        .from("integrity_logs")
        .select("kept")
        .eq("user_id", userId)
        .gte("promised_at", lastSession.start_date)
        .lte("promised_at", lastSession.completed_at || endDatePlusDays.toISOString());
      
      if (error) throw error;
      const made = data?.length || 0;
      const kept = data?.filter(p => p.kept === true).length || 0;
      return { made, kept };
    },
    enabled: !!lastSession,
  });

  // Fetch days completed with reflections and commitments
  const { data: completedDays = [] } = useQuery({
    queryKey: ["session-completed-days", lastSession?.id],
    queryFn: async () => {
      if (!lastSession) return [];
      const { data, error } = await supabase
        .from("daily_resets")
        .select("day_number, reflection, commitment, completed_at")
        .eq("session_id", lastSession.id)
        .order("day_number", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!lastSession,
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
    lastSession?.id,
    isPaid,
    snapshot ? { id: snapshot.id, name: snapshot.name, focus: snapshot.focus } : undefined
  );

  // Calculate days since session ended
  const daysSinceEnded = useMemo(() => {
    if (!lastSession) return Infinity;
    // Use completed_at if available, otherwise calculate from start_date + 7 days
    const endDate = lastSession.completed_at 
      ? new Date(lastSession.completed_at)
      : (() => {
          const start = new Date(lastSession.start_date + "T00:00:00");
          start.setDate(start.getDate() + 7);
          return start;
        })();
    const today = new Date();
    const diffTime = today.getTime() - endDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [lastSession]);

  // Don't show if no ended session
  if (!lastSession) {
    return null;
  }

  // Calculate end date (7 days from start)
  const getEndDate = () => {
    if (!lastSession.start_date) return "";
    const start = new Date(lastSession.start_date + "T00:00:00");
    start.setDate(start.getDate() + 6);
    return start.toISOString().split("T")[0];
  };

  const formatDateRange = () => {
    if (!lastSession.start_date) return "";
    const start = new Date(lastSession.start_date + "T00:00:00");
    const end = new Date(getEndDate() + "T00:00:00");
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  // Share public proof without private reset details.
  const handleShareSnapshot = async () => {
    const payload = buildResetProofSharePayload({
      completedDays: isCompleted ? 7 : completedDays.length,
      xp: sessionXp,
    });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.headline,
          text: payload.shareText,
        });
        toast.success("Shared!");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(payload.shareText);
          toast.success("Copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(payload.shareText);
      toast.success("Copied to clipboard!");
    }
  };

  // Build narrative slides for chapter quest review
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
            {isCompleted ? "🏆" : "📋"}
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {isCompleted
              ? "You Completed a 7-Day Chapter Quest"
              : `Your ${completedDays.length}/7 Day Chapter Quest`}
          </h3>
          <p className="text-muted-foreground text-sm">
            {formatDateRange()}
          </p>
          {!isCompleted && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              An honest record. Sometimes we don't show up—and that's still data.
            </p>
          )}
          {snapshot && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
              <p className="text-primary flex items-center justify-center gap-2 font-medium">
                <span className="text-xl">{snapshot.emoji}</span>
                <span>{snapshot.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Region focus: {snapshot.focus.charAt(0).toUpperCase() + snapshot.focus.slice(1)}
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
            <span className="text-xl mr-1">{guide.emoji}</span> Here's what you built through this chapter...
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{completedDays.length}/7</p>
              <p className="text-xs text-muted-foreground">Days Checked In</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{sessionXp}</p>
              <p className="text-xs text-muted-foreground">Charge XP</p>
            </div>
            {promiseStats && promiseStats.made > 0 && (
              <div className="col-span-2 bg-emerald-500/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {promiseStats.kept}/{promiseStats.made} Promises Kept
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((promiseStats.kept / promiseStats.made) * 100)}% integrity through this chapter
                </p>
              </div>
            )}
          </div>
          {snapshot && (
            <p className="text-xs text-muted-foreground text-center mt-4 italic">
              Your {snapshot.focus} focus helped guide this chapter.
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
              <p className="text-xs text-muted-foreground mb-1">Your reflection from this chapter:</p>
              <p className="text-sm text-foreground italic">"{userReflections[0]}"</p>
            </div>
          )}
          
          {userCommitments.length > 0 && !userReflections.length && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">What you committed to:</p>
              <p className="text-sm text-foreground italic">"{userCommitments[0]}"</p>
            </div>
          )}
          
          {/* AI insight from The Controllables - now available for ALL users (one-time) */}
          {snapshotInsight?.insight && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground italic">
                "{snapshotInsight.insight}"
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <span>{guide.emoji}</span>
                <span>— {guide.name}</span>
              </p>
              {!isPaid && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                  Your complimentary insight from The Controllables
                </p>
              )}
            </div>
          )}
          {insightLoading && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Generating your insight...</span>
              </div>
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
    navigate(`/reset?sessionId=${lastSession.id}&celebration=true`);
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
              <span className="font-semibold text-foreground">Chapter Quest Review</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareSnapshot}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
                title="Share your Chapter Quest"
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
          <p className="text-xs text-muted-foreground mb-2">A clear record of how you moved through this chapter.</p>
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
                ) : isCompleted ? (
                  isPaid ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewCelebration}
                      className="text-primary"
                    >
                      <Award className="w-4 h-4 mr-1" />
                      Certificate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onUpgrade}
                      className="text-amber-600 dark:text-amber-400"
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      Upgrade for Certificate
                    </Button>
                  )
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewCelebration}
                    className="text-muted-foreground"
                  >
                    View Details
                  </Button>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 pt-2 border-t border-border/50 space-y-2">
                {isCompleted ? (
                  isPaid ? (
                    <Button
                      onClick={handleViewCelebration}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        View Certificate
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={onUpgrade}
                      variant="outline"
                      className="w-full justify-between border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Upgrade to Download Certificate
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={handleViewCelebration}
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Chapter Details
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                
                {onStartNewSnapshot && (
                  <Button
                    onClick={onStartNewSnapshot}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Enter Next Region
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
