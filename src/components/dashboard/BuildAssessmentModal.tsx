import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getArchetypeInfo, type BuildQuestion, type BuildScore } from "@/lib/build";

const SCALE_OPTIONS = [
  { value: 1, label: "Rarely", description: "Almost never in the last 7 days" },
  { value: 2, label: "Sometimes", description: "A few times this week" },
  { value: 3, label: "Often", description: "Most days this week" },
  { value: 4, label: "Consistently", description: "Nearly every day" },
];

const CONTROLLABLE_EMOJIS: Record<string, string> = {
  awareness: "🦉",
  perspective: "🐢",
  habit: "🦈",
  wellness: "🛰️",
  environment: "🚀",
};

interface BuildAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: BuildQuestion[];
  onSubmit: (answers: Record<string, number>) => Promise<BuildScore>;
  isSubmitting: boolean;
}

export function BuildAssessmentModal({
  open,
  onOpenChange,
  questions,
  onSubmit,
  isSubmitting,
}: BuildAssessmentModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<BuildScore | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const canProceed = currentQuestion && answers[currentQuestion.id] !== undefined;
  const isComplete = answeredCount === totalQuestions;

  const handleAnswer = (value: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await onSubmit(answers);
      setResults(result);
      setShowResults(true);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
    setResults(null);
    onOpenChange(false);
  };

  const archetypeInfo = results ? getArchetypeInfo(results.build_archetype_key) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="build-assessment-modal">
        <DialogHeader>
          <DialogTitle className="font-display">
            {showResults ? "Your Build" : "Scan Your Build"}
          </DialogTitle>
          {!showResults && (
            <p className="text-sm text-muted-foreground mt-1">
              No right answers. This just helps us know where to start.
            </p>
          )}
        </DialogHeader>

        <AnimatePresence mode="wait">
          {showResults && results ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              {/* Archetype */}
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {archetypeInfo?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {archetypeInfo?.description}
                </p>
              </div>

              {/* Scores */}
              <div className="space-y-3">
                {[
                  { key: "awareness", label: "Awareness", emoji: "🦉" },
                  { key: "perspective", label: "Perspective", emoji: "🐢" },
                  { key: "habit", label: "Habit", emoji: "🦈" },
                  { key: "wellness", label: "Wellness", emoji: "🛰️" },
                  { key: "environment", label: "Environment", emoji: "🚀" },
                ].map((stat) => {
                  const value = Number(results[stat.key as keyof BuildScore]) || 0;
                  const percentage = (value / 4) * 100;
                  return (
                    <div key={stat.key} className="flex items-center gap-3">
                      <span className="text-lg w-8">{stat.emoji}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{stat.label}</span>
                          <span className="text-muted-foreground">{value.toFixed(1)}/4</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Overall</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {Number(results.overall).toFixed(1)}
                  <span className="text-lg text-muted-foreground">/4</span>
                </p>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Any build is viable. Don't fight your natural kit.
              </p>

                <Button onClick={handleClose} className="w-full" data-testid="build-assessment-done-button">
                  Done
                </Button>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pt-4"
            >
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Question {currentIndex + 1} of {totalQuestions}</span>
                  <span>{answeredCount} answered</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              {currentQuestion && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-lg">
                        {CONTROLLABLE_EMOJIS[currentQuestion.controllable]}
                      </span>
                      <span className="capitalize">{currentQuestion.controllable}</span>
                    </div>

                    <p className="text-lg font-medium text-foreground leading-relaxed">
                      "{currentQuestion.prompt}"
                    </p>

                    <p className="text-xs text-muted-foreground">
                      In the last 7 days, how often was this true?
                    </p>

                    {/* Answer options */}
                    <div className="space-y-2">
                      {SCALE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleAnswer(option.value)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            answers[currentQuestion.id] === option.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{option.label}</span>
                            <span className={`text-xs ${
                              answers[currentQuestion.id] === option.value
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            }`}>
                              {option.value}/4
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${
                            answers[currentQuestion.id] === option.value
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}>
                            {option.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Navigation */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>

                {isComplete ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1"
                    data-testid="build-assessment-submit-button"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing
                      </>
                    ) : (
                      "Complete Scan"
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed || currentIndex === totalQuestions - 1}
                    className="flex-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                No shame. Just a snapshot. You can rescan anytime.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
