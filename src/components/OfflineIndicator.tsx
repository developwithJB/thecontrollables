import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Loader2, Signal } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  // Detect slow connections using Network Information API
  useEffect(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      const updateConnection = () => {
        const isSlow = connection.effectiveType === "slow-2g" || 
                       connection.effectiveType === "2g" ||
                       (connection.downlink && connection.downlink < 0.5);
        setIsSlowConnection(isSlow);
        
        // Show warning for slow connections, but allow dismissal
        if (isSlow) {
          setShowSlowWarning(true);
          // Auto-dismiss after 5 seconds
          setTimeout(() => setShowSlowWarning(false), 5000);
        }
      };
      
      connection.addEventListener("change", updateConnection);
      updateConnection();
      
      return () => {
        connection.removeEventListener("change", updateConnection);
      };
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    // Force refresh all data and re-check connectivity
    try {
      // Clear service worker cache if available
      if ("caches" in window) {
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

  const dismissSlowWarning = useCallback(() => {
    setShowSlowWarning(false);
  }, []);

  return (
    <AnimatePresence>
      {/* Offline indicator - highest priority */}
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

      {/* Slow connection warning - only show when online */}
      {isOnline && showSlowWarning && isSlowConnection && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[99] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg"
        >
          <Signal className="w-4 h-4 shrink-0" />
          <span className="text-center">Slow connection detected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissSlowWarning}
            className="h-6 px-2 text-xs hover:bg-amber-600/20 text-amber-950"
          >
            Dismiss
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
