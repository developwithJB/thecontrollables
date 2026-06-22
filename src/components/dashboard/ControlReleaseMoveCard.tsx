import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Textarea } from "@/components/ui/textarea";
import { FuturePanel } from "@/components/ui/future";
import { cn } from "@/lib/utils";

interface ControlReleaseMoveCardProps {
  userId: string;
  mainMission?: string;
  onSaved?: () => void;
}

interface RitualState {
  control: string;
  release: string;
  move: string;
  keptPromise: boolean;
}

const EMPTY_RITUAL: RitualState = {
  control: "",
  release: "",
  move: "",
  keptPromise: false,
};

function getTodayKey(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function ControlReleaseMoveCard({ userId, mainMission, onSaved }: ControlReleaseMoveCardProps) {
  const [ritual, setRitual] = useState<RitualState>(EMPTY_RITUAL);
  const [saved, setSaved] = useState(false);
  const storageKey = useMemo(
    () => `control_release_move_${userId}_${getTodayKey()}`,
    [userId],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setRitual(EMPTY_RITUAL);
        return;
      }
      setRitual({ ...EMPTY_RITUAL, ...JSON.parse(raw) });
    } catch {
      setRitual(EMPTY_RITUAL);
    }
  }, [storageKey]);

  const saveRitual = useCallback((nextRitual: RitualState = ritual) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextRitual));
      setSaved(true);
      onSaved?.();
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setSaved(false);
    }
  }, [onSaved, ritual, storageKey]);

  const updateField = (field: keyof Pick<RitualState, "control" | "release" | "move">, value: string) => {
    setSaved(false);
    setRitual((current) => ({ ...current, [field]: value }));
  };

  const toggleKeptPromise = () => {
    setRitual((current) => {
      const next = { ...current, keptPromise: !current.keptPromise };
      saveRitual(next);
      return next;
    });
  };

  const hasAnyEntry = ritual.control.trim() || ritual.release.trim() || ritual.move.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
    >
      <FuturePanel className="px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Today's Note
          </p>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Control / Release / Move
          </h2>
        </div>
        <InfoHint title="Control / Release / Move">
          A light note for today. Name what you can control, what you can release, and the next move. You can change it anytime.
        </InfoHint>
      </div>

      {mainMission ? (
        <div className="mt-4 rounded-xl border border-border/50 bg-background/70 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Main Mission
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{mainMission}</p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <label htmlFor={`${storageKey}_control`} className="flex items-center gap-2 text-sm font-medium text-foreground">
            Control
            <InfoHint title="Control prompt" className="h-6 w-6">What is one thing you can control today?</InfoHint>
          </label>
          <Textarea
            id={`${storageKey}_control`}
            value={ritual.control}
            onChange={(event) => updateField("control", event.target.value)}
            placeholder="One choice, promise, or boundary."
            className="future-input min-h-[64px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${storageKey}_release`} className="flex items-center gap-2 text-sm font-medium text-foreground">
            Release
            <InfoHint title="Release prompt" className="h-6 w-6">What is one thing you need to release or give to God?</InfoHint>
          </label>
          <Textarea
            id={`${storageKey}_release`}
            value={ritual.release}
            onChange={(event) => updateField("release", event.target.value)}
            placeholder="Outcome, pressure, comparison, or fear."
            className="future-input min-h-[64px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${storageKey}_move`} className="flex items-center gap-2 text-sm font-medium text-foreground">
            Move
            <InfoHint title="Move prompt" className="h-6 w-6">What is the next honest move?</InfoHint>
          </label>
          <Textarea
            id={`${storageKey}_move`}
            value={ritual.move}
            onChange={(event) => updateField("move", event.target.value)}
            placeholder="Small enough to start. Honest enough to count."
            className="future-input min-h-[64px] resize-none"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="future"
          className="flex-1"
          onClick={() => saveRitual()}
          disabled={!hasAnyEntry && !ritual.keptPromise}
        >
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Saved" : "Save note"}
        </Button>
        <Button
          type="button"
          variant={ritual.keptPromise ? "default" : "outline"}
          className={cn("flex-1", ritual.keptPromise && "bg-primary text-primary-foreground")}
          onClick={toggleKeptPromise}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {ritual.keptPromise ? "Move done" : "I did the move"}
        </Button>
      </div>
      </FuturePanel>
    </motion.div>
  );
}
