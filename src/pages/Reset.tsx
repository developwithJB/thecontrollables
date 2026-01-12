import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useReset } from "@/hooks/useReset";
import { ResetDay } from "@/components/ResetDay";
import { ResetComplete } from "@/components/ResetComplete";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Reset = () => {
  const navigate = useNavigate();
  const {
    userId,
    activeSession,
    completedDays,
    currentDay,
    isCompleted,
    isLoading,
    startReset,
    isStarting,
    completeDay,
    isCompleting,
  } = useReset();

  const [showComplete, setShowComplete] = useState(false);
  const [justCompletedFullReset, setJustCompletedFullReset] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !userId) {
      navigate("/auth");
    }
  }, [userId, isLoading, navigate]);

  // Handle day completion
  const handleComplete = (data: { reflection?: string; commitment?: string; release?: string }) => {
    const wasLastDay = currentDay >= 7;
    completeDay(data, {
      onSuccess: () => {
        setJustCompletedFullReset(wasLastDay);
        setShowComplete(true);
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

  // Show completion screen
  if (showComplete) {
    return <ResetComplete isFullReset={justCompletedFullReset} />;
  }

  // No active session - prompt to start
  if (!activeSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Ready to begin?
          </h1>
          <p className="text-muted-foreground mb-8">
            The 7-Day Reset will guide you through regaining control, one day at a time.
          </p>
          <Button
            onClick={() => startReset()}
            disabled={isStarting}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isStarting ? "Starting..." : "Begin My Reset"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Reset already completed
  if (isCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-6">⚡</div>
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            You've completed your reset
          </h1>
          <p className="text-muted-foreground mb-8">
            Carry forward what you've learned. You can start a new reset anytime.
          </p>
          <Button
            onClick={() => startReset()}
            disabled={isStarting}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isStarting ? "Starting..." : "Start a New Reset"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Show today's reset
  return (
    <ResetDay
      dayNumber={currentDay}
      completedDays={completedDays.length}
      onComplete={handleComplete}
      isCompleting={isCompleting}
    />
  );
};

export default Reset;
