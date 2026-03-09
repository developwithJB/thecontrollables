import { cn } from "@/lib/utils";
import { Crosshair, Sliders } from "lucide-react";

export type DashboardMode = "command" | "control";

interface DashboardModeToggleProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

export const DashboardModeToggle = ({ mode, onModeChange }: DashboardModeToggleProps) => {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onModeChange("command")}
        className={cn(
          "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors",
          mode === "command"
            ? "bg-accent/15 text-accent-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Crosshair className="w-4 h-4" />
        <span className="text-[9px] font-medium leading-none">Focus</span>
      </button>
      <button
        onClick={() => onModeChange("control")}
        className={cn(
          "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors",
          mode === "control"
            ? "bg-accent/15 text-accent-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sliders className="w-4 h-4" />
        <span className="text-[9px] font-medium leading-none">All</span>
      </button>
    </div>
  );
};
