import { motion } from "framer-motion";
import { Orbit, FolderKanban, Calendar, ListChecks, Activity, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HierarchyExplainerProps {
  variant?: "compact" | "expanded";
  highlighted?: "season" | "project" | "calendar" | "task" | "actuals" | null;
  className?: string;
}

const HIERARCHY_LEVELS = [
  {
    key: "season",
    icon: Orbit,
    title: "Season",
    subtitle: "Life Arc",
    description: "Your life chapter. The big picture arc you're living in.",
    example: "New City, New Start",
  },
  {
    key: "project",
    icon: FolderKanban,
    title: "Chapter",
    subtitle: "Building",
    description: "What you're building within this season. Intention containers.",
    example: "Morning Routine, Skill Building",
  },
  {
    key: "calendar",
    icon: Calendar,
    title: "Calendar Block",
    subtitle: "When",
    description: "When you're doing it. Blocks of time allocated to projects.",
    example: "Deep Work 9–11am",
  },
  {
    key: "task",
    icon: ListChecks,
    title: "Task",
    subtitle: "What",
    description: "What specifically happens in each block. The action.",
    example: "Write chapter outline, 30 min run",
  },
  {
    key: "actuals",
    icon: Activity,
    title: "Actuals",
    subtitle: "Body + Data",
    description: "What your body and behavior recorded. The truth layer.",
    example: "Recovery 82%, 7.2h sleep, HRV 48",
  },
];

export function HierarchyExplainer({
  variant = "compact",
  highlighted = null,
  className,
}: HierarchyExplainerProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-1.5 py-3", className)}>
        {HIERARCHY_LEVELS.map((level, index) => {
          const Icon = level.icon;
          const isHighlighted = highlighted === level.key;

          return (
            <div key={level.key} className="flex items-center gap-1.5">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors",
                  isHighlighted
                    ? "bg-primary/20 ring-2 ring-primary/30"
                    : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "w-3 h-3",
                    isHighlighted ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isHighlighted ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {level.title}
                </span>
              </motion.div>
              {index < HIERARCHY_LEVELS.length - 1 && (
                <ChevronDown className="w-3 h-3 text-muted-foreground/50 rotate-[-90deg]" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Expanded variant - vertical cards with descriptions
  return (
    <div className={cn("space-y-3", className)}>
      {HIERARCHY_LEVELS.map((level, index) => {
        const Icon = level.icon;
        const isHighlighted = highlighted === level.key;

        return (
          <motion.div
            key={level.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <div
              className={cn(
                "p-4 rounded-xl border transition-colors",
                isHighlighted
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0",
                    isHighlighted ? "bg-primary/20" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isHighlighted ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className={cn(
                        "font-medium text-sm",
                        isHighlighted ? "text-primary" : "text-foreground"
                      )}
                    >
                      {level.title}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {level.subtitle}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {level.description}
                  </p>
                  <p className="text-xs text-foreground/70 mt-1.5 italic">
                    e.g., "{level.example}"
                  </p>
                </div>
              </div>
            </div>
            {index < HIERARCHY_LEVELS.length - 1 && (
              <div className="flex justify-center py-1">
                <ChevronDown className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
