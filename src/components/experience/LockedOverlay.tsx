import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanSelector } from "@/components/PlanSelector";
import { getPricing, type PlanTier } from "@/lib/pricing";
import { CalendarReminderButton } from "@/components/CalendarReminderButton";
import { supabase } from "@/integrations/supabase/client";

interface LockedOverlayProps {
  featureName?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  priceLine?: string;
  onUpgrade?: (plan?: PlanTier) => void;
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
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | undefined>();
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const pricing = getPricing();

  // Fetch user's timezone
  useEffect(() => {
    const fetchTimezone = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", user.id)
          .single();
        if (data?.timezone) {
          setTimezone(data.timezone);
        }
      }
    };
    fetchTimezone();
  }, []);
  
  // Default copy based on variant
  const getDefaultCopy = () => {
    const priceText = `Plus $${pricing.plus.annual}/yr or Pro $${pricing.pro.annual}/yr`;
      
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
          title: "The Controllables",
          description: "Free includes the full 7-Day Snapshot.\n\nThe Controllables unlock with Full Access.",
          buttonText: "Unlock Full Access",
          priceLine: priceText
        };
      default:
        return {
          title: featureName || "Premium Feature",
          description: description || "Unlock your full journey history",
          buttonText: "Upgrade to Unlock",
          priceLine: priceText
        };
    }
  };

  const defaultCopy = getDefaultCopy();
  const displayTitle = title || defaultCopy.title;
  const displayDescription = description || defaultCopy.description;
  const displayPriceLine = priceLine || defaultCopy.priceLine;

  const handlePlanSelect = (plan: PlanTier) => {
    setSelectedPlan(plan);
    if (onUpgrade) {
      onUpgrade(plan);  // This one is correct - we want to pass the plan
    }
  };

  // Only show calendar alternative for ai-companion variant (email nudges related)
  const showCalendarAlternative = variant === "ai-companion";

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
        
        {/* Plan Selector */}
        <PlanSelector
          onSelect={handlePlanSelect}
          isLoading={isLoading}
          selectedPlan={selectedPlan}
          variant="compact"
          className="mb-3"
        />
        
        {/* Price summary */}
        <p className="text-xs text-muted-foreground mb-4">
          {displayPriceLine}
        </p>

        {/* Calendar alternative for free users */}
        {showCalendarAlternative && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">
              Prefer no emails?
            </p>
            <CalendarReminderButton
              source="paywall"
              timezone={timezone}
              compact={true}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
