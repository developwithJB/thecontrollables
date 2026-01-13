import { useState } from "react";
import { motion } from "framer-motion";
import { Dna, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserBuild {
  awareness_base: number;
  perspective_base: number;
  habit_base: number;
  wellness_base: number;
  environment_base: number;
  sleep_modifier: number;
  movement_modifier: number;
  inputs_modifier: number;
  environment_modifier: number;
}

interface BuildOverviewModuleProps {
  userBuild: UserBuild | null;
  onUpdateBuild: (build: Partial<UserBuild>) => void;
}

const BASE_STATS = [
  { key: "awareness_base", label: "Awareness", emoji: "🦉" },
  { key: "perspective_base", label: "Perspective", emoji: "🐢" },
  { key: "habit_base", label: "Habit", emoji: "🦈" },
  { key: "wellness_base", label: "Wellness", emoji: "🛰️" },
  { key: "environment_base", label: "Environment", emoji: "🚀" },
] as const;

const MODIFIERS = [
  { key: "sleep_modifier", label: "Sleep", icon: "😴" },
  { key: "movement_modifier", label: "Movement", icon: "🏃" },
  { key: "inputs_modifier", label: "Inputs", icon: "📱" },
  { key: "environment_modifier", label: "Environment", icon: "🏠" },
] as const;

export function BuildOverviewModule({ userBuild, onUpdateBuild }: BuildOverviewModuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localBuild, setLocalBuild] = useState<Partial<UserBuild>>({});

  const currentBuild: UserBuild = {
    awareness_base: userBuild?.awareness_base ?? 5,
    perspective_base: userBuild?.perspective_base ?? 5,
    habit_base: userBuild?.habit_base ?? 5,
    wellness_base: userBuild?.wellness_base ?? 5,
    environment_base: userBuild?.environment_base ?? 5,
    sleep_modifier: userBuild?.sleep_modifier ?? 0,
    movement_modifier: userBuild?.movement_modifier ?? 0,
    inputs_modifier: userBuild?.inputs_modifier ?? 0,
    environment_modifier: userBuild?.environment_modifier ?? 0,
  };

  const editBuild = { ...currentBuild, ...localBuild };

  const handleSave = () => {
    onUpdateBuild(editBuild);
    setIsOpen(false);
    setLocalBuild({});
  };

  // Calculate total effective stats
  const getEffectiveStat = (base: number, modifier: number) => Math.max(1, Math.min(10, base + modifier));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="p-5 rounded-2xl bg-card border shadow-soft"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Dna className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Your Build</h3>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Customize Your Build</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <p className="text-sm text-muted-foreground">
                Any build is viable. Don't fight your natural kit.
              </p>

              {/* Base Stats */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Base Stats (Fixed)</h4>
                <div className="space-y-4">
                  {BASE_STATS.map((stat) => (
                    <div key={stat.key}>
                      <div className="flex justify-between text-sm mb-2">
                        <span>
                          {stat.emoji} {stat.label}
                        </span>
                        <span className="font-medium">{editBuild[stat.key]}</span>
                      </div>
                      <Slider
                        value={[editBuild[stat.key]]}
                        onValueChange={([value]) => setLocalBuild({ ...localBuild, [stat.key]: value })}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Modifiers */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Build Modifiers (Customizable)</h4>
                <div className="space-y-4">
                  {MODIFIERS.map((mod) => (
                    <div key={mod.key}>
                      <div className="flex justify-between text-sm mb-2">
                        <span>
                          {mod.icon} {mod.label}
                        </span>
                        <span className={`font-medium ${editBuild[mod.key] > 0 ? "text-green-600" : editBuild[mod.key] < 0 ? "text-red-500" : ""}`}>
                          {editBuild[mod.key] > 0 ? `+${editBuild[mod.key]}` : editBuild[mod.key]}
                        </span>
                      </div>
                      <Slider
                        value={[editBuild[mod.key] + 5]}
                        onValueChange={([value]) => setLocalBuild({ ...localBuild, [mod.key]: value - 5 })}
                        min={0}
                        max={10}
                        step={1}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                Save Build
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact stat display */}
      <div className="space-y-2">
        {BASE_STATS.map((stat) => {
          const value = currentBuild[stat.key];
          return (
            <div key={stat.key} className="flex items-center gap-2">
              <span className="text-sm w-6">{stat.emoji}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(value / 10) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="h-full bg-primary/60 rounded-full"
                />
              </div>
              <span className="text-xs text-muted-foreground w-4">{value}</span>
            </div>
          );
        })}
      </div>

      {/* Modifiers summary */}
      <div className="mt-4 pt-3 border-t flex gap-2 flex-wrap">
        {MODIFIERS.map((mod) => {
          const value = currentBuild[mod.key];
          if (value === 0) return null;
          return (
            <span
              key={mod.key}
              className={`text-xs px-2 py-1 rounded-full ${
                value > 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"
              }`}
            >
              {mod.icon} {value > 0 ? `+${value}` : value}
            </span>
          );
        })}
        {MODIFIERS.every((mod) => currentBuild[mod.key] === 0) && (
          <span className="text-xs text-muted-foreground">No modifiers active</span>
        )}
      </div>
    </motion.div>
  );
}
