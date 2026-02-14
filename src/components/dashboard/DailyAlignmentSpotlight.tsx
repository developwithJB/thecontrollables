import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";

interface DailyAlignmentSpotlightProps {
  userId: string;
  isPaid: boolean;
  nudgeEnabled: boolean;
  onEnable: () => void;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function DailyAlignmentSpotlight({
  userId,
  isPaid,
  nudgeEnabled,
  onEnable,
  onUpgrade,
  onDismiss,
}: DailyAlignmentSpotlightProps) {
  const [visible, setVisible] = useState(false);
  const { trackEvent } = useAnalytics();
  const storageKey = `da_spotlight_dismissed_${userId}`;

  useEffect(() => {
    // Don't show if already enabled or already dismissed
    if (nudgeEnabled) return;
    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {}
    setVisible(true);
    trackEvent("feature_awareness", "da_spotlight_shown");
  }, [nudgeEnabled, storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
    onDismiss();
  };

  const handleEnable = () => {
    trackEvent("feature_activation", "da_spotlight_enable_clicked");
    onEnable();
    setVisible(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  };

  const handleUpgrade = () => {
    trackEvent("feature_conversion", "da_promo_upgrade_clicked", { source: "spotlight" });
    onUpgrade();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="relative rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 to-primary/3 p-5 space-y-3"
      >
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/15">
            <Sun className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">New: Daily Alignment</h3>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
        </div>

        {/* Body */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          A personalized scripture and one clear action, delivered to your inbox each morning. Built from your real progress.
        </p>

        {/* CTA */}
        {isPaid ? (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleEnable} className="text-xs">
              Enable Daily Alignment
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleUpgrade} className="text-xs">
              Upgrade to unlock
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Learn more
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
