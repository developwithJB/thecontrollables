import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Moon, Footprints, Apple, Battery } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface WellnessLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (sleep: number, movement: number, nutrition: number, notes?: string) => Promise<boolean>;
  initialValues?: {
    sleep: number | null;
    movement: number | null;
    nutrition: number | null;
    notes: string | null;
  };
}

const RATING_LABELS = ["Empty", "Low", "Half", "Good", "Full"];

export function WellnessLogger({ isOpen, onClose, onLog, initialValues }: WellnessLoggerProps) {
  const [sleep, setSleep] = useState(initialValues?.sleep || 3);
  const [movement, setMovement] = useState(initialValues?.movement || 3);
  const [nutrition, setNutrition] = useState(initialValues?.nutrition || 3);
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    const success = await onLog(sleep, movement, nutrition, notes || undefined);
    setIsLoading(false);
    if (success) onClose();
  };

  const averageCharge = ((sleep + movement + nutrition) / 3).toFixed(1);

  const RatingSlider = ({
    value,
    onChange,
    icon: Icon,
    label,
    color,
  }: {
    value: number;
    onChange: (v: number) => void;
    icon: React.ElementType;
    label: string;
    color: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", color)} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{RATING_LABELS[value - 1]}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={cn(
              "flex-1 h-8 rounded-md transition-all",
              level <= value ? "bg-accent" : "bg-muted hover:bg-muted/80"
            )}
          />
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md bg-card border rounded-2xl shadow-xl overflow-hidden"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛰️</span>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Battery Check</h3>
                  <p className="text-xs text-muted-foreground">How's your charge today?</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Average Display */}
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/50">
                <Battery className="w-6 h-6 text-accent" />
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-foreground">{averageCharge}/5</p>
                  <p className="text-xs text-muted-foreground">Current Charge</p>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <RatingSlider
                  value={sleep}
                  onChange={setSleep}
                  icon={Moon}
                  label="Sleep"
                  color="text-blue-400"
                />
                <RatingSlider
                  value={movement}
                  onChange={setMovement}
                  icon={Footprints}
                  label="Movement"
                  color="text-green-400"
                />
                <RatingSlider
                  value={nutrition}
                  onChange={setNutrition}
                  icon={Apple}
                  label="Nutrition"
                  color="text-orange-400"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any observations about your energy today..."
                  className="min-h-[60px] resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Logging..." : "Log Battery Level"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
