import { motion } from "framer-motion";
import { Camera, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingOrientationProps {
  snapshotName: string;
  snapshotEmoji: string;
  onStartDay1: () => void;
}

export function OnboardingOrientation({
  snapshotName,
  snapshotEmoji,
  onStartDay1,
}: OnboardingOrientationProps) {
  const orientationItems = [
    {
      icon: Camera,
      text: "One Snapshot per week",
      subtext: "A focused lens for 7 days",
    },
    {
      icon: Clock,
      text: "About 5 minutes per day",
      subtext: "Short check-ins that add up",
    },
    {
      icon: Calendar,
      text: "No catching up. Just today.",
      subtext: "Missed days don't matter—returning does",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="max-w-sm w-full text-center">
        {/* Emoji */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="text-5xl mb-6"
        >
          {snapshotEmoji}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl font-semibold text-foreground mb-2"
        >
          Here's how this works
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-sm text-muted-foreground mb-8"
        >
          Your Focus: {snapshotName}
        </motion.p>

        {/* Orientation Items */}
        <div className="space-y-4 mb-10">
          {orientationItems.map((item, index) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border text-left"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{item.text}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.subtext}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button size="lg" onClick={onStartDay1} className="w-full h-14 text-base">
            Start Day 1
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
