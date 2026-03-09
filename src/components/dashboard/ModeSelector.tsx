import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AppMode, MODE_CONFIG, useAdaptiveMode } from "@/hooks/useAdaptiveMode";

interface ModeSelectorProps {
  userId: string;
}

export function ModeSelector({ userId }: ModeSelectorProps) {
  const { activeMode, modeConfig, isManual, setMode, isLoading } = useAdaptiveMode(userId);
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) return null;

  const allModes = Object.entries(MODE_CONFIG) as [AppMode, typeof MODE_CONFIG[AppMode]][];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium border-border/50"
        >
          <span>{modeConfig.emoji}</span>
          <span className={modeConfig.color}>{modeConfig.label}</span>
          {isManual && (
            <span className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground">
              manual
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {allModes.map(([mode, config]) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => {
              setMode(mode, mode === "travel" ? 48 : undefined);
              setIsOpen(false);
            }}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <span className="text-base mt-0.5">{config.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
                {mode === activeMode && (
                  <Check className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {config.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact mode badge for use in other surfaces
export function ModeBadge({ userId }: { userId: string }) {
  const { activeMode, modeConfig, isLoading } = useAdaptiveMode(userId);
  
  if (isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-muted/50 ${modeConfig.color}`}
      >
        <span>{modeConfig.emoji}</span>
        <span>{modeConfig.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
