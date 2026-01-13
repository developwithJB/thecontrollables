import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useReset } from "@/hooks/useReset";
import { CovenantScreen } from "@/components/CovenantScreen";
import { ResetDay } from "@/components/ResetDay";
import { WelcomeBack } from "@/components/WelcomeBack";
import { Day7Complete } from "@/components/Day7Complete";
import { ResetComplete } from "@/components/ResetComplete";

const Reset = () => {
  const navigate = useNavigate();
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
    generateCertificate,
    isGeneratingCertificate,
  } = useReset();

  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showDay7Complete, setShowDay7Complete] = useState(false);
  const [acknowledgedMissedDays, setAcknowledgedMissedDays] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !userId) {
      navigate("/auth");
    }
  }, [userId, isLoading, navigate]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show Day 7 complete with certificate
  if (showDay7Complete && activeSession) {
    return (
      <Day7Complete
        displayName={displayName}
        startDate={activeSession.start_date}
        endDate={endDate}
        onGenerateCertificate={generateCertificate}
        isGenerating={isGeneratingCertificate}
      />
    );
  }

  // Show day completion (non-Day 7)
  if (showDayComplete) {
    return <ResetComplete isFullReset={false} />;
  }

  // No active session - show covenant screen
  if (!activeSession) {
    return (
      <CovenantScreen
        onAccept={() => acceptCovenant()}
        isAccepting={isAcceptingCovenant}
      />
    );
  }

  // Session exists but covenant not accepted (edge case)
  if (!covenantAccepted) {
    return (
      <CovenantScreen
        onAccept={() => acceptCovenant()}
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
        onGenerateCertificate={generateCertificate}
        isGenerating={isGeneratingCertificate}
      />
    );
  }

  // Today already done
  if (isTodayCompleted) {
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
    />
  );
};

export default Reset;
