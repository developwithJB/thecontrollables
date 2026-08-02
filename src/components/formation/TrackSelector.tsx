import { BookOpen, CalendarHeart, ShieldCheck } from "lucide-react";
import { TRACK_DESCRIPTIONS, TRACK_LABELS, TRAINING_TRACKS, type TrainingTrack } from "@/domain/formation/circuits";
import { cn } from "@/lib/utils";

const TRACK_ICONS = {
  read_along: BookOpen,
  charge_40: CalendarHeart,
  fully_charged_75: ShieldCheck,
};

export function TrackSelector({ track, onChange }: { track: TrainingTrack; onChange: (track: TrainingTrack) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Formation path</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {TRAINING_TRACKS.map((candidate) => {
          const Icon = TRACK_ICONS[candidate];
          const selected = candidate === track;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(candidate)}
              className={cn(
                "min-h-[74px] rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected ? "border-primary/40 bg-primary/10" : "border-border/55 bg-background/60 hover:bg-muted/45",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                {TRACK_LABELS[candidate]}
              </span>
              <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">
                {candidate === "read_along" ? "One meaningful practice" : candidate === "charge_40" ? "Partial progress welcome" : "Exact daily requirements"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{TRACK_DESCRIPTIONS[track]}</p>
    </fieldset>
  );
}
