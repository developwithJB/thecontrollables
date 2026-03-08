import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { useReset } from "@/hooks/useReset";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { CovenantScreen } from "@/components/CovenantScreen";
import { ResetDay } from "@/components/ResetDay";
import { ReadingReview } from "@/components/ReadingReview";
import { WelcomeBack } from "@/components/WelcomeBack";
import { Day7Complete } from "@/components/Day7Complete";
import { ResetComplete } from "@/components/ResetComplete";
import { getJourneyById } from "@/lib/guidedJourneys";
import { supabase } from "@/integrations/supabase/client";
import { useSeason } from "@/hooks/useSeason";

const Reset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const {
    userId,
    displayName,
    activeSession,
    completedDays,
    currentDay,
    currentLogDate,
    endDate,
    isTodayCompleted,
    missedDays,
    isCompleted,
    isLoading,
    covenantAccepted,
    acceptCovenant,
    isAcceptingCovenant,
    completeDay,
    isCompleting,
  } = useReset();

  const { isPaid } = useEntitlements(userId || null);
  const { activeQuest } = useDashboardSummary(userId || null);
  const { activeSeason, seasonProgress } = useSeason(userId || undefined);

  const [showDayComplete, setShowDayComplete] = useState(false);
  const [acknowledgedMissedDays, setAcknowledgedMissedDays] = useState(false);
  
  // Check if we should show Day 7 celebration (triggered from Dashboard when all tasks done)
  const showDay7Celebration = searchParams.get("day7complete") === "true";
  
  // Check if viewing historical celebration via sessionId
  const historicalSessionId = searchParams.get("sessionId");
  const isHistoricalCelebration = searchParams.get("celebration") === "true" && historicalSessionId;
  
  // State for historical session data
  const [historicalSession, setHistoricalSession] = useState<{
    id: string;
    start_date: string;
    journey_id: string | null;
    completed_at: string | null;
    checkin_count: number;
  } | null>(null);

  // Fetch historical session data if viewing a past celebration
  useEffect(() => {
    if (!isHistoricalCelebration || !historicalSessionId) return;
    
    async function fetchHistoricalSession() {
      const [sessionResult, checkinResult] = await Promise.all([
        supabase
          .from("reset_sessions")
          .select("id, start_date, journey_id, completed_at")
          .eq("id", historicalSessionId)
          .single(),
        supabase
          .from("daily_resets")
          .select("id", { count: "exact", head: true })
          .eq("session_id", historicalSessionId),
      ]);
      
      if (sessionResult.data) {
        setHistoricalSession({
          ...sessionResult.data,
          checkin_count: checkinResult.count ?? 0,
        });
      }
    }
    
    fetchHistoricalSession();
  }, [isHistoricalCelebration, historicalSessionId]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !userId) {
      navigate("/auth");
    }
  }, [userId, isLoading, navigate]);

  // If user is logged in but has no active reset session, send them back to the dashboard
  // IMPORTANT: Don't redirect if we're showing the Day 7 celebration or historical celebration!
  useEffect(() => {
    if (!isLoading && userId && !activeSession && !showDay7Celebration && !isHistoricalCelebration) {
      navigate("/dashboard");
    }
  }, [isLoading, userId, activeSession, navigate, showDay7Celebration, isHistoricalCelebration]);

  // Handle day completion
  const handleComplete = (data: { userInput?: string }) => {
    const isDay7 = currentDay >= 7;
    
    completeDay(data, {
      onSuccess: () => {
        if (isDay7) {
          // Day 7: Navigate to dashboard with signal that Day 7 reading just completed
          // Dashboard will then check if all other tasks are done and show celebration
          navigate("/dashboard?day7reading=done");
        } else {
          setShowDayComplete(true);
        }
      },
    });
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  // Show historical celebration (viewing past completed snapshot)
  // IMPORTANT: Wait for historical session data before falling through to other screens
  if (isHistoricalCelebration) {
    if (!historicalSession) {
      // Still loading historical session data
      return <SplashScreen />;
    }
    
    const historicalEndDate = new Date(historicalSession.start_date);
    historicalEndDate.setDate(historicalEndDate.getDate() + 6);
    
    return (
      <Day7Complete
        displayName={displayName}
        startDate={historicalSession.start_date}
        endDate={historicalEndDate.toISOString().split("T")[0]}
        resetSessionId={historicalSession.id}
        completedJourneyId={historicalSession.journey_id || undefined}
        completedDaysCount={historicalSession.checkin_count}
        isHistoricalView
      />
    );
  }

  // Show Day 7 celebration when triggered from Dashboard (all tasks complete)
  if (showDay7Celebration && activeSession) {
    return (
      <Day7Complete
        displayName={displayName}
        startDate={activeSession.start_date}
        endDate={endDate}
        resetSessionId={activeSession.id}
        completedJourneyId={activeSession.journey_id || undefined}
        completedDaysCount={completedDays.length}
        activeSeason={activeSeason}
        seasonSnapshotsCompleted={seasonProgress?.snapshotsCompleted || 0}
      />
    );
  }

  // Show day completion (non-Day 7)
  if (showDayComplete) {
    return <ResetComplete isFullReset={false} />;
  }

  if (!activeSession && !isHistoricalCelebration) {
    return <SplashScreen />;
  }

  // Session exists but covenant not accepted (edge case)
  if (!covenantAccepted) {
    return (
      <CovenantScreen
        onAccept={() => acceptCovenant({ isPaid })}
        isAccepting={isAcceptingCovenant}
      />
    );
  }

  // Reset already completed - show Day 7 screen
  if (isCompleted) {
    return (
      <Day7Complete
        displayName={displayName}
        startDate={activeSession.start_date}
        endDate={endDate}
        resetSessionId={activeSession.id}
        completedJourneyId={activeSession.journey_id || undefined}
        completedDaysCount={completedDays.length}
        activeSeason={activeSeason}
        seasonSnapshotsCompleted={seasonProgress?.snapshotsCompleted || 0}
      />
    );
  }

  // Get snapshot/journey info for display
  const journey = activeSession?.journey_id ? getJourneyById(activeSession.journey_id) : null;
  
  // Handler to navigate to dashboard and open snapshot selector
  const handleChangeFocus = () => {
    navigate("/dashboard?openFocus=1");
  };

  // Today already done - check if reviewing or show completion
  if (isTodayCompleted) {
    const isReviewMode = searchParams.get("mode") === "review";
    
    if (isReviewMode) {
      // Show reading review instead of completion screen
      return (
        <ReadingReview
          dayNumber={currentDay}
          completedDays={completedDays.length}
          snapshotEmoji={journey?.emoji}
          snapshotTitle={journey?.title}
          onChangeFocus={handleChangeFocus}
          activeQuest={activeQuest}
        />
      );
    }
    
    return <ResetComplete isFullReset={false} />;
  }

  // User missed days and hasn't acknowledged yet
  if (missedDays && !acknowledgedMissedDays) {
    return <WelcomeBack onContinue={() => setAcknowledgedMissedDays(true)} />;
  }

  // Show today's reset
  return (
    <ResetDay
      dayNumber={currentDay}
      completedDays={completedDays.length}
      logDate={currentLogDate}
      onComplete={handleComplete}
      isCompleting={isCompleting}
      snapshotEmoji={journey?.emoji}
      snapshotTitle={journey?.title}
      onChangeFocus={handleChangeFocus}
      activeQuest={activeQuest}
    />
  );
};

export default Reset;
