import { motion } from "framer-motion";

type ControllableKey = "awareness" | "perspective" | "habit" | "wellness" | "environment";

const CONTROLLABLE_META: Record<ControllableKey, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

interface ControllablePoweredByProps {
  controllables: ControllableKey[];
  className?: string;
}

export const ControllablePoweredBy = ({
  controllables,
  className = "",
}: ControllablePoweredByProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className={`flex items-center gap-1.5 flex-wrap ${className}`}
    >
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
        Powered by
      </span>
      {controllables.map((key) => {
        const meta = CONTROLLABLE_META[key];
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
            style={{
              background: `hsl(var(--${key}-soft))`,
              borderColor: `hsl(var(--${key}) / 0.2)`,
              color: `hsl(var(--${key}-foreground))`,
            }}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </span>
        );
      })}
    </motion.div>
  );
};

// Mapping of pages to their controllables
export const PAGE_CONTROLLABLES: Record<string, ControllableKey[]> = {
  today: ["awareness", "perspective", "habit", "wellness", "environment"],
  plan: ["awareness", "habit", "wellness", "environment"],
  body: ["habit", "wellness"],
  growth: ["perspective", "habit", "environment"],
  money: ["awareness", "perspective", "habit", "environment"],
};
