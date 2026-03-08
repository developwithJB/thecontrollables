import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAutoLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { TimeoutWarning } from "@/components/ui/TimeoutWarning";
import type { BuildQuestion } from "@/lib/build";

// Controllable interjection quotes based on score
const INTERJECTION_LOW: Record<string, string[]> = {
  awareness: ["That's what I'm here for.", "The fact that you noticed? That's step one.", "We'll work on this together."],
  perspective: ["Zoom is a skill. We'll practice it.", "The view gets clearer with time.", "Seeing differently starts with seeing at all."],
  habit: ["No reps yet? Good. We start now.", "You don't need motivation. You need one rep.", "That's honest. We build from here."],
  wellness: ["Systems need attention. That's data, not failure.", "The basics are basic because they work.", "Let's check the dashboard together."],
  environment: ["Your setup matters more than your willpower.", "We'll redesign, not just discipline.", "The system shapes the behavior."],
};

const INTERJECTION_HIGH: Record<string, string[]> = {
  awareness: ["You already see clearly. Let's sharpen it.", "Observation is your superpower.", "You've got the instinct. Now we refine it."],
  perspective: ["The long view comes naturally to you.", "You already zoom out. That's rare.", "Patience is your edge."],
  habit: ["You show up. That's the hardest part.", "Reps are already in your DNA.", "Consistency is your foundation."],
  wellness: ["Your systems are running well.", "You take care of the machine. Smart.", "The basics are locked in."],
  environment: ["You design your world intentionally.", "You think in systems, not just effort.", "Your defaults are working for you."],
};

interface OnboardingAssessmentProps {
  questions: BuildQuestion[];
  questionsLoading: boolean;
  onComplete: (answers: Record<string, number>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const ANSWER_OPTIONS = [
  { value: 1, label: "Rarely", description: "Almost never true for me" },
  { value: 2, label: "Sometimes", description: "True occasionally" },
  { value: 3, label: "Often", description: "True most of the time" },
  { value: 4, label: "Always", description: "This is consistently me" },
];

const CONTROLLABLE_EMOJIS: Record<string, string> = {
  awareness: "🦉",
  perspective: "🐢",
  habit: "🦈",
  wellness: "🛰️",
  environment: "🚀",
};

export function OnboardingAssessment({
  questions,
  questionsLoading,
  onComplete,
  onSkip,
  isSubmitting,
}: OnboardingAssessmentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [interjection, setInterjection] = useState<{ emoji: string; text: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const canGoNext = currentQuestion && answers[currentQuestion.id] !== undefined;
  const canGoBack = currentIndex > 0;

  const handleAnswer = (value: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const showInterjection = useCallback((controllable: string, score: number) => {
    const pool = score <= 2 ? INTERJECTION_LOW[controllable] : INTERJECTION_HIGH[controllable];
    if (!pool?.length) return;
    const emoji = CONTROLLABLE_EMOJIS[controllable] || "📊";
    const text = pool[Math.floor(Math.random() * pool.length)];
    setInterjection({ emoji, text });
    setIsTransitioning(true);
    setTimeout(() => {
      setInterjection(null);
      setIsTransitioning(false);
      setCurrentIndex((prev) => prev + 1);
    }, 1500);
  }, []);

  const handleNext = () => {
    if (isLastQuestion && canGoNext) {
      onComplete(answers);
    } else if (canGoNext) {
      // Show interjection before advancing (every 3rd question to avoid fatigue)
      if (currentQuestion && (currentIndex + 1) % 3 === 0) {
        const score = answers[currentQuestion.id];
        showInterjection(currentQuestion.controllable, score);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Track loading timeout for questions
  const { isTimedOut: isQuestionsTimedOut } = useAutoLoadingTimeout(questionsLoading, {
    timeoutMs: 5000,
    context: "BuildAssessment",
  });

  // Track submitting timeout
  const { isTimedOut: isSubmitTimedOut } = useAutoLoadingTimeout(isSubmitting, {
    timeoutMs: 5000,
    context: "AssessmentSubmit",
  });

  if (questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          {isQuestionsTimedOut ? (
            <TimeoutWarning
              context="Assessment"
              onRetry={() => window.location.reload()}
            />
          ) : (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Preparing your assessment...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No questions available. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-6 py-12"
    >
      {/* Quick Start Option */}
      <div className="max-w-md mx-auto w-full mb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-accent/30 bg-accent/5"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚀</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Want to skip ahead?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Jump straight in. You can always take this assessment later from your dashboard.
              </p>
              <button
                onClick={onSkip}
                disabled={isSubmitting}
                className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
              >
                Skip and start now →
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Header */}
      <div className="max-w-md mx-auto w-full mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-sm text-muted-foreground mb-2">
            This helps us guide you without judgment
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Build Assessment
          </h1>
        </motion.div>

        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      {/* Interjection overlay */}
      <AnimatePresence>
        {interjection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6"
          >
            <div className="text-center max-w-xs">
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="text-5xl mb-4"
              >
                {interjection.emoji}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-lg font-medium text-foreground italic"
              >
                "{interjection.text}"
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <motion.div
          key={currentQuestion?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Controllable indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">
              {CONTROLLABLE_EMOJIS[currentQuestion?.controllable] || "📊"}
            </span>
            <span className="text-sm text-muted-foreground capitalize">
              {currentQuestion?.controllable}
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-xl font-medium text-foreground mb-8 leading-relaxed">
            {currentQuestion?.prompt}
          </h2>

          {/* Answer options */}
          <div className="space-y-3">
            {ANSWER_OPTIONS.map((option) => {
              const isSelected = answers[currentQuestion?.id] === option.value;
              return (
                <motion.button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(102,189,239,0.2)]"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">
                        {option.label}
                      </span>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-primary-foreground"
                        />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="max-w-md mx-auto w-full pt-8 space-y-3">
        <div className="flex gap-3">
          {canGoBack && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
            className="flex-1"
            data-testid="assessment-next-button"
          >
            {isSubmitting ? (
              isSubmitTimedOut ? (
                "Still processing..."
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              )
            ) : isLastQuestion ? (
              "See My Build"
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        
        {/* Soft skip option */}
        <button
          onClick={onSkip}
          disabled={isSubmitting}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          I'll explore on my own
        </button>
      </div>
    </motion.div>
  );
}
