import { useMemo, useState } from "react";
import type React from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OPERATOR_CONTROL_LEVELS,
  OPERATOR_DAY_TYPES,
  type DailyOperatorOnboardingAnswers,
  type OperatorControlLevel,
  type OperatorDayType,
} from "@/lib/operatorOnboarding";

interface DailyOperatorOnboardingFlowProps {
  onComplete: (answers: DailyOperatorOnboardingAnswers) => Promise<void>;
  isSubmitting?: boolean;
}

export function DailyOperatorOnboardingFlow({
  onComplete,
  isSubmitting = false,
}: DailyOperatorOnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [dayType, setDayType] = useState<OperatorDayType | null>(null);
  const [controlLevel, setControlLevel] = useState<OperatorControlLevel | null>(null);
  const [mattersToday, setMattersToday] = useState("");

  const progress = useMemo(() => `${step + 1} / 6`, [step]);

  const complete = async () => {
    if (!dayType || !controlLevel || !mattersToday.trim()) return;
    await onComplete({
      dayType,
      controlLevel,
      mattersToday: mattersToday.trim().slice(0, 160),
      completedAt: new Date().toISOString(),
    });
  };

  const frame = (children: React.ReactNode) => (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-1 py-8">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Daily Operator
          </p>
          <span className="text-xs text-muted-foreground">{progress}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-border/60 bg-card px-5 py-6 shadow-sm"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  if (step === 0) {
    return frame(
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
            Your day, decided in 60 seconds.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every morning, your AI builds a plan for you. You approve it. It adapts.
          </p>
        </div>
        <Button className="h-12 w-full" onClick={() => setStep(1)}>
          Build my first day
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>,
    );
  }

  if (step === 1) {
    return frame(
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
            You don&apos;t need another to-do list.
          </h1>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {`You already know what you could do.
The hard part is deciding what actually matters today.

That's what The Dashboard helps with.`}
          </p>
        </div>
        <Button className="h-12 w-full" onClick={() => setStep(2)}>
          Let&apos;s do it
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>,
    );
  }

  if (step === 2) {
    return frame(
      <ChoiceStep
        question="What kind of day is today?"
        microcopy="This helps shape your first plan."
        options={OPERATOR_DAY_TYPES}
        value={dayType}
        onSelect={(value) => setDayType(value)}
        onContinue={() => setStep(3)}
      />,
    );
  }

  if (step === 3) {
    return frame(
      <ChoiceStep
        question="How much control do you have today?"
        microcopy="Your plan should match reality, not fantasy."
        options={OPERATOR_CONTROL_LEVELS}
        value={controlLevel}
        onSelect={(value) => setControlLevel(value)}
        onContinue={() => setStep(4)}
      />,
    );
  }

  if (step === 4) {
    return frame(
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-foreground">
            What actually matters today?
          </h1>
          <p className="text-sm text-muted-foreground">One thing. That&apos;s it.</p>
        </div>
        <Input
          value={mattersToday}
          onChange={(event) => setMattersToday(event.target.value)}
          placeholder="Finish the deck, prep for the call, reset my routine..."
          maxLength={160}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && mattersToday.trim()) setStep(5);
          }}
        />
        <Button className="h-12 w-full" onClick={() => setStep(5)} disabled={!mattersToday.trim()}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>,
    );
  }

  return frame(
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
          I&apos;ll suggest a plan. You stay in control.
        </h1>
      </div>

      <div className="space-y-3">
        {[
          "Nothing changes without your approval.",
          "You can edit everything.",
          "The system learns what works for you.",
        ].map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-lg bg-muted/35 px-3 py-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-foreground">{item}</p>
          </div>
        ))}
      </div>

      <Button className="h-12 w-full" onClick={complete} disabled={isSubmitting}>
        {isSubmitting ? "Building your day..." : "Build my day"}
        {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>,
  );
}

function ChoiceStep<T extends string>({
  question,
  microcopy,
  options,
  value,
  onSelect,
  onContinue,
}: {
  question: string;
  microcopy: string;
  options: readonly T[];
  value: T | null;
  onSelect: (value: T) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="font-display text-xl font-semibold text-foreground">{question}</h1>
        <p className="text-sm text-muted-foreground">{microcopy}</p>
      </div>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <Button className="h-12 w-full" onClick={onContinue} disabled={!value}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
