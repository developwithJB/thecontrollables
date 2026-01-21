import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isUpdateAvailable, applyUpdate, isStandalonePWA, storeVersion } from "@/lib/version";

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show update prompt for installed PWA users
    if (isStandalonePWA() && isUpdateAvailable()) {
      // Small delay to not interrupt initial load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // For browser users, just update version silently
      storeVersion();
    }
  }, []);

  const handleUpdate = () => {
    applyUpdate();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Still update version to prevent repeated prompts
    storeVersion();
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-card border border-accent/30 rounded-2xl p-4 shadow-lg backdrop-blur-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-accent/20">
                <RefreshCw className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground text-sm">
                  Update Available
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Close and reopen the app for the latest features and improvements.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Update Now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-muted-foreground"
                  >
                    Later
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
