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
import { Input } from "@/components/ui/input";
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
      steps: 6000,
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
      steps: 10000,
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
      steps: 12000,
      sleep_rating: 5,
      movement_rating: 5,
      nutrition_rating: 5,
    },
  },
};

const ALL_GOAL_TYPES: GoalType[] = [
  "sleep_hours",
  "steps",
  "sleep_rating",
  "movement_rating",
  "nutrition_rating",
];

export function SetGoalsDialog({
  open,
  onOpenChange,
  existingGoals,
  onSave,
  isUpdating,
}: SetGoalsDialogProps) {
  const [localGoals, setLocalGoals] = useState<Record<GoalType, number>>({
    sleep_hours: 8,
    steps: 10000,
    sleep_rating: 4,
    movement_rating: 4,
    nutrition_rating: 4,
  });

  // Initialize from existing goals
  useEffect(() => {
    const initial: Record<GoalType, number> = {
      sleep_hours: getGoalDefault("sleep_hours"),
      steps: getGoalDefault("steps"),
      sleep_rating: getGoalDefault("sleep_rating"),
      movement_rating: getGoalDefault("movement_rating"),
      nutrition_rating: getGoalDefault("nutrition_rating"),
    };
    existingGoals.forEach((g) => {
      initial[g.goal_type as GoalType] = g.target_value;
    });
    setLocalGoals(initial);
  }, [existingGoals, open]);

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    setLocalGoals(preset.goals as Record<GoalType, number>);
  };

  const handleSave = async () => {
    const goalsToSave = ALL_GOAL_TYPES.map((gt) => ({
      goalType: gt,
      targetValue: localGoals[gt],
    }));
    await onSave(goalsToSave);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
          {/* Sleep Hours */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">
                {getGoalMeta("sleep_hours").icon} Sleep Hours
              </Label>
              <span className="text-sm font-medium text-muted-foreground">
                {localGoals.sleep_hours}h
              </span>
            </div>
            <Slider
              value={[localGoals.sleep_hours]}
              onValueChange={([v]) => setLocalGoals((prev) => ({ ...prev, sleep_hours: v }))}
              min={5}
              max={10}
              step={0.5}
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">
                {getGoalMeta("steps").icon} Daily Steps
              </Label>
              <span className="text-sm font-medium text-muted-foreground">
                {localGoals.steps.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[localGoals.steps]}
              onValueChange={([v]) => setLocalGoals((prev) => ({ ...prev, steps: v }))}
              min={3000}
              max={20000}
              step={500}
            />
          </div>

          {/* Sleep Rating */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">
                {getGoalMeta("sleep_rating").icon} Sleep Quality
              </Label>
              <span className="text-sm font-medium text-muted-foreground">
                {localGoals.sleep_rating}/5
              </span>
            </div>
            <Slider
              value={[localGoals.sleep_rating]}
              onValueChange={([v]) => setLocalGoals((prev) => ({ ...prev, sleep_rating: v }))}
              min={1}
              max={5}
              step={1}
            />
          </div>

          {/* Movement Rating */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">
                {getGoalMeta("movement_rating").icon} Movement
              </Label>
              <span className="text-sm font-medium text-muted-foreground">
                {localGoals.movement_rating}/5
              </span>
            </div>
            <Slider
              value={[localGoals.movement_rating]}
              onValueChange={([v]) => setLocalGoals((prev) => ({ ...prev, movement_rating: v }))}
              min={1}
              max={5}
              step={1}
            />
          </div>

          {/* Nutrition Rating */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">
                {getGoalMeta("nutrition_rating").icon} Nutrition
              </Label>
              <span className="text-sm font-medium text-muted-foreground">
                {localGoals.nutrition_rating}/5
              </span>
            </div>
            <Slider
              value={[localGoals.nutrition_rating]}
              onValueChange={([v]) => setLocalGoals((prev) => ({ ...prev, nutrition_rating: v }))}
              min={1}
              max={5}
              step={1}
            />
          </div>
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
