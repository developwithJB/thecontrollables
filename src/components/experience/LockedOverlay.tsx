import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedOverlayProps {
  featureName?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  priceLine?: string;
  onUpgrade?: () => void;
  variant?: "default" | "experience-history" | "ai-companion";
}

// Check if we're in launch month (before March 1, 2025)
const isLaunchMonth = () => {
  const now = new Date();
  return now < new Date("2025-03-01");
};

export function LockedOverlay({ 
  featureName,
  title,
  description,
  buttonText = "Unlock Full Access",
  priceLine,
  onUpgrade,
  variant = "default"
}: LockedOverlayProps) {
  
  // Default copy based on variant
  const getDefaultCopy = () => {
    switch (variant) {
      case "experience-history":
        return {
          title: "Your progress deserves memory.",
          description: "You're building momentum right now.\n\nFull access unlocks history, patterns, and proof of growth over time.",
          buttonText: "Unlock Full Access",
          priceLine: isLaunchMonth() 
            ? "$29 one-time. $49 after March 1." 
            : "$49 one-time purchase."
        };
      case "ai-companion":
        return {
          title: "AI Companions",
          description: "Free includes the full 7-Day Reset.\n\nAI Companions unlock with Full Access.",
          buttonText: "Unlock Full Access",
          priceLine: isLaunchMonth() 
            ? "$29 one-time. $49 after March 1." 
            : "$49 one-time purchase."
        };
      default:
        return {
          title: featureName || "Premium Feature",
          description: description || "Unlock your full journey history",
          buttonText: "Upgrade to Unlock",
          priceLine: undefined
        };
    }
  };

  const defaultCopy = getDefaultCopy();
  const displayTitle = title || defaultCopy.title;
  const displayDescription = description || defaultCopy.description;
  const displayButtonText = buttonText || defaultCopy.buttonText;
  const displayPriceLine = priceLine || defaultCopy.priceLine;

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: open upgrade modal or navigate to pricing
      console.log("Upgrade clicked");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-md bg-background/70 rounded-2xl"
    >
      <div className="text-center p-6 max-w-xs">
        {/* Lock icon with subtle glow */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Lock className="w-5 h-5 text-primary/70" />
        </motion.div>
        
        {/* Title */}
        <h3 className="font-display font-semibold text-foreground mb-3 text-lg">
          {displayTitle}
        </h3>
        
        {/* Description - preserves line breaks */}
        <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line leading-relaxed">
          {displayDescription}
        </p>
        
        {/* Upgrade CTA */}
        <Button
          onClick={handleUpgradeClick}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Sparkles className="w-4 h-4" />
          {displayButtonText}
        </Button>

        {/* Price line */}
        {displayPriceLine && (
          <p className="mt-3 text-xs text-muted-foreground">
            {displayPriceLine}
          </p>
        )}
      </div>
    </motion.div>
  );
}
