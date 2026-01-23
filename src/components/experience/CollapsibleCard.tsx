import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  /** Icon component to render in header */
  icon: ReactNode;
  /** Title text */
  title: string;
  /** Subtitle text */
  subtitle?: string;
  /** Badge/count to show in header */
  headerBadge?: ReactNode;
  /** Gradient classes for header background */
  headerGradient?: string;
  /** Whether collapsed by default */
  defaultOpen?: boolean;
  /** Children to render inside */
  children: ReactNode;
  /** Additional className for the wrapper */
  className?: string;
}

export function CollapsibleCard({
  icon,
  title,
  subtitle,
  headerBadge,
  headerGradient = "bg-gradient-to-r from-muted/50 to-transparent",
  defaultOpen = false,
  children,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      {/* Clickable Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-4 border-b border-border/50 flex items-center justify-between text-left transition-colors hover:bg-muted/30",
          headerGradient
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-display font-semibold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerBadge}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
