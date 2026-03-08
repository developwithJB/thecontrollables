import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { BuildScore } from "@/lib/build";

interface OnboardingMeetGuidesProps {
  buildResult: BuildScore | null;
  onContinue: () => void;
}

const GUIDES = [
  { key: "awareness", emoji: "🦉", name: "Awareness", tagline: "See clearly before you act", description: "Helps you observe your thoughts and reactions without getting swept away." },
  { key: "perspective", emoji: "🐢", name: "Perspective", tagline: "Zoom out. See the bigger picture", description: "Reframes situations so urgency doesn't override wisdom." },
  { key: "habit", emoji: "🦈", name: "Habit", tagline: "Reps beat motivation", description: "Cuts through excuses and points to the next smallest action." },
  { key: "wellness", emoji: "🛰️", name: "Wellness", tagline: "Check your systems", description: "Monitors sleep, movement, and fuel — the basics that power everything." },
  { key: "environment", emoji: "🚀", name: "Environment", tagline: "Design > discipline", description: "Redesigns your surroundings so the right choice becomes the easy choice." },
];

export function OnboardingMeetGuides({ buildResult, onContinue }: OnboardingMeetGuidesProps) {
  // Find strongest and weakest from build scores
  let strongestKey = "";
  let weakestKey = "";

  if (buildResult) {
    const scores = [
      { key: "awareness", value: Number(buildResult.awareness) },
      { key: "perspective", value: Number(buildResult.perspective) },
      { key: "habit", value: Number(buildResult.habit) },
      { key: "wellness", value: Number(buildResult.wellness) },
      { key: "environment", value: Number(buildResult.environment) },
    ];
    strongestKey = scores.reduce((a, b) => (a.value > b.value ? a : b)).key;
    weakestKey = scores.reduce((a, b) => (a.value < b.value ? a : b)).key;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="max-w-sm w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
            Meet The Controllables
          </h1>
          <p className="text-sm text-muted-foreground">
            They'll coach you through each day of your Snapshot.
          </p>
        </motion.div>

        {/* Guide cards */}
        <div className="space-y-3 mb-10">
          {GUIDES.map((guide, index) => {
            const isStrongest = guide.key === strongestKey;
            const isWeakest = guide.key === weakestKey;

            return (
              <motion.div
                key={guide.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.08 }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isWeakest
                    ? "border-primary bg-primary/5"
                    : isStrongest
                    ? "border-accent/40 bg-accent/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{guide.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{guide.name}</p>
                      {isWeakest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Focus area
                        </span>
                      )}
                      {isStrongest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          Strength
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {guide.tagline}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Button size="lg" onClick={onContinue} className="w-full h-14 text-base">
            Pick Your Snapshot
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
