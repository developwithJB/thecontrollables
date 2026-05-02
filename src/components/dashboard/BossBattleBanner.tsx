import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GameSignals } from "@/lib/signalInterpreter";
import { getControllableRosterProfile } from "@/lib/controllableRoster";

interface BossBattleBannerProps {
  signals: GameSignals | null;
}

export function BossBattleBanner({ signals }: BossBattleBannerProps) {
  if (!signals?.bossBattle) {
    return null;
  }

  const bossBattle = signals.bossBattle;
  const atRiskProfile = getControllableRosterProfile(signals.likelyControllableAtRisk);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-card to-primary/5 px-5 py-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600/80" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Boss Battle Mode
            </span>
          </div>
          <h2 className="text-base font-medium text-foreground">{bossBattle.headline}</h2>
        </div>

        <Badge variant="secondary" className="text-[11px]">
          {signals.supportMode === "protect" ? "Protect Mode" : "Recover Mode"}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-foreground">{bossBattle.summary}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-background/70 px-4 py-3 border border-border/40">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Main Quest
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{bossBattle.mainQuest}</p>
        </div>

        <div className="rounded-xl bg-background/70 px-4 py-3 border border-border/40">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            One Support Move
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{bossBattle.supportMove}</p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Let the {atRiskProfile.roleLabel.toLowerCase()} take the lead today. The goal is to move through the stretch with care, not to force a bigger performance.
      </p>
    </motion.div>
  );
}
