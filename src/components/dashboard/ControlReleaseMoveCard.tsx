import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ControlReleaseMoveCardProps {
  userId: string;
  mainMission?: string;
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

export function ControlReleaseMoveCard({ userId, mainMission }: ControlReleaseMoveCardProps) {
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
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setSaved(false);
    }
  }, [ritual, storageKey]);

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
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/6 via-card to-background px-5 py-5 shadow-sm"
    >
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Daily Release Practice
        </p>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Control / Release / Move
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Control what you can, give the rest to God, then take the next honest action.
        </p>
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
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            What is one thing you can control today?
          </span>
          <Textarea
            value={ritual.control}
            onChange={(event) => updateField("control", event.target.value)}
            placeholder="One controllable choice, promise, or boundary."
            className="min-h-[82px] resize-none bg-background/80"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            What is one thing you need to release or give to God?
          </span>
          <Textarea
            value={ritual.release}
            onChange={(event) => updateField("release", event.target.value)}
            placeholder="The outcome, pressure, comparison, or fear you are gripping."
            className="min-h-[82px] resize-none bg-background/80"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            What is the next honest move?
          </span>
          <Textarea
            value={ritual.move}
            onChange={(event) => updateField("move", event.target.value)}
            placeholder="A move small enough to start and honest enough to count."
            className="min-h-[82px] resize-none bg-background/80"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1"
          onClick={() => saveRitual()}
          disabled={!hasAnyEntry && !ritual.keptPromise}
        >
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Saved" : "Save ritual"}
        </Button>
        <Button
          type="button"
          variant={ritual.keptPromise ? "default" : "outline"}
          className={cn("flex-1", ritual.keptPromise && "bg-primary text-primary-foreground")}
          onClick={toggleKeptPromise}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {ritual.keptPromise ? "Promise kept" : "Mark promise kept"}
        </Button>
      </div>
    </motion.section>
  );
}

