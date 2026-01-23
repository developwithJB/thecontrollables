import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { BuildQuestion } from "@/lib/build";

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

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const canGoNext = currentQuestion && answers[currentQuestion.id] !== undefined;
  const canGoBack = currentIndex > 0;

  const handleAnswer = (value: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (isLastQuestion && canGoNext) {
      onComplete(answers);
    } else if (canGoNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Preparing your assessment...</p>
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
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
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
