import { motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  pullDistance: number;
}

export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
  pullDistance,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: pullProgress > 0.2 || isRefreshing ? 1 : 0,
        y: isRefreshing ? 0 : -10,
      }}
      className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{ 
        paddingTop: Math.min(pullDistance, 80),
        transition: isRefreshing ? 'padding-top 0.2s ease' : undefined,
      }}
    >
      <motion.div
        className="w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center"
        animate={{
          rotate: isRefreshing ? 360 : pullProgress * 360,
        }}
        transition={{
          rotate: isRefreshing 
            ? { duration: 1, repeat: Infinity, ease: "linear" }
            : { duration: 0 },
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <RefreshCw 
            className="w-5 h-5 text-muted-foreground" 
            style={{ 
              opacity: Math.min(pullProgress * 2, 1),
              transform: `rotate(${pullProgress * 360}deg)`,
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
