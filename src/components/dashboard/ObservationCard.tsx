import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, TrendingUp, Clock, Heart, Utensils, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Observation } from "@/hooks/useObservations";

interface ObservationCardProps {
  observation: Observation;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  task_slippage: { icon: Clock, color: "text-amber-500" },
  focus_window: { icon: TrendingUp, color: "text-primary" },
  sleep_energy_correlation: { icon: Heart, color: "text-rose-500" },
  meal_consistency: { icon: Utensils, color: "text-emerald-500" },
  planner_trend: { icon: TrendingUp, color: "text-blue-500" },
  promise_followthrough: { icon: Check, color: "text-violet-500" },
  season_momentum: { icon: Lightbulb, color: "text-amber-500" },
  money_stress: { icon: DollarSign, color: "text-red-500" },
  circle_pattern: { icon: Users, color: "text-cyan-500" },
};

export function ObservationCard({ observation, onConfirm, onDismiss }: ObservationCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  const config = TYPE_CONFIG[observation.observation_type] || { icon: Lightbulb, color: "text-muted-foreground" };
  const Icon = config.icon;

  const handleConfirm = () => {
    setIsExiting(true);
    setTimeout(() => onConfirm(observation.id), 200);
  };

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(observation.id), 200);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted/50 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    The system noticed...
                  </p>
                  <h4 className="text-sm font-medium text-foreground mb-1 leading-tight">
                    {observation.title}
                  </h4>
                  {observation.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {observation.description}
                    </p>
                  )}
                  {observation.occurrences > 1 && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Observed {observation.occurrences} times
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={handleConfirm}
                    title="This is accurate"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDismiss}
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ObservationCardsListProps {
  observations: Observation[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  maxDisplay?: number;
}

export function ObservationCardsList({ 
  observations, 
  onConfirm, 
  onDismiss, 
  maxDisplay = 2 
}: ObservationCardsListProps) {
  const displayObservations = observations.slice(0, maxDisplay);

  if (displayObservations.length === 0) return null;

  return (
    <div className="space-y-3">
      {displayObservations.map((obs) => (
        <ObservationCard
          key={obs.id}
          observation={obs}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
