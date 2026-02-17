import { motion } from "framer-motion";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPricing, type PlanTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface PlanSelectorProps {
  onSelect: (plan: PlanTier) => void;
  isLoading?: boolean;
  selectedPlan?: PlanTier;
  variant?: "default" | "compact";
  className?: string;
}

export function PlanSelector({ onSelect, isLoading = false, selectedPlan, variant = "default", className = "" }: PlanSelectorProps) {
  const pricing = getPricing();

  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <Button onClick={() => onSelect("pro")} disabled={isLoading} variant={selectedPlan === "pro" ? "default" : "outline"} size="sm" className="flex-1">
          {isLoading && selectedPlan === "pro" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
          Pro ${pricing.pro.annual}/yr
        </Button>
        <Button onClick={() => onSelect("plus")} disabled={isLoading} variant={selectedPlan === "plus" ? "default" : "outline"} size="sm" className="flex-1">
          {isLoading && selectedPlan === "plus" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
          Plus ${pricing.plus.annual}/yr
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <motion.button
        onClick={() => !isLoading && onSelect("pro")}
        disabled={isLoading}
        className={cn("w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden", selectedPlan === "pro" ? "border-primary bg-primary/5" : "border-primary/30 hover:border-primary/60 bg-card")}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Recommended
          </div>
        </div>
        <div className="flex items-start justify-between pr-24">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", selectedPlan === "pro" ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                {selectedPlan === "pro" && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="font-semibold text-foreground">Pro</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">${pricing.pro.monthlyEquivalent}/mo billed annually</p>
          </div>
          <p className="text-xl font-bold text-foreground">${pricing.pro.annual}</p>
        </div>
      </motion.button>

      <motion.button
        onClick={() => !isLoading && onSelect("plus")}
        disabled={isLoading}
        className={cn("w-full p-4 rounded-xl border-2 text-left transition-all relative", selectedPlan === "plus" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50 bg-card")}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", selectedPlan === "plus" ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                {selectedPlan === "plus" && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="font-semibold text-foreground">Plus</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">${pricing.plus.monthlyEquivalent}/mo billed annually</p>
          </div>
          <p className="text-xl font-bold text-foreground">${pricing.plus.annual}</p>
        </div>
      </motion.button>
    </div>
  );
}
