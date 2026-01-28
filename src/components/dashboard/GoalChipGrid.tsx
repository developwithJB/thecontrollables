import { motion } from "framer-motion";
import { LIFE_GOALS, GOAL_CATEGORIES, type LifeGoal, type GoalCategory, getGoalContextMessage } from "@/lib/lifeGoals";

interface GoalChipGridProps {
  selectedGoal: string | null;
  onSelectGoal: (goalId: string | null) => void;
  showContext?: boolean;
}

export function GoalChipGrid({ selectedGoal, onSelectGoal, showContext = true }: GoalChipGridProps) {
  const categories: GoalCategory[] = ["break-habit", "build-habit", "mindset"];
  
  const handleChipClick = (goalId: string) => {
    // Toggle selection
    onSelectGoal(selectedGoal === goalId ? null : goalId);
  };

  const selectedGoalData = selectedGoal ? LIFE_GOALS.find(g => g.id === selectedGoal) : null;

  return (
    <div className="space-y-4">
      {/* Goal chips by category */}
      {categories.map((category) => {
        const categoryInfo = GOAL_CATEGORIES[category];
        const categoryGoals = LIFE_GOALS.filter(g => g.category === category);
        
        return (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span>{categoryInfo.emoji}</span>
              {categoryInfo.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryGoals.map((goal) => {
                const isSelected = selectedGoal === goal.id;
                return (
                  <motion.button
                    key={goal.id}
                    onClick={() => handleChipClick(goal.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <span>{goal.emoji}</span>
                    <span className="truncate max-w-[120px]">{goal.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Context message when a goal is selected */}
      {showContext && selectedGoalData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20 mt-4"
        >
          <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
            <span className="text-lg">{selectedGoalData.emoji}</span>
            {selectedGoalData.label}
          </p>
          <p className="text-xs text-muted-foreground italic mb-2">
            {selectedGoalData.tagline}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {getGoalContextMessage(selectedGoal)}
          </p>
        </motion.div>
      )}
    </div>
  );
}
