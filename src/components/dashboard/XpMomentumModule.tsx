import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ControllableLevelBadge } from "./ControllableLevelBadge";
import { useActionTracking } from "@/hooks/useActionTracking";
import { getControllableTheme } from "@/lib/controllableTheme";
import { getChargeProgress, getChargeRhythm } from "@/lib/evolutionProgress";

const theme = getControllableTheme("habit");

interface XpLog {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface XpMomentumModuleProps {
  totalXp: number;
  recentLogs: XpLog[];
  compact?: boolean;
}

function ChargeMilestoneRail({ progressPercent, chargeState }: { progressPercent: number; chargeState: string }) {
  return (
    <div className="space-y-2">
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
        />
        <div className="absolute inset-y-0 left-[34%] w-px bg-background/80" />
        <div className="absolute inset-y-0 left-[84%] w-px bg-background/80" />
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className={chargeState === "base" ? "text-foreground" : ""}>Base</span>
        <span className={chargeState === "charged" ? "text-foreground" : ""}>Charged</span>
        <span className={chargeState === "fully charged" ? "text-foreground" : ""}>Fully Charged</span>
      </div>
    </div>
  );
}

export function XpMomentumModule({ totalXp, recentLogs, compact = false }: XpMomentumModuleProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { trackModalAction } = useActionTracking();

  const charge = useMemo(() => getChargeProgress(totalXp), [totalXp]);
  const rhythm = useMemo(() => getChargeRhythm(recentLogs), [recentLogs]);
  const recentEntries = useMemo(
    () =>
      [...recentLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [recentLogs],
  );

  const handleDetailOpen = (open: boolean) => {
    setIsDetailOpen(open);
    if (open) {
      trackModalAction("xp_momentum_detail", "open");
    }
  };

  const todayChipLabel =
    rhythm.todayXp > 0
      ? rhythm.isRepairDay
        ? `+${rhythm.todayXp} Repair XP today`
        : `+${rhythm.todayXp} Charge XP today`
      : null;

  const nextMilestoneCopy =
    charge.xpToNextMilestone > 0
      ? `${charge.xpToNextMilestone} XP to ${charge.nextMilestoneLabel}`
      : `${charge.nextMilestoneLabel} unlocked`;

  if (compact) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => handleDetailOpen(true)}
          className="w-full rounded-xl border border-border/50 bg-card/60 p-3 text-left transition-all hover:bg-card/80 hover:border-border"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-md bg-accent/20 p-1">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Charge Stage</h3>
            <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {charge.chargeStageLabel}
            </span>
          </div>

          <div className="mb-3 flex items-end gap-1">
            <span className="text-2xl font-display font-bold text-foreground">{charge.chargeXp.toLocaleString()}</span>
            <span className="pb-1 text-xs text-muted-foreground">Charge XP</span>
          </div>

          <ChargeMilestoneRail progressPercent={charge.progressPercent} chargeState={charge.chargeState} />

          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <span>Circuit {charge.chargeCircuit}</span>
            <span className="truncate text-right">{nextMilestoneCopy}</span>
          </div>

          {todayChipLabel && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] text-accent">
              {rhythm.isRepairDay ? <RotateCcw className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              <span>{todayChipLabel}</span>
            </div>
          )}
        </motion.button>

        <Dialog open={isDetailOpen} onOpenChange={handleDetailOpen}>
          <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Charge Stage
              </DialogTitle>
            </DialogHeader>
            <ChargeDetailContent
              chargeXp={charge.chargeXp}
              chargeCircuit={charge.chargeCircuit}
              chargeStageLabel={charge.chargeStageLabel}
              chargeState={charge.chargeState}
              progressPercent={charge.progressPercent}
              nextMilestoneCopy={nextMilestoneCopy}
              rhythmLabel={rhythm.rhythmLabel}
              rhythmSupport={rhythm.rhythmSupport}
              repairLabel={rhythm.repairLabel}
              weekXp={rhythm.weekXp}
              todayChipLabel={todayChipLabel}
              recentEntries={recentEntries}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-2xl border bg-card p-5 shadow-soft ${theme.borderClass}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-habit/10 p-1.5">
          <Sparkles className="h-4 w-4 text-habit" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Charge Stage</h3>
        <span className={`ml-auto text-xs font-medium ${theme.textClass}`}>{theme.emoji} {theme.label}</span>
        <ControllableLevelBadge controllable="habit" />
      </div>

      <ChargeDetailContent
        chargeXp={charge.chargeXp}
        chargeCircuit={charge.chargeCircuit}
        chargeStageLabel={charge.chargeStageLabel}
        chargeState={charge.chargeState}
        progressPercent={charge.progressPercent}
        nextMilestoneCopy={nextMilestoneCopy}
        rhythmLabel={rhythm.rhythmLabel}
        rhythmSupport={rhythm.rhythmSupport}
        repairLabel={rhythm.repairLabel}
        weekXp={rhythm.weekXp}
        todayChipLabel={todayChipLabel}
        recentEntries={[]}
      />

      <p className="mt-4 text-center text-xs italic text-muted-foreground">
        Charge grows through reps, repair, and returning without drama.
      </p>
    </motion.div>
  );
}

function ChargeDetailContent({
  chargeXp,
  chargeCircuit,
  chargeStageLabel,
  chargeState,
  progressPercent,
  nextMilestoneCopy,
  rhythmLabel,
  rhythmSupport,
  repairLabel,
  weekXp,
  todayChipLabel,
  recentEntries,
}: {
  chargeXp: number;
  chargeCircuit: number;
  chargeStageLabel: string;
  chargeState: string;
  progressPercent: number;
  nextMilestoneCopy: string;
  rhythmLabel: string;
  rhythmSupport: string;
  repairLabel: string | null;
  weekXp: number;
  todayChipLabel: string | null;
  recentEntries: XpLog[];
}) {
  const isModal = recentEntries.length > 0;

  return (
    <div className="space-y-4 pt-2">
      {todayChipLabel && (
        <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">
          {repairLabel ? <RotateCcw className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          <span>{todayChipLabel}</span>
        </div>
      )}

      <div className="text-center">
        <div className="inline-flex items-baseline gap-1">
          <span className="text-4xl font-display font-bold text-foreground">{chargeXp.toLocaleString()}</span>
          <span className="text-lg text-muted-foreground">Charge XP</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Circuit {chargeCircuit} · {chargeStageLabel}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{chargeState}</span>
          <span>{nextMilestoneCopy}</span>
        </div>
        <ChargeMilestoneRail progressPercent={progressPercent} chargeState={chargeState} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3">
        <div className="rounded-xl bg-muted/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Charge Rhythm</p>
          <p className="mt-1 text-sm font-medium text-foreground">{rhythmLabel}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">This Week</p>
          <p className="mt-1 text-sm font-medium text-foreground">{weekXp} Charge XP</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{rhythmSupport}</p>
      </div>

      {repairLabel && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">{repairLabel}</p>
          </div>
        </div>
      )}

      {isModal && (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Recent Charge XP</p>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {recentEntries.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-muted-foreground">{log.description || log.source}</span>
                <span className="shrink-0 font-medium text-accent">+{log.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
