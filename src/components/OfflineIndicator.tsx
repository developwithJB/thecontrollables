import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
        >
          <WifiOff className="w-4 h-4" />
          <span>You're offline. Some features may not work.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
