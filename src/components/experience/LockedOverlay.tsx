import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedOverlayProps {
  featureName: string;
  description?: string;
  onUpgrade?: () => void;
}

export function LockedOverlay({ 
  featureName, 
  description = "Unlock your full journey history",
  onUpgrade 
}: LockedOverlayProps) {
  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: open upgrade modal or navigate to pricing
      // For now, show a toast or log
      console.log("Upgrade clicked for:", featureName);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-md bg-background/60 rounded-2xl"
    >
      <div className="text-center p-6 max-w-xs">
        {/* Lock icon with glow */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(102,189,239,0.3)]"
        >
          <Lock className="w-6 h-6 text-primary" />
        </motion.div>
        
        {/* Title */}
        <h3 className="font-display font-semibold text-foreground mb-2">
          {featureName}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">
          {description}
        </p>
        
        {/* Upgrade CTA */}
        <Button
          onClick={handleUpgradeClick}
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_15px_rgba(102,189,239,0.3)]"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Unlock
        </Button>
      </div>
    </motion.div>
  );
}
