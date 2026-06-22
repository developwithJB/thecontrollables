import { isValidElement, useMemo, useState } from "react";
import type React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BatteryLow,
  Brain,
  Check,
  Copy,
  DoorOpen,
  Droplets,
  Flag,
  LockKeyhole,
  MessageCircle,
  PenLine,
  RotateCcw,
  Scale,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Input } from "@/components/ui/input";
import { ChargeProgressRing } from "@/components/dashboard/ControllableChargeVisual";
import { useToast } from "@/hooks/use-toast";
import { APP_ROUTES } from "@/lib/appRoutes";
import { CONTROLLABLE_GUIDE_IDS, getControllableGuide } from "@/lib/controllables";
import { getControllableChargeVisual, getControllableVisualColor } from "@/lib/controllableVisuals";
import {
  buildStartingChargeProofCard,
  isPrivacySafeStartingChargeProofCard,
  saveStartingChargeResult,
  scoreStartingCharge,
  STARTING_CHARGE_CURRENT_STATE_LABELS,
  STARTING_CHARGE_EGO_SIGNAL_LABELS,
  STARTING_CHARGE_PROMISE_LABELS,
  type StartingChargeAnswers,
  type StartingChargeCurrentState,
  type StartingChargeEgoSignal,
  type StartingChargePromise,
  type StartingChargeProofCard,
  type StartingChargeResult,
} from "@/lib/startingCharge";
import { cn } from "@/lib/utils";
import type { ControllableType } from "@/components/ControllableCard";

interface StartingChargeFlowProps {
  userId: string;
  initialResult?: StartingChargeResult | null;
  onSaved?: (result: StartingChargeResult) => void;
}

type FlowStep = "entry" | "state" | "strongest" | "charge" | "ego" | "promise" | "result";

const FLOW_STEPS: Exclude<FlowStep, "entry" | "result">[] = ["state", "strongest", "charge", "ego", "promise"];
const TOTAL_SCAN_STEPS = FLOW_STEPS.length + 2;

const CURRENT_STATE_OPTIONS: StartingChargeCurrentState[] = [
  "clear",
  "scattered",
  "motivated",
  "tired",
  "stuck",
  "ready",
];

const EGO_SIGNAL_OPTIONS: StartingChargeEgoSignal[] = [
  "comparison",
  "overthinking",
  "control",
  "avoidance",
  "shame",
  "all-or-nothing",
];

const PROMISE_OPTIONS: StartingChargePromise[] = [
  "move_10",
  "drink_water",
  "clear_blocker",
  "send_message",
  "quiet_minute",
  "write_true",
  "custom",
];

const STATE_VISUALS: Record<StartingChargeCurrentState, { icon: LucideIcon; color: string }> = {
  clear: { icon: Sparkles, color: "hsl(199 100% 66%)" },
  scattered: { icon: Activity, color: "hsl(263 84% 68%)" },
  motivated: { icon: ArrowRight, color: "hsl(158 70% 56%)" },
  tired: { icon: BatteryLow, color: "hsl(270 86% 68%)" },
  stuck: { icon: Target, color: "hsl(24 94% 66%)" },
  ready: { icon: Zap, color: "hsl(176 78% 57%)" },
};

const EGO_VISUALS: Record<StartingChargeEgoSignal, { icon: LucideIcon; color: string }> = {
  comparison: { icon: Scale, color: "hsl(193 100% 65%)" },
  overthinking: { icon: Brain, color: "hsl(215 100% 62%)" },
  control: { icon: Shield, color: "hsl(182 78% 68%)" },
  avoidance: { icon: DoorOpen, color: "hsl(31 100% 66%)" },
  shame: { icon: ShieldCheck, color: "hsl(256 100% 72%)" },
  "all-or-nothing": { icon: Scale, color: "hsl(187 90% 63%)" },
};

