import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ControllableType = "awareness" | "perspective" | "habit" | "wellness" | "environment";

interface ControllableGuideCardProps {
  type: ControllableType;
  emoji: string;
  name: string;
  tagline: string;
  index: number;
}

const typeStyles: Record<ControllableType, string> = {
  awareness: "bg-awareness-soft border-awareness/20 hover:border-awareness/40",
  perspective: "bg-perspective-soft border-perspective/20 hover:border-perspective/40",
  habit: "bg-habit-soft border-habit/20 hover:border-habit/40",
  wellness: "bg-wellness-soft border-wellness/20 hover:border-wellness/40",
  environment: "bg-environment-soft border-environment/20 hover:border-environment/40",
};

const accentColors: Record<ControllableType, string> = {
  awareness: "text-awareness",
  perspective: "text-perspective",
  habit: "text-habit",
  wellness: "text-wellness",
  environment: "text-environment",
};

export function ControllableGuideCard({
  type,
  emoji,
  name,
  tagline,
  index,
}: ControllableGuideCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative rounded-xl border p-4 cursor-default transition-all duration-300",
        "flex flex-col items-center text-center gap-2",
        typeStyles[type]
      )}
    >
      {/* Breathing pulse effect */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0"
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
        style={{ background: `hsl(var(--${type}))` }}
      />
      
      <span className="text-3xl relative z-10" role="img" aria-label={name}>
        {emoji}
      </span>
      
      <h3 className={cn("font-display font-semibold text-sm relative z-10", accentColors[type])}>
        {name}
      </h3>
      
      <p className="text-xs text-muted-foreground leading-relaxed relative z-10">
        {tagline}
      </p>
    </motion.div>
  );
}
