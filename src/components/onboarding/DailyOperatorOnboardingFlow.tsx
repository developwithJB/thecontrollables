import { useMemo, useState } from "react";
import type React from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OPERATOR_DAY_TYPES,
  OPERATOR_PROTECTION_FOCUS_OPTIONS,
  type DailyOperatorOnboardingAnswers,
  type OperatorDayType,
  type OperatorProtectionFocus,
} from "@/lib/operatorOnboarding";
import { ORDERED_CONTROLLABLE_GUIDES } from "@/lib/controllables";

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
  const [mattersToday, setMattersToday] = useState("");
  const [protectFocus, setProtectFocus] = useState<OperatorProtectionFocus | null>(null);

  const progress = useMemo(() => `${step + 1} / 6`, [step]);

  const complete = async () => {
    if (!dayType || !mattersToday.trim() || !protectFocus) return;
    await onComplete({
      dayType,
      controlLevel: "Full control",
      mattersToday: mattersToday.trim().slice(0, 160),
      protectFocus,
      completedAt: new Date().toISOString(),
    });
  };

  const frame = (children: React.ReactNode) => (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-1 py-8">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            The Dashboard
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
            Step inside your Dashboard.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Controllables introduced the inner operating system. This app helps you use it every day.
          </p>
        </div>
        <Button className="h-12 w-full" onClick={() => setStep(1)}>
          Begin
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
            Meet your five guides.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Awareness, Perspective, Habit, Wellness, and Environment help you see clearly, reframe, act, recharge, and shape the space around you.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ORDERED_CONTROLLABLE_GUIDES.map((guide) => (
            <div key={guide.name} className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm font-medium text-foreground">
              <span aria-hidden="true" className="mr-2">{guide.emoji}</span>
              {guide.name}
            </div>
          ))}
        </div>
        <Button className="h-12 w-full" onClick={() => setStep(2)}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>,
    );
  }

  if (step === 2) {
    return frame(
      <ChoiceStep
        question="What kind of day is this?"
        microcopy="Awareness uses this to read today's signal."
        options={OPERATOR_DAY_TYPES}
        value={dayType}
        onSelect={(value) => setDayType(value)}
        onContinue={() => setStep(3)}
      />,
    );
  }

  if (step === 3) {
    return frame(
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-foreground">
            What actually matters today?
          </h1>
          <p className="text-sm text-muted-foreground">Habit will turn this into one next action.</p>
        </div>
        <Input
          value={mattersToday}
          onChange={(event) => setMattersToday(event.target.value)}
          placeholder="Finish the deck, prep for the call, reset my routine..."
          maxLength={160}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && mattersToday.trim()) setStep(4);
          }}
        />
        <Button className="h-12 w-full" onClick={() => setStep(4)} disabled={!mattersToday.trim()}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>,
    );
  }

  if (step === 4) {
    return frame(
      <ChoiceStep
        question="What should your Dashboard protect?"
        microcopy="Wellness and Environment use this to protect your charge."
        options={OPERATOR_PROTECTION_FOCUS_OPTIONS}
        value={protectFocus}
        onSelect={(value) => setProtectFocus(value)}
        onContinue={() => setStep(5)}
      />,
    );
  }

  return frame(
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
          You stay in control.
        </h1>
      </div>

      <div className="space-y-3">
        {[
          "The Controllables can suggest.",
          "You choose what to approve.",
          "Nothing changes without your confirmation.",
        ].map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-lg bg-muted/35 px-3 py-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-foreground">{item}</p>
          </div>
        ))}
      </div>

      <Button className="h-12 w-full" onClick={complete} disabled={isSubmitting}>
        {isSubmitting ? "Building your first brief..." : "Build my first brief"}
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
