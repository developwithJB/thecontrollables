import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getControllableGuideClasses, type ControllableGuideId } from "@/lib/controllables";

export type ControllableType = ControllableGuideId;

interface ControllableCardProps {
  type: ControllableType;
  title: string;
  emoji: string;
  description: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function ControllableCard({
  type,
  title,
  emoji,
  description,
  isActive = false,
  onClick,
}: ControllableCardProps) {
  const classes = getControllableGuideClasses(type);

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-4 border transition-all duration-300",
        classes.cardClass,
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
          <h3 className={cn("font-display font-semibold", classes.textClass)}>
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
