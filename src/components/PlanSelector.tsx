import { motion } from "framer-motion";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPricing, type PlanType } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface PlanSelectorProps {
  onSelect: (plan: PlanType) => void;
  isLoading?: boolean;
  selectedPlan?: PlanType;
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Plan selection component for monthly vs yearly subscription
 */
export function PlanSelector({
  onSelect,
  isLoading = false,
  selectedPlan,
  variant = "default",
  className = "",
}: PlanSelectorProps) {
  const pricing = getPricing();

  if (variant === "compact") {
    return (
      <div className={cn("flex gap-2", className)}>
        <Button
          onClick={() => onSelect("monthly")}
          disabled={isLoading}
          variant={selectedPlan === "monthly" ? "default" : "outline"}
          size="sm"
          className="flex-1"
        >
          {isLoading && selectedPlan === "monthly" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : null}
          ${pricing.monthly}/mo
        </Button>
        <Button
          onClick={() => onSelect("yearly")}
          disabled={isLoading}
          variant={selectedPlan === "yearly" ? "default" : "outline"}
          size="sm"
          className="flex-1 relative"
        >
          {isLoading && selectedPlan === "yearly" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : null}
          ${pricing.yearly}/yr
          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            Save {pricing.yearlySavingsPercent}%
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Yearly Plan - Recommended */}
      <motion.button
        onClick={() => !isLoading && onSelect("yearly")}
        disabled={isLoading}
        className={cn(
          "w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden",
          selectedPlan === "yearly"
            ? "border-primary bg-primary/5"
            : "border-primary/30 hover:border-primary/60 bg-card"
        )}
        whileTap={{ scale: 0.98 }}
      >
        {/* Recommended badge */}
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Best Value
          </div>
        </div>

        <div className="flex items-start justify-between pr-20">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                selectedPlan === "yearly"
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              )}>
                {selectedPlan === "yearly" && (
                  <Check className="w-3 h-3 text-primary-foreground" />
                )}
              </div>
              <span className="font-semibold text-foreground">Yearly</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              ${pricing.yearlyMonthlyEquivalent}/mo billed annually
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">${pricing.yearly}</p>
            <p className="text-xs text-primary font-medium">
              Save ${pricing.yearlySavingsAmount}/yr
            </p>
          </div>
        </div>

        {isLoading && selectedPlan === "yearly" && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </motion.button>

      {/* Monthly Plan */}
      <motion.button
        onClick={() => !isLoading && onSelect("monthly")}
        disabled={isLoading}
        className={cn(
          "w-full p-4 rounded-xl border-2 text-left transition-all relative",
          selectedPlan === "monthly"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 bg-card"
        )}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                selectedPlan === "monthly"
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              )}>
                {selectedPlan === "monthly" && (
                  <Check className="w-3 h-3 text-primary-foreground" />
                )}
              </div>
              <span className="font-semibold text-foreground">Monthly</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              Billed monthly
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">${pricing.monthly}</p>
            <p className="text-xs text-muted-foreground">/month</p>
          </div>
        </div>

        {isLoading && selectedPlan === "monthly" && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </motion.button>
    </div>
  );
}
