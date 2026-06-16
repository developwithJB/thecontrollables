import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Award, Share2, X, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSnapshotById, BUCKETS } from "@/lib/snapshots";
import { useSnapshotInsight } from "@/hooks/useSnapshotInsight";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { buildResetProofSharePayload } from "@/lib/shareProof";

interface SnapshotReviewModalProps {
  sessionId: string;
  userId: string;
  isPaid: boolean;
  onClose: () => void;
}

const CONTROLLABLE_GUIDES = [
  { emoji: "🦉", name: "Awareness", controllable: "awareness" },
  { emoji: "🐢", name: "Perspective", controllable: "perspective" },
  { emoji: "🦈", name: "Habit", controllable: "habit" },
  { emoji: "🛰️", name: "Wellness", controllable: "wellness" },
  { emoji: "🚀", name: "Environment", controllable: "environment" },
];

export function SnapshotReviewModal({ sessionId, userId, isPaid, onClose }: SnapshotReviewModalProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch session data
  const { data: session } = useQuery({
    queryKey: ["snapshot-review-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const snapshot = session?.journey_id ? getSnapshotById(session.journey_id) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;

  const guide = useMemo(() => {
    if (snapshot?.focus) {
      const focusGuide = CONTROLLABLE_GUIDES.find(g => g.controllable === snapshot.focus);
      if (focusGuide) return focusGuide;
    }
    const guideIndex = sessionId.charCodeAt(0) % CONTROLLABLE_GUIDES.length;
    return CONTROLLABLE_GUIDES[guideIndex];
  }, [sessionId, snapshot?.focus]);

  // Fetch XP
  const { data: sessionXp = 0 } = useQuery({
    queryKey: ["snapshot-review-xp", sessionId],
    queryFn: async () => {
      if (!session) return 0;
      const { data, error } = await supabase
        .from("xp_logs")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", session.start_date)
        .lte("created_at", session.completed_at || new Date().toISOString());
      if (error) throw error;
      return data?.reduce((sum, log) => sum + log.amount, 0) || 0;
    },
    enabled: !!session,
  });

  // Fetch promises
  const { data: promiseStats } = useQuery({
    queryKey: ["snapshot-review-promises", sessionId],
    queryFn: async () => {
      if (!session) return { made: 0, kept: 0 };
      const { data, error } = await supabase
        .from("integrity_logs")
        .select("kept")
        .eq("user_id", userId)
        .gte("promised_at", session.start_date)
        .lte("promised_at", session.completed_at || new Date().toISOString());
      if (error) throw error;
      const made = data?.length || 0;
      const kept = data?.filter(p => p.kept === true).length || 0;
      return { made, kept };
    },
    enabled: !!session,
  });

  // Fetch completed days with reflections
  const { data: completedDays = [] } = useQuery({
    queryKey: ["snapshot-review-days", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_resets")
        .select("day_number, reflection, commitment, completed_at")
        .eq("session_id", sessionId)
        .order("day_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const userReflections = completedDays
    .filter(d => d.reflection && d.reflection.trim().length > 10)
    .map(d => d.reflection as string)
    .slice(0, 2);

  const userCommitments = completedDays
    .filter(d => d.commitment && d.commitment.trim().length > 10)
    .map(d => d.commitment as string)
    .slice(0, 2);

  // AI insight
  const { data: snapshotInsight, isLoading: insightLoading } = useSnapshotInsight(
    userId,
    sessionId,
    isPaid,
    snapshot ? { id: snapshot.id, name: snapshot.name, focus: snapshot.focus } : undefined
  );

  const formatDateRange = () => {
    if (!session?.start_date) return "";
    const start = new Date(session.start_date + "T00:00:00");
    const end = addDays(start, 6);
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  };

  const generateProofNarrative = () => {
    const narratives: string[] = [];
    if (completedDays.length === 7) {
      narratives.push("You showed up every single day.");
    } else if (completedDays.length >= 5) {
      narratives.push(`You showed up ${completedDays.length} of 7 days—that's consistency.`);
    } else if (completedDays.length >= 3) {
      narratives.push(`${completedDays.length} days this week. That's data, not failure.`);
    } else if (completedDays.length >= 1) {
      narratives.push(`${completedDays.length} day${completedDays.length > 1 ? 's' : ''} recorded. Now you know.`);
    } else {
      narratives.push("This week didn't go as planned. That's information.");
    }
    if (promiseStats && promiseStats.made > 0) {
      const rate = Math.round((promiseStats.kept / promiseStats.made) * 100);
      if (rate >= 80) {
        narratives.push(`You kept ${rate}% of your promises to yourself.`);
      } else if (rate >= 50) {
        narratives.push(`You kept more than half your promises—that's progress.`);
      } else if (rate > 0) {
        narratives.push(`${promiseStats.kept} of ${promiseStats.made} promises kept. Worth noticing.`);
      }
    }
    return narratives.slice(0, 2).join(" ");
  };

  const handleShare = async () => {
    const payload = buildResetProofSharePayload({
      completedDays: completedDays.length,
      xp: sessionXp,
    });

    if (navigator.share) {
      try {
        await navigator.share({ title: payload.headline, text: payload.shareText });
        toast.success("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(payload.shareText);
          toast.success("Copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(payload.shareText);
      toast.success("Copied to clipboard!");
    }
  };

  const slides = [
    // Intro slide - sets the tone
    {
      id: "intro",
      content: (
        <div className="text-center py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl mb-4"
          >
            📸
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-3">
            This Is Your Snapshot
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            This is a private record of how you showed up.<br />
            No comparison. No judgment. Just proof.
          </p>
        </div>
      ),
    },
    {
      id: "celebration",
      content: (
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-6xl mb-4"
          >
            {completedDays.length === 7 ? "🏆" : completedDays.length === 0 ? "📋" : "📊"}
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {completedDays.length === 7 
              ? "Snapshot Complete" 
              : completedDays.length === 0 
              ? "0/7 Days"
              : `${completedDays.length}/7 Days`}
          </h3>
          <p className="text-muted-foreground text-sm">{formatDateRange()}</p>
          {completedDays.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
              You didn't check in this week. That's honest data about where you are.
            </p>
          )}
          {completedDays.length > 0 && completedDays.length < 7 && (
            <p className="text-xs text-muted-foreground mt-2">
              This is still a record. Still counts.
            </p>
          )}
          {snapshot && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-primary flex items-center justify-center gap-2 font-medium">
                <span className="text-xl">{snapshot.emoji}</span>
                <span>{snapshot.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                Focus: {snapshot.focus}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "stats",
      content: (
        <div className="py-6">
          <p className="text-sm text-muted-foreground text-center mb-4">
            <span className="text-xl mr-1">{guide.emoji}</span> 
            {completedDays.length === 0 ? "The numbers tell a story..." : "Here's what you built..."}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 text-center ${
              completedDays.length === 0 ? "bg-muted/50" : "bg-primary/10"
            }`}>
              <p className={`text-3xl font-bold ${
                completedDays.length === 0 ? "text-muted-foreground" : "text-primary"
              }`}>{completedDays.length}/7</p>
              <p className="text-xs text-muted-foreground">Days Checked In</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${
              sessionXp === 0 ? "bg-muted/50" : "bg-primary/10"
            }`}>
              <p className={`text-3xl font-bold ${
                sessionXp === 0 ? "text-muted-foreground" : "text-primary"
              }`}>{sessionXp}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
            {promiseStats && promiseStats.made > 0 && (
              <div className="col-span-2 bg-emerald-500/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {promiseStats.kept}/{promiseStats.made} Promises Kept
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((promiseStats.kept / promiseStats.made) * 100)}% integrity
                </p>
              </div>
            )}
            {completedDays.length === 0 && (!promiseStats || promiseStats.made === 0) && (
              <div className="col-span-2 bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No activity recorded this week.
                </p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "proof",
      content: (
        <div className="py-6 text-center">
          <p className="text-4xl mb-4">{completedDays.length === 0 ? "🪞" : "📜"}</p>
          <h3 className="text-lg font-semibold text-foreground mb-3">
            {completedDays.length === 0 ? "This Is Still Data" : "This Is Your Proof"}
          </h3>
          <p className="text-foreground text-sm leading-relaxed mb-4 font-medium">
            {generateProofNarrative()}
          </p>
          {completedDays.length === 0 && (
            <div className="bg-muted/30 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seeing this matters. Now you know what a week of not showing up looks like. 
                That awareness is the first step back.
              </p>
            </div>
          )}
          {userReflections.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Your reflection:</p>
              <p className="text-sm text-foreground italic">"{userReflections[0]}"</p>
            </div>
          )}
          {userCommitments.length > 0 && !userReflections.length && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">What you committed to:</p>
              <p className="text-sm text-foreground italic">"{userCommitments[0]}"</p>
            </div>
          )}
          {isPaid && snapshotInsight?.insight && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground italic">"{snapshotInsight.insight}"</p>
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
                <span className="text-sm text-muted-foreground">Generating insight...</span>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  const nextSlide = () => currentSlide < slides.length - 1 && setCurrentSlide(currentSlide + 1);
  const prevSlide = () => currentSlide > 0 && setCurrentSlide(currentSlide - 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div
        className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-semibold">Your Snapshot</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 hover:bg-muted rounded-lg">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slides[currentSlide].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-2 py-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? "bg-primary w-4" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {currentSlide < slides.length - 1 ? (
            <Button variant="ghost" size="sm" onClick={nextSlide} className="text-primary">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : completedDays.length === 7 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/reset?sessionId=${sessionId}&celebration=true`)}
              className="text-primary"
            >
              <Award className="w-4 h-4 mr-1" />
              Certificate
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-primary">
              Done
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
