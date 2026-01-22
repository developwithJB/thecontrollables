import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    // Force refresh all data and re-check connectivity
    try {
      // Clear service worker cache if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force page reload to refresh all state
      window.location.reload();
    } catch (error) {
      console.error("Refresh failed:", error);
      setIsRefreshing(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shadow-lg"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="text-center">You're offline</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 px-3 text-xs bg-destructive-foreground/20 hover:bg-destructive-foreground/30 text-destructive-foreground border-0"
          >
            {isRefreshing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
