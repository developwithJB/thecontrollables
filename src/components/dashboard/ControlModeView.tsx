import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ControlModeViewProps {
  children: ReactNode;
}

/**
 * Wraps the existing dashboard module layout.
 * This is the "Take Control" view — full scrollable modules.
 */
export const ControlModeView = ({ children }: ControlModeViewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
};