const PROMISE_VISUALS: Record<StartingChargePromise, { icon: LucideIcon; color: string }> = {
  move_10: { icon: Activity, color: "hsl(var(--wellness))" },
  drink_water: { icon: Droplets, color: "hsl(var(--wellness))" },
  clear_blocker: { icon: Target, color: "hsl(var(--environment))" },
  send_message: { icon: MessageCircle, color: "hsl(var(--environment))" },
  quiet_minute: { icon: Sparkles, color: "hsl(var(--awareness))" },
  write_true: { icon: PenLine, color: "hsl(var(--perspective))" },
  custom: { icon: Star, color: "hsl(var(--habit))" },
};

const ORBIT_LAYOUT: Record<ControllableType, string> = {
  awareness: "left-1/2 top-0 -translate-x-1/2",
  perspective: "right-0 top-[34%] -translate-y-1/2",
  habit: "right-[13%] bottom-[4%]",
  wellness: "left-[13%] bottom-[4%]",
  environment: "left-0 top-[34%] -translate-y-1/2",
};

export function StartingChargeFlow({ userId, initialResult = null, onSaved }: StartingChargeFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>(initialResult ? "result" : "entry");
  const [answers, setAnswers] = useState<Partial<StartingChargeAnswers>>(initialResult?.answers ?? {});
  const [result, setResult] = useState<StartingChargeResult | null>(initialResult);
  const [customPromise, setCustomPromise] = useState(initialResult?.answers.customPromise ?? "");
  const [includeCustomInShare, setIncludeCustomInShare] = useState(false);

  const proofCard = useMemo(
    () => (result ? buildStartingChargeProofCard(result, { includeCustomPromise: includeCustomInShare }) : null),
    [includeCustomInShare, result],
  );

  const resetFlow = () => {
    setStep("entry");
    setAnswers({});
    setResult(null);
    setCustomPromise("");
    setIncludeCustomInShare(false);
  };

  const saveResult = (nextResult: StartingChargeResult) => {
    saveStartingChargeResult(userId, nextResult);
    onSaved?.(nextResult);
  };

  const completeFlow = (nextAnswers: StartingChargeAnswers) => {
    const nextResult = scoreStartingCharge(nextAnswers);
    setAnswers(nextResult.answers);
    setResult(nextResult);
    setStep("result");
  };

  const selectAnswer = <K extends keyof StartingChargeAnswers>(key: K, value: StartingChargeAnswers[K]) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const handleContinue = () => {
    if (step === "promise") {
      const trimmed = customPromise.trim();
      const nextAnswers = {
        ...answers,
        customPromise: answers.firstPromise === "custom" ? trimmed : undefined,
      };
      if (hasCompleteAnswers(nextAnswers)) {
        completeFlow(nextAnswers);
      }
      return;
    }

    const nextStep = getNextStep(step);
    if (nextStep) setStep(nextStep);
  };

  const handleSaveDashboard = () => {
    if (!result) return;
    saveResult(result);
    toast({ title: "Starting Charge saved", description: "My Controllables are ready." });
  };

  const handleStartMission = () => {
    if (!result) return;
    saveResult(result);
    navigate(`${APP_ROUTES.train}?controllable=${result.chargingControllable}`);
  };

  const handleShare = async () => {
    if (!proofCard) return;
    try {
      await navigator.clipboard.writeText(proofCard.shareText);
      toast({ title: "Copied", description: "Starting Charge proof is share-safe." });
    } catch {
      toast({ title: "Share card ready", description: "Copy is visible on the card." });
    }
  };

  const questionStepNumber = FLOW_STEPS.includes(step as Exclude<FlowStep, "entry" | "result">)
    ? FLOW_STEPS.indexOf(step as Exclude<FlowStep, "entry" | "result">) + 2
    : 1;

  return (
    <section className="dashboard-os-surface rounded-[2rem] px-4 py-5 text-foreground sm:px-6 sm:py-7">
      <div className="relative z-10">
        {step === "entry" ? (
          <EntryScreen onStart={() => setStep("state")} />
        ) : null}

        {step !== "entry" && step !== "result" ? (
          <QuestionFrame
            step={questionStepNumber}
            total={TOTAL_SCAN_STEPS}
            copy={getQuestionCopy(step)}
            canContinue={canContinue(step, answers, customPromise)}
            onBack={() => setStep(getPreviousStep(step))}
            onContinue={handleContinue}
          >
            {step === "state" ? (
              <OptionGrid>
                {CURRENT_STATE_OPTIONS.map((option) => {
                  const visual = STATE_VISUALS[option];
                  return (
                    <TapCard
                      key={option}
                      icon={visual.icon}
                      label={STARTING_CHARGE_CURRENT_STATE_LABELS[option]}
                      color={visual.color}
                      selected={answers.currentState === option}
                      onClick={() => selectAnswer("currentState", option)}
                    />
                  );
                })}
              </OptionGrid>
            ) : null}

            {step === "strongest" || step === "charge" ? (
              <OptionGrid>
                {CONTROLLABLE_GUIDE_IDS.map((type) => {
                  const guide = getControllableGuide(type);
                  const selected =
                    step === "strongest"
                      ? answers.strongestControllable === type
                      : answers.needsChargeControllable === type;
                  return (
                    <TapCard
                      key={type}
                      icon={<span className="text-5xl leading-none">{guide.emoji}</span>}
                      label={guide.name}
                      color={getControllableVisualColor(type)}
                      selected={selected}
                      onClick={() =>
                        selectAnswer(
                          step === "strongest" ? "strongestControllable" : "needsChargeControllable",
                          type,
                        )
                      }
                    />
                  );
                })}
              </OptionGrid>
            ) : null}

            {step === "ego" ? (
              <OptionGrid>
                {EGO_SIGNAL_OPTIONS.map((option) => {
                  const visual = EGO_VISUALS[option];
                  return (
                    <TapCard
                      key={option}
                      icon={visual.icon}
                      label={STARTING_CHARGE_EGO_SIGNAL_LABELS[option]}
                      color={visual.color}
                      selected={answers.egoSignal === option}
                      onClick={() => selectAnswer("egoSignal", option)}
                    />
                  );
                })}
              </OptionGrid>
            ) : null}

            {step === "promise" ? (
              <div className="space-y-3">
                <OptionGrid>
                  {PROMISE_OPTIONS.map((option) => {
                    const visual = PROMISE_VISUALS[option];
                    return (
                      <TapCard
                        key={option}
                        icon={visual.icon}
                        label={STARTING_CHARGE_PROMISE_LABELS[option]}
                        color={visual.color}
                        selected={answers.firstPromise === option}
                        onClick={() => selectAnswer("firstPromise", option)}
                      />
                    );
                  })}
                </OptionGrid>
                {answers.firstPromise === "custom" ? (
                  <div className="dashboard-os-card rounded-2xl p-3">
                    <Input
                      value={customPromise}
                      onChange={(event) => setCustomPromise(event.target.value.slice(0, 80))}
                      placeholder="Write one promise"
                      className="h-12 border-primary/20 bg-background/70 text-base"
                      maxLength={80}
                    />
                    <div className="mt-2 flex justify-center">
                      <InfoHint title="Custom promise privacy" className="h-6 w-6">
                        Custom promises stay private unless you turn sharing on.
                      </InfoHint>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </QuestionFrame>
        ) : null}

        {step === "result" && result && proofCard ? (
          <ResultScreen
            result={result}
            proofCard={proofCard}
            includeCustomInShare={includeCustomInShare}
            onToggleCustomShare={() => setIncludeCustomInShare((current) => !current)}
            onStartMission={handleStartMission}
            onSaveDashboard={handleSaveDashboard}
            onShare={handleShare}
            onRetake={resetFlow}
          />
        ) : null}
      </div>
    </section>
  );
}

function EntryScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-[min(640px,calc(100svh-9rem))] max-w-3xl flex-col justify-between gap-4 text-center sm:gap-7"
    >
      <div className="space-y-3 sm:space-y-4">
        <ScanProgress step={1} total={TOTAL_SCAN_STEPS} />
        <DashboardGlyph />
        <div className="space-y-2">
          <h2 className="dashboard-neon-text font-display text-4xl font-bold leading-[0.95] sm:text-7xl">
            Enter Your{" "}
            <span className="dashboard-neon-accent block">Dashboard</span>
          </h2>
          <p className="mx-auto max-w-md text-sm font-medium text-muted-foreground sm:text-lg">
            Find your starting charge in 60 seconds.
          </p>
        </div>
      </div>

      <OrbitConstellation />

      <Button
        className="dashboard-primary-glow mx-auto h-14 w-full max-w-2xl rounded-2xl text-base font-bold sm:h-16 sm:rounded-[1.75rem] sm:text-xl"
        onClick={onStart}
      >
        <Target className="mr-2 h-5 w-5 sm:mr-3 sm:h-6 sm:w-6" />
        Start Scan
      </Button>
    </motion.div>
  );
}

function QuestionFrame({
  step,
  total,
  copy,
  children,
  canContinue,
  onBack,
  onContinue,
}: {
  step: number;
  total: number;
  copy: QuestionCopy;
  children: React.ReactNode;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      key={copy.accent}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto flex min-h-[min(660px,calc(100svh-8rem))] max-w-3xl flex-col gap-4 sm:gap-6"
    >
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/15 bg-background/55 text-muted-foreground shadow-[inset_0_0_22px_hsl(var(--primary)/0.07)] transition-colors hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ScanProgress step={step} total={total} compact />
      </div>

      <div className="space-y-3 text-center sm:space-y-5">
        <DashboardGlyph />
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">Starting Charge</p>
          <h2 className="dashboard-neon-text mx-auto max-w-2xl font-display text-4xl font-bold leading-[0.96] sm:text-7xl">
            {copy.before ? `${copy.before} ` : ""}
            <span className="dashboard-neon-accent">{copy.accent}</span>
            {copy.after ? ` ${copy.after}` : ""}
          </h2>
          <div className="mt-4 flex justify-center">
            <InfoHint title="Question hint">{copy.subtitle}</InfoHint>
          </div>
        </div>
      </div>

      <div className="flex-1">{children}</div>

      <div className="space-y-4">
        <Button
          className="dashboard-primary-glow h-14 w-full rounded-2xl text-base font-bold sm:h-16 sm:rounded-[1.75rem] sm:text-xl"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5 sm:ml-3 sm:h-6 sm:w-6" />
        </Button>
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground/75">
          <LockKeyhole className="h-4 w-4" />
          <span>Editable</span>
          <InfoHint title="Editable answers" className="h-6 w-6">
            You can change this anytime.
          </InfoHint>
        </div>
      </div>
    </motion.div>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">{children}</div>;
}

function TapCard({
  icon,
  label,
  color,
  selected = false,
  onClick,
}: {
  icon: LucideIcon | React.ReactElement;
  label: string;
  color: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const Icon = icon as LucideIcon;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="dashboard-option-card group min-h-[132px] rounded-2xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 sm:min-h-[196px] sm:rounded-[1.75rem] sm:p-4"
      data-selected={selected}
      style={{
        borderColor: selected ? color : undefined,
        boxShadow: selected ? `0 0 28px ${color}55, inset 0 0 38px ${color}12` : undefined,
      }}
    >
      {selected ? (
        <span
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-background sm:right-4 sm:top-4 sm:h-8 sm:w-8"
          style={{ backgroundColor: color, boxShadow: `0 0 18px ${color}` }}
        >
          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      ) : null}
      <span
        className="relative z-10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border text-3xl sm:mb-5 sm:h-20 sm:w-20 sm:text-4xl"
        style={{
          color,
          borderColor: `${color}77`,
          backgroundColor: `${color}14`,
          boxShadow: selected ? `0 0 34px ${color}4d` : `inset 0 0 24px ${color}12`,
        }}
        aria-hidden="true"
      >
        {isValidElement(icon) ? icon : <Icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.7} />}
      </span>
      <span className={cn("relative z-10 block text-sm font-bold sm:text-lg", selected ? "text-primary" : "text-foreground")}>
        {label}
      </span>
    </motion.button>
  );
}

function ResultScreen({
  result,
  proofCard,
  includeCustomInShare,
  onToggleCustomShare,
  onStartMission,
  onSaveDashboard,
  onShare,
  onRetake,
}: {
  result: StartingChargeResult;
  proofCard: StartingChargeProofCard;
  includeCustomInShare: boolean;
  onToggleCustomShare: () => void;
  onStartMission: () => void;
  onSaveDashboard: () => void;
  onShare: () => void;
  onRetake: () => void;
}) {
  const strongestGuide = getControllableGuide(result.strongestControllable);
  const chargingGuide = getControllableGuide(result.chargingControllable);
  const privacySafe = isPrivacySafeStartingChargeProofCard(proofCard);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-[min(680px,calc(100svh-8rem))] max-w-4xl flex-col gap-4 sm:gap-6"
    >
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={onRetake}
          className="absolute left-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/15 bg-background/55 text-muted-foreground shadow-[inset_0_0_22px_hsl(var(--primary)/0.07)] transition-colors hover:text-foreground"
          aria-label="Retake scan"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <ScanProgress step={TOTAL_SCAN_STEPS} total={TOTAL_SCAN_STEPS} compact />
      </div>

      <div className="space-y-2 text-center sm:space-y-3">
        <DashboardGlyph />
        <h2 className="dashboard-neon-text font-display text-4xl font-bold leading-[0.96] sm:text-7xl">
          Your
          <span className="dashboard-neon-accent block">Starting Charge</span>
        </h2>
        <div className="flex justify-center">
          <InfoHint title="Starting Charge result">Here is where you are beginning.</InfoHint>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <HeroControllableOrb type={result.strongestControllable} />
        <div className="grid gap-2">
          <ResultSignalRow icon={<Star className="h-7 w-7" />} label="Strongest" value={strongestGuide.name} />
          <ResultSignalRow icon={<Zap className="h-7 w-7" />} label="Charging" value={chargingGuide.name} />
          <ResultSignalRow icon={<Activity className="h-7 w-7" />} label="Ego Signal" value={STARTING_CHARGE_EGO_SIGNAL_LABELS[result.egoSignal]} />
          <ResultSignalRow icon={<Flag className="h-7 w-7" />} label="Mission 001" value={result.firstMission.title} />
        </div>
      </div>

      <ChargeScoreGrid result={result} />

      <SelfTrustBanner percent={result.startingSelfTrustPercent} level={result.startingSelfTrustLevel} />

      <StartingChargeProofPreview card={proofCard} safe={privacySafe} />

      {result.answers.firstPromise === "custom" ? (
        <button
          type="button"
          aria-pressed={includeCustomInShare}
          onClick={onToggleCustomShare}
          className={cn(
            "dashboard-os-card flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold",
            includeCustomInShare ? "text-primary" : "text-muted-foreground",
          )}
        >
          Include custom promise in share
          <span>{includeCustomInShare ? "On" : "Off"}</span>
        </button>
      ) : null}

      <div className="space-y-3">
        <Button
          className="dashboard-primary-glow h-14 w-full rounded-2xl text-base font-bold sm:h-16 sm:rounded-[1.75rem] sm:text-xl"
          onClick={onStartMission}
        >
          <Zap className="mr-2 h-5 w-5 sm:mr-3 sm:h-6 sm:w-6" />
          Start Mission
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-12 rounded-2xl border-primary/40 bg-background/55 text-primary hover:bg-primary/10"
            onClick={onSaveDashboard}
          >
            <Check className="mr-2 h-4 w-4" />
            Save My Dashboard
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-2xl border-primary/40 bg-background/55 text-primary hover:bg-primary/10"
            onClick={onShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share My Starting Charge
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function OrbitConstellation() {
  return (
    <div className="relative mx-auto h-[250px] w-full max-w-[360px] sm:h-[360px] sm:max-w-[460px]" aria-label="The five Controllables">
      <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/28 shadow-[0_0_44px_hsl(var(--primary)/0.12)] sm:h-[280px] sm:w-[280px]" />
      <div className="absolute left-1/2 top-1/2 h-[146px] w-[146px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/12 sm:h-[190px] sm:w-[190px]" />
      <div className="dashboard-circuit-core absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/45 sm:h-32 sm:w-32">
        <Zap className="h-10 w-10 text-primary sm:h-14 sm:w-14" />
      </div>

      {CONTROLLABLE_GUIDE_IDS.map((type) => {
        const guide = getControllableGuide(type);
        return (
          <div key={type} className={cn("absolute text-center", ORBIT_LAYOUT[type])}>
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border text-2xl shadow-[0_0_24px_hsl(var(--primary)/0.13)] sm:h-20 sm:w-20 sm:text-4xl"
              style={{
                borderColor: `${getControllableVisualColor(type)}99`,
                backgroundColor: `hsl(var(--${type}) / 0.13)`,
              }}
            >
              {guide.emoji}
            </div>
            <p className="mt-1 text-xs font-bold text-foreground sm:mt-2 sm:text-sm">{guide.name}</p>
          </div>
        );
      })}
    </div>
  );
}

function DashboardGlyph() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-primary">
      <span className="dashboard-circuit-core flex h-14 w-14 items-center justify-center rounded-full border border-primary/40">
        <BatteryCharging className="h-8 w-8" strokeWidth={1.9} />
      </span>
    </span>
  );
}

function ScanProgress({ step, total, compact = false }: { step: number; total: number; compact?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <span className={cn("dashboard-step-pill mx-auto", compact ? "text-lg" : "text-xl")}>
        <span className="dashboard-neon-accent">{step}</span>/{total}
      </span>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-colors",
              index < step ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]" : "bg-muted/35",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function HeroControllableOrb({ type }: { type: ControllableType }) {
  const guide = getControllableGuide(type);
  const color = getControllableVisualColor(type);

  return (
    <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-72 sm:w-72">
      <div className="absolute inset-8 rounded-full border border-primary/25" />
      <div className="absolute inset-4 rounded-full border border-primary/16" />
      <div
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: `${color}88`, boxShadow: `0 0 46px ${color}55` }}
      />
      <div
        className="relative flex h-32 w-32 items-center justify-center rounded-full border text-6xl sm:h-40 sm:w-40 sm:text-7xl"
        style={{
          borderColor: `${color}99`,
          backgroundColor: `hsl(var(--${type}) / 0.16)`,
          boxShadow: `inset 0 0 34px ${color}22, 0 0 36px ${color}44`,
        }}
        aria-label={guide.name}
      >
        {guide.emoji}
      </div>
      <div className="absolute bottom-6 h-2 w-40 rounded-full border border-primary/25 bg-primary/10 blur-[1px]" />
    </div>
  );
}

function ResultSignalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="dashboard-os-card grid grid-cols-[82px_1fr] items-center overflow-hidden rounded-2xl">
      <div className="flex h-full min-h-[82px] items-center justify-center border-r border-primary/10 text-primary">
        {icon}
      </div>
      <div className="px-4 py-3 text-left">
        <p className="text-sm font-semibold text-muted-foreground">{label}:</p>
        <p className="font-display text-2xl font-bold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChargeScoreGrid({ result }: { result: StartingChargeResult }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {CONTROLLABLE_GUIDE_IDS.map((type) => {
        const guide = getControllableGuide(type);
        const percent = result.chargePercentages[type];
        const visual = getControllableChargeVisual({
          type,
          level: 1,
          totalXp: percent,
          progress: percent / 100,
        });
        return (
          <div key={type} className="dashboard-os-card rounded-2xl p-3 text-center">
            <p className="mb-2 text-sm font-bold text-foreground">{guide.name}</p>
            <ChargeProgressRing visual={visual} size={76} strokeWidth={6} showPercent className="mx-auto" />
          </div>
        );
      })}
    </div>
  );
}

function SelfTrustBanner({ percent, level }: { percent: number; level: number }) {
  return (
    <div className="dashboard-os-card grid gap-4 rounded-[1.75rem] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="dashboard-circuit-core mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/35 text-primary">
        <ShieldCheck className="h-10 w-10" />
      </div>
      <div className="text-center sm:text-left">
        <p className="text-sm font-semibold text-muted-foreground">Self-Trust Level</p>
        <p className="dashboard-neon-accent font-display text-3xl font-bold">Level {level}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/30">
          <span className="block h-full rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.7)]" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function StartingChargeProofPreview({ card, safe }: { card: StartingChargeProofCard; safe: boolean }) {
  return (
    <div className="dashboard-os-card rounded-[1.75rem] p-4">
      <div className="flex items-center gap-3">
        <span className="dashboard-circuit-core flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 text-4xl" aria-hidden="true">
          {card.icon}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Share-safe proof</p>
            {safe ? <LockKeyhole className="h-3 w-3 text-primary" /> : null}
          </div>
          <p className="font-display text-lg font-bold text-foreground">{card.headline}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[card.strongestLine, card.chargingLine, card.missionLine].map((line) => (
              <span key={line} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {line}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">{card.proofLine}</p>
        </div>
        <Copy className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

interface QuestionCopy {
  before: string;
  accent: string;
  after: string;
  subtitle: string;
}

function getQuestionCopy(step: FlowStep): QuestionCopy {
  if (step === "state") {
    return {
      before: "What feels most",
      accent: "true today?",
      after: "",
      subtitle: "Pick the signal that fits right now.",
    };
  }
  if (step === "strongest") {
    return {
      before: "Which Controllable",
      accent: "leads?",
      after: "",
      subtitle: "Choose the one with the most charge.",
    };
  }
  if (step === "charge") {
    return {
      before: "Which one needs",
      accent: "charge?",
      after: "",
      subtitle: "Choose the Controllable to train first.",
    };
  }
  if (step === "ego") {
    return {
      before: "Where does",
      accent: "Ego",
      after: "get loud?",
      subtitle: "Pick what shows up when you are off alignment.",
    };
  }
  return {
    before: "Choose one",
    accent: "promise",
    after: "for today.",
    subtitle: "Mission 001 starts with one kept promise.",
  };
}

function getNextStep(step: FlowStep): FlowStep | null {
  const index = FLOW_STEPS.indexOf(step as Exclude<FlowStep, "entry" | "result">);
  if (index === -1) return null;
  return FLOW_STEPS[index + 1] ?? null;
}

function getPreviousStep(step: FlowStep): FlowStep {
  const index = FLOW_STEPS.indexOf(step as Exclude<FlowStep, "entry" | "result">);
  if (index <= 0) return "entry";
  return FLOW_STEPS[index - 1];
}

function canContinue(step: FlowStep, answers: Partial<StartingChargeAnswers>, customPromise: string): boolean {
  if (step === "state") return Boolean(answers.currentState);
  if (step === "strongest") return Boolean(answers.strongestControllable);
  if (step === "charge") return Boolean(answers.needsChargeControllable);
  if (step === "ego") return Boolean(answers.egoSignal);
  if (step === "promise") {
    if (!answers.firstPromise) return false;
    if (answers.firstPromise === "custom") return customPromise.trim().length >= 3;
    return true;
  }
  return false;
}

function hasCompleteAnswers(answers: Partial<StartingChargeAnswers>): answers is StartingChargeAnswers {
  return Boolean(
    answers.currentState &&
      answers.strongestControllable &&
      answers.needsChargeControllable &&
      answers.egoSignal &&
      answers.firstPromise &&
      (answers.firstPromise !== "custom" || (answers.customPromise?.trim().length ?? 0) >= 3),
  );
}
