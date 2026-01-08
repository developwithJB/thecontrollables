import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ControllableType = "awareness" | "perspective" | "habit" | "wellness" | "environment";

interface ControllableCardProps {
  type: ControllableType;
  title: string;
  emoji: string;
  description: string;
  isActive?: boolean;
  onClick?: () => void;
}

const controllableStyles: Record<ControllableType, string> = {
  awareness: "bg-awareness-soft hover:bg-awareness/10 border-awareness/20",
  perspective: "bg-perspective-soft hover:bg-perspective/10 border-perspective/20",
  habit: "bg-habit-soft hover:bg-habit/10 border-habit/20",
  wellness: "bg-wellness-soft hover:bg-wellness/10 border-wellness/20",
  environment: "bg-environment-soft hover:bg-environment/10 border-environment/20",
};

const accentColors: Record<ControllableType, string> = {
  awareness: "text-awareness",
  perspective: "text-perspective",
  habit: "text-habit",
  wellness: "text-wellness",
  environment: "text-environment",
};

export function ControllableCard({
  type,
  title,
  emoji,
  description,
  isActive = false,
  onClick,
}: ControllableCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-4 border transition-all duration-300",
        controllableStyles[type],
        isActive && "ring-2 ring-accent"
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label={title}>
          {emoji}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-display font-semibold", accentColors[type])}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
