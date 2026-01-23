import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

interface OnboardingJourneySelectionProps {
  lowestControllable: string | null;
  onSelect: (controllable: string) => void;
}

const JOURNEYS = [
  {
    id: "awareness",
    name: "Awareness",
    emoji: "🦉",
    tagline: "See clearly",
    description: "Learn to notice your patterns without judgment. Build the foundation of self-understanding.",
    color: "from-blue-500/20 to-indigo-500/20",
  },
  {
    id: "perspective",
    name: "Perspective",
    emoji: "🐢",
    tagline: "Widen the view",
    description: "Shift from reactive to intentional. Find gratitude and reframe challenges.",
    color: "from-green-500/20 to-teal-500/20",
  },
  {
    id: "habit",
    name: "Habit",
    emoji: "🦈",
    tagline: "Keep moving",
    description: "Build momentum through small, consistent actions. One rep at a time.",
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    id: "wellness",
    name: "Wellness",
    emoji: "🛰️",
    tagline: "Fuel the system",
    description: "Optimize sleep, movement, and nutrition. Your body is your vehicle.",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    id: "environment",
    name: "Environment",
    emoji: "🚀",
    tagline: "Shape your world",
    description: "Design your surroundings and relationships for success. Remove friction.",
    color: "from-orange-500/20 to-red-500/20",
  },
];

export function OnboardingJourneySelection({
  lowestControllable,
  onSelect,
}: OnboardingJourneySelectionProps) {
  const [selected, setSelected] = useState<string | null>(lowestControllable);

  const handleSelect = (id: string) => {
    setSelected(id);
  };

  const handleContinue = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  // Reorder journeys to show recommended first
  const orderedJourneys = [...JOURNEYS].sort((a, b) => {
    if (a.id === lowestControllable) return -1;
    if (b.id === lowestControllable) return 1;
    return 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-6 py-12"
    >
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-sm text-muted-foreground mb-1">
            Choose your focus
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Start Your Journey
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Select the area you want to strengthen during your 7-Day Reset
          </p>
        </motion.div>

        {/* Journey options */}
        <div className="space-y-3 flex-1">
          {orderedJourneys.map((journey, index) => {
            const isSelected = selected === journey.id;
            const isRecommended = journey.id === lowestControllable;

            return (
              <motion.button
                key={journey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                onClick={() => handleSelect(journey.id)}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-[0_0_16px_rgba(102,189,239,0.2)]"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${journey.color} flex items-center justify-center text-2xl shrink-0`}>
                    {journey.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {journey.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        — {journey.tagline}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {journey.description}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-6"
        >
          <Button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full h-14 text-lg"
          >
            Begin 7-Day Reset
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Your journey includes daily readings, reflections, and simple actions
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
