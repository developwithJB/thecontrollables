import { useState } from "react";
import { Plus, UtensilsCrossed, Footprints, Moon, Droplets, X, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PlannerFabProps {
  onAddTask: () => void;
  onQuickAdd: () => void;
}

export const PlannerFab = ({ onAddTask, onQuickAdd }: PlannerFabProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-2">
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.8 }} transition={{ delay: 0.05 }}>
              <Button
                onClick={() => { onQuickAdd(); setExpanded(false); }}
                size="sm"
                variant="outline"
                className="rounded-full gap-2 shadow-lg bg-card border-border"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" /> Quick Log
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.8 }}>
              <Button
                onClick={() => { onAddTask(); setExpanded(false); }}
                size="sm"
                variant="outline"
                className="rounded-full gap-2 shadow-lg bg-card border-border"
              >
                <ListPlus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setExpanded(!expanded)}
        variant="glow"
        size="icon"
        className="h-14 w-14 rounded-full"
      >
        <motion.div animate={{ rotate: expanded ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="h-6 w-6" />
        </motion.div>
      </Button>
    </div>
  );
};
