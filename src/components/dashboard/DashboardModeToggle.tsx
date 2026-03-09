import { cn } from "@/lib/utils";
import { Crosshair, Sliders } from "lucide-react";
import { motion } from "framer-motion";

export type DashboardMode = "command" | "control";

interface DashboardModeToggleProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

export const DashboardModeToggle = ({ mode, onModeChange }: DashboardModeToggleProps) => {
  return (
    <div className="relative flex items-center bg-muted rounded-full p-0.5 w-fit">
      {/* Sliding background pill */}
      <motion.div
        layoutId="mode-pill"
        className="absolute inset-y-0.5 rounded-full bg-background shadow-sm"
        style={{
          width: "50%",
          left: mode === "command" ? "2px" : "calc(50% - 2px)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      
      <button
        onClick={() => onModeChange("command")}
        className={cn(
          "relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
          mode === "command" ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Crosshair className="w-3 h-3" />
        Command
      </button>
      <button
        onClick={() => onModeChange("control")}
        className={cn(
          "relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
          mode === "control" ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Sliders className="w-3 h-3" />
        Control
      </button>
    </div>
  );
};
