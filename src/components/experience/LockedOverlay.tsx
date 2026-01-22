import { motion } from "framer-motion";
import { Lock, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPricing } from "@/lib/pricing";
import { LaunchCountdownBadge } from "@/components/LaunchCountdownBadge";
interface LockedOverlayProps {
  featureName?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  priceLine?: string;
  onUpgrade?: () => void;
  isLoading?: boolean;
  variant?: "default" | "experience-history" | "ai-companion";
}

export function LockedOverlay({ 
  featureName,
  title,
  description,
  buttonText = "Unlock Full Access",
  priceLine,
  onUpgrade,
  isLoading = false,
  variant = "default"
}: LockedOverlayProps) {
  
  const pricing = getPricing();
  
  // Default copy based on variant
  const getDefaultCopy = () => {
    const priceText = pricing.isLaunchPeriod 
      ? `$${pricing.launchAmount} one-time. $${pricing.regularAmount} after March 1.`
      : `$${pricing.regularAmount} one-time purchase.`;
      
    switch (variant) {
      case "experience-history":
        return {
          title: "Your progress deserves memory.",
          description: "You're building momentum right now.\n\nFull access unlocks history, patterns, and proof of growth over time.",
          buttonText: "Unlock Full Access",
          priceLine: priceText
        };
      case "ai-companion":
        return {
          title: "AI Companions",
          description: "Free includes the full 7-Day Reset.\n\nAI Companions unlock with Full Access.",
          buttonText: "Unlock Full Access",
          priceLine: priceText
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
      console.log("Upgrade clicked - no handler provided");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-md bg-background/80 rounded-2xl min-h-[280px]"
      data-testid="locked-overlay"
    >
      <div className="text-center px-6 py-8 max-w-xs">
        {/* Lock icon with subtle glow */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Lock className="w-4 h-4 text-primary/70" />
        </motion.div>
        
        {/* Title */}
        <h3 className="font-display font-semibold text-foreground mb-2 text-base">
          {displayTitle}
        </h3>
        
        {/* Description - preserves line breaks */}
        <p className="text-xs text-muted-foreground mb-4 whitespace-pre-line leading-relaxed">
          {displayDescription}
        </p>
        
        {/* Upgrade CTA */}
        <Button
          onClick={handleUpgradeClick}
          disabled={isLoading}
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="locked-overlay-upgrade-cta"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isLoading ? "Opening checkout..." : displayButtonText}
        </Button>

        {/* Launch countdown badge */}
        <LaunchCountdownBadge variant="compact" className="mt-3" />
        
        {/* Price line - only show if not in launch period (countdown shows price) */}
        {displayPriceLine && !getPricing().isLaunchPeriod && (
          <p className="mt-2 text-xs text-muted-foreground">
            {displayPriceLine}
          </p>
        )}
      </div>
    </motion.div>
  );
}
