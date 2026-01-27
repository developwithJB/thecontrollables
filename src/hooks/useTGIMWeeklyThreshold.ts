import { useState, useEffect } from "react";

/**
 * Hook to manage the weekly TGIM (Thank God It's Monday) threshold display.
 * Shows the TGIM microcopy once per calendar week on the first app open.
 * 
 * TGIM is a subtle brand ritual - calm, optional, never pushy.
 */
export function useTGIMWeeklyThreshold(userId?: string) {
  const [showTGIM, setShowTGIM] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Get current week identifier (ISO week number + year)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const weekKey = `${now.getFullYear()}-W${weekNumber}`;
    
    const storageKey = `tgim_shown_${userId}_${weekKey}`;
    
    try {
      const wasShown = localStorage.getItem(storageKey);
      if (!wasShown) {
        // First visit this week - show TGIM
        setShowTGIM(true);
        // Mark as shown for this week
        localStorage.setItem(storageKey, "1");
      }
    } catch {
      // Storage blocked - gracefully degrade
    }
  }, [userId]);

  const dismiss = () => {
    setHasInteracted(true);
    // Fade out after interaction
    setTimeout(() => setShowTGIM(false), 300);
  };

  return {
    showTGIM: showTGIM && !hasInteracted,
    dismiss,
  };
}
