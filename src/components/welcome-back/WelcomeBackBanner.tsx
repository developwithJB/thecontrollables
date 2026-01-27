import { motion } from "framer-motion";

/**
 * Welcome Back Banner
 * 
 * Temporary one-line banner visible only on first day back.
 * 
 * Copy: "Coming back counts."
 * 
 * Rules:
 * - No dismiss button required
 * - Automatically disappears after first completed action or next day
 */
export function WelcomeBackBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 px-4 py-3 rounded-lg bg-muted/50 border border-border/50 text-center"
    >
      <p className="text-sm text-muted-foreground">
        Coming back counts.
      </p>
    </motion.div>
  );
}
