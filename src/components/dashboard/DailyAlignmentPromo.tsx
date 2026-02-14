import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalytics } from "@/hooks/useAnalytics";

interface DailyAlignmentPromoProps {
  onUpgrade: () => void;
}

export function DailyAlignmentPromo({ onUpgrade }: DailyAlignmentPromoProps) {
  const [showSample, setShowSample] = useState(false);
  const { trackEvent } = useAnalytics();

  const toggleSample = () => {
    if (!showSample) {
      trackEvent("feature_awareness", "da_promo_sample_expanded");
    }
    setShowSample(!showSample);
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Daily Alignment™
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Personalized scripture. Real-time growth reflection. One clear action per day. Built from your actual life.
          </p>
        </div>
      </div>

      {/* Sample preview toggle */}
      <button
        onClick={toggleSample}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors w-full"
      >
        {showSample ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showSample ? "Hide sample" : "See a sample"}
      </button>

      {/* Sample preview */}
      <AnimatePresence>
        {showSample && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-md border border-border/50 bg-background p-3 space-y-2.5 text-xs">
              <div className="text-muted-foreground italic">
                📖 "Be still, and know that I am God." — Psalm 46:10
              </div>
              <div className="text-foreground leading-relaxed">
                <span className="font-medium">Reflection:</span> Stillness isn't inaction — it's the discipline of trust. Today, your awareness grows not by doing more, but by noticing what's already true.
              </div>
              <div className="text-foreground">
                <span className="font-medium">Micro Action:</span> Before your first task, take 60 seconds of stillness. No phone. Just breathe.
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Evening Prompt:</span> Where did you notice stillness creating clarity today?
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10"
        onClick={() => {
          trackEvent("feature_conversion", "da_promo_upgrade_clicked", { source: "promo_card" });
          onUpgrade();
        }}
      >
        Upgrade to Premium
      </Button>
    </div>
  );
}
