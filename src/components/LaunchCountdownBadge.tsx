import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { getPricing } from "@/lib/pricing";

interface LaunchCountdownBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Displays a countdown badge for the launch pricing period
 * Only renders when we're in the launch period
 */
export function LaunchCountdownBadge({ 
  variant = "compact",
  className = "" 
}: LaunchCountdownBadgeProps) {
  const pricing = getPricing();
  
  // Don't show if not in launch period
  if (!pricing.isLaunchPeriod) {
    return null;
  }
  
  // Calculate days remaining
  const now = new Date();
  const endDate = pricing.launchEndDate;
  const diffTime = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Don't show negative days
  if (daysRemaining <= 0) {
    return null;
  }
  
  // Format the display
  const dayText = daysRemaining === 1 ? "day" : "days";
  
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 ${className}`}
      >
        <Zap className="w-3 h-3 text-primary fill-primary" />
        <span className="text-xs font-medium text-primary">
          {daysRemaining} {dayText} left at ${pricing.launchAmount}
        </span>
      </motion.div>
    );
  }
  
  // Full variant with more details
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Launch pricing ends soon
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{daysRemaining} {dayText}</span> remaining at ${pricing.launchAmount} 
          <span className="text-muted-foreground/70"> (then ${pricing.regularAmount})</span>
        </p>
      </div>
    </motion.div>
  );
}
