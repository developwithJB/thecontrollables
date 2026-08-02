import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PracticeToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  title: string;
  description: string;
  requirement?: "required" | "recommended";
  disabled?: boolean;
}

export function PracticeToggle({
  pressed,
  onPressedChange,
  title,
  description,
  requirement = "recommended",
  disabled = false,
}: PracticeToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "group flex min-h-[76px] w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        pressed
          ? "border-primary/35 bg-primary/10 shadow-[inset_0_0_24px_hsl(var(--primary)/0.05)]"
          : "border-border/60 bg-background/55 hover:border-primary/25 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {pressed ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
              requirement === "required" ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {requirement}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
