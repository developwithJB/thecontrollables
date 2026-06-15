import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GameSignals } from "@/lib/signalInterpreter";
import { getBookControllable } from "@/lib/bookWorld";

interface TodaysReadCardProps {
  signals: GameSignals | null;
}

function getEgoSignal(signals: GameSignals | null): string {
  if (signals?.bossBattle) {
    return signals.bossBattle.summary;
  }

  if (signals?.supportMode === "recover") {
    return "Ego may try to call recovery weakness. The honest move is to protect the vessel and keep one promise you can actually finish.";
  }

  if (signals?.supportMode === "protect") {
    return "Ego may try to turn a full day into an all-or-nothing day. Let the work get smaller and cleaner.";
  }

  if (signals?.supportMode === "stretch") {
    return "Ego may try to make momentum about proving something. Use the opening for one aligned rep, then stay grounded.";
  }

  return "Ego is quiet enough to miss today. Keep listening for drift: rushing, gripping, comparison, or the voice that says one small promise does not count.";
}

export function TodaysReadCard({ signals }: TodaysReadCardProps) {
  const recommended = getBookControllable(signals?.likelyControllableOpportunity);
  const response = getBookControllable(signals?.likelyControllableAtRisk);
  const explanation =
    signals?.explanation ??
    "Start with one honest read of where you are today. The goal is not to control everything. The goal is to practice what is actually yours.";
  const mainMission =
    signals?.suggestedMainQuest ?? "Choose one kept promise that would make today more honest.";
  const keptPromise =
    signals?.suggestedSupportMove ?? recommended.recommendedPractice;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Today&apos;s Read
          </p>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Welcome back. Let&apos;s see where your Controllables are today.
          </h2>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[11px]">
          Self-Trust
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{explanation}</p>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-[0.16em]">
              Ego Signal
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{getEgoSignal(signals)}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Main Mission
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{mainMission}</p>
          </div>

          <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Recommended Controllable
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {recommended.emoji}
              </span>
              <p className={`text-sm font-semibold ${recommended.classes.textClass}`}>
                {recommended.name}
              </p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <p className={`text-sm font-semibold ${response.classes.textClass}`}>
                {response.signalLanguage}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {recommended.coreQuestion}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            One Small Kept Promise
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{keptPromise}</p>
        </div>
      </div>
    </motion.section>
  );
}

