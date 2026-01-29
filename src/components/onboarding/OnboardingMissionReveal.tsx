import { motion } from "framer-motion";
import { Target, Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HierarchyExplainer } from "@/components/dashboard/HierarchyExplainer";

interface OnboardingMissionRevealProps {
  missionTitle: string;
  snapshotName: string;
  snapshotEmoji?: string;
  onContinue: () => void;
}

export function OnboardingMissionReveal({
  missionTitle,
  snapshotName,
  snapshotEmoji = "📸",
  onContinue,
}: OnboardingMissionRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="max-w-sm w-full text-center">
        {/* Mission Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 w-fit"
        >
          <Target className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl font-semibold text-foreground mb-2"
        >
          Your Direction
        </motion.h1>

        {/* Mission Title */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-medium text-primary mb-4"
        >
          "{missionTitle}"
        </motion.p>

        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 mb-8"
        >
          <p className="text-sm text-muted-foreground">
            This is your north star. You live under it — you don't complete it.
          </p>
          
          {/* Connection to Snapshot */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/50">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">guides</span>
            <div className="p-1.5 rounded-lg bg-muted">
              <span className="text-sm">{snapshotEmoji}</span>
            </div>
            <span className="text-xs font-medium text-foreground">{snapshotName}</span>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Your Snapshot serves your Mission. You can change it anytime.
          </p>
        </motion.div>

        {/* Visual Hierarchy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8 p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-xs font-medium text-muted-foreground mb-3">How it works:</p>
          <HierarchyExplainer variant="compact" highlighted="mission" />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button size="lg" onClick={onContinue} className="w-full h-14 text-base">
            Got it — Start Day 1
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
