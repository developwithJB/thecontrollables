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

const Reset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get("mode") === "review";
  
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
  const { activeQuest } = useDashboardSummary();

  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showDay7Complete, setShowDay7Complete] = useState(false);
  const [acknowledgedMissedDays, setAcknowledgedMissedDays] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !userId) {
      navigate("/auth");
    }
  }, [userId, isLoading, navigate]);

  // If user is logged in but has no active reset session, send them back to the dashboard
  // (they can start a reset whenever they want from there).
  useEffect(() => {
    if (!isLoading && userId && !activeSession) {
      navigate("/dashboard");
    }
  }, [isLoading, userId, activeSession, navigate]);

  // Handle day completion
  const handleComplete = (data: { userInput?: string }) => {
    const isDay7 = currentDay >= 7;
    completeDay(data, {
      onSuccess: () => {
        if (isDay7) {
          setShowDay7Complete(true);
        } else {
          setShowDayComplete(true);
        }
      },
    });
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  // Show Day 7 complete with certificate
  if (showDay7Complete && activeSession) {
    return (
      <Day7Complete
        displayName={displayName}
        startDate={activeSession.start_date}
        endDate={endDate}
        resetSessionId={activeSession.id}
        completedJourneyId={activeSession.journey_id || undefined}
      />
    );
  }

  // Show day completion (non-Day 7)
  if (showDayComplete) {
    return <ResetComplete isFullReset={false} />;
  }

  if (!activeSession) {
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
      />
    );
  }

  // Today already done - check if in review mode
  if (isTodayCompleted) {
    // If in review mode, show the reading content
    if (isReviewMode) {
      return (
        <ReadingReview
          dayNumber={currentDay}
          completedDays={completedDays.length}
          logDate={currentLogDate}
          activeQuest={activeQuest}
        />
      );
    }
    // Otherwise show the completion screen
    return <ResetComplete isFullReset={false} />;
  }

  // User missed days and hasn't acknowledged yet
  if (missedDays && !acknowledgedMissedDays) {
    return <WelcomeBack onContinue={() => setAcknowledgedMissedDays(true)} />;
  }

  // Get snapshot/journey info for display
  const journey = activeSession?.journey_id ? getJourneyById(activeSession.journey_id) : null;

  // Handler to navigate to dashboard and open snapshot selector
  const handleChangeFocus = () => {
    navigate("/dashboard?openFocus=1");
  };

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
