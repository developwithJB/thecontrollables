import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { GoalType, WellnessGoal, getGoalMeta, getGoalDefault } from "@/hooks/useWellnessGoals";

interface SetGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGoals: WellnessGoal[];
  onSave: (goals: { goalType: GoalType; targetValue: number }[]) => Promise<void>;
  isUpdating: boolean;
}

const PRESETS = {
  starter: {
    label: "Starter",
    description: "Easy targets to build momentum",
    goals: {
      sleep_hours: 7,
      active_minutes: 15,
      strain_score: 6,
      recovery_score: 50,
      sleep_rating: 3,
      movement_rating: 3,
      nutrition_rating: 3,
    },
  },
  active: {
    label: "Active",
    description: "Balanced targets for consistent improvement",
    goals: {
      sleep_hours: 8,
      active_minutes: 30,
      strain_score: 10,
      recovery_score: 70,
      sleep_rating: 4,
      movement_rating: 4,
      nutrition_rating: 4,
    },
  },
  advanced: {
    label: "Advanced",
    description: "High targets for peak performance",
    goals: {
      sleep_hours: 8,
      active_minutes: 60,
      strain_score: 14,
      recovery_score: 80,
      sleep_rating: 5,
      movement_rating: 5,
      nutrition_rating: 5,
    },
  },
};

const ALL_GOAL_TYPES: GoalType[] = [
  "sleep_hours",
  "active_minutes",
  "strain_score",
  "recovery_score",
  "sleep_rating",
  "movement_rating",
  "nutrition_rating",
];

type GoalMap = Record<(typeof ALL_GOAL_TYPES)[number], number>;

export function SetGoalsDialog({
  open,
  onOpenChange,
  existingGoals,
  onSave,
  isUpdating,
}: SetGoalsDialogProps) {
  const [localGoals, setLocalGoals] = useState<GoalMap>(() => buildDefaults());

  function buildDefaults(): GoalMap {
    const m = {} as GoalMap;
    ALL_GOAL_TYPES.forEach((gt) => {
      m[gt] = getGoalDefault(gt);
    });
    return m;
  }

  // Initialize from existing goals
  useEffect(() => {
    const initial = buildDefaults();
    existingGoals.forEach((g) => {
      if (ALL_GOAL_TYPES.includes(g.goal_type as GoalType)) {
        initial[g.goal_type as GoalType] = g.target_value;
      }
    });
    setLocalGoals(initial);
  }, [existingGoals, open]);

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    setLocalGoals(preset.goals as GoalMap);
  };

  const handleSave = async () => {
    const goalsToSave = ALL_GOAL_TYPES.map((gt) => ({
      goalType: gt,
      targetValue: localGoals[gt],
    }));
    await onSave(goalsToSave);
    onOpenChange(false);
  };

  const sliderConfig: Record<string, { min: number; max: number; step: number; suffix: string }> = {
    sleep_hours: { min: 5, max: 10, step: 0.5, suffix: "h" },
    active_minutes: { min: 10, max: 120, step: 5, suffix: " min" },
    strain_score: { min: 2, max: 21, step: 1, suffix: "/21" },
    recovery_score: { min: 30, max: 100, step: 5, suffix: "%" },
    sleep_rating: { min: 1, max: 5, step: 1, suffix: "/5" },
    movement_rating: { min: 1, max: 5, step: 1, suffix: "/5" },
    nutrition_rating: { min: 1, max: 5, step: 1, suffix: "/5" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Your Goals</DialogTitle>
          <DialogDescription>
            Set daily targets to track your wellness progress
          </DialogDescription>
        </DialogHeader>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <Badge
              key={key}
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => applyPreset(key as keyof typeof PRESETS)}
            >
              {preset.label}
            </Badge>
          ))}
        </div>

        {/* Goal inputs */}
        <div className="space-y-5 mt-4">
          {ALL_GOAL_TYPES.map((gt) => {
            const meta = getGoalMeta(gt);
            const config = sliderConfig[gt];
            return (
              <div key={gt} className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">
                    {meta.icon} {meta.label}
                  </Label>
                  <span className="text-sm font-medium text-muted-foreground">
                    {gt === "sleep_hours" ? localGoals[gt] : Math.round(localGoals[gt])}
                    {config.suffix}
                  </span>
                </div>
                <Slider
                  value={[localGoals[gt]]}
                  onValueChange={([v]) => setLocalGoals((prev) => ({ ...prev, [gt]: v }))}
                  min={config.min}
                  max={config.max}
                  step={config.step}
                />
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Goals"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}