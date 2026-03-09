import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, TrendingUp, Zap, Moon, Utensils, Calendar, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Prediction } from "@/hooks/usePredictions";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  today_drift: AlertTriangle,
  weekly_completion: TrendingUp,
  burnout_risk: Zap,
  recovery_need: Moon,
  focus_opportunity: Target,
  nutrition_slump: Utensils,
  planner_overload: Calendar,
  financial_pressure: DollarSign,
};

const URGENCY_STYLES: Record<string, string> = {
  high: "border-destructive/30 bg-destructive/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-primary/20 bg-primary/5",
};

interface PredictionCardProps {
  prediction: Prediction;
  onInterventionTaken?: (id: string) => void;
  compact?: boolean;
}

export function PredictionCard({ prediction, onInterventionTaken, compact = false }: PredictionCardProps) {
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[prediction.prediction_type] || TrendingUp;
  const urgencyStyle = URGENCY_STYLES[prediction.urgency] || URGENCY_STYLES.low;

  const handleIntervention = () => {
    onInterventionTaken?.(prediction.id);
    if (prediction.intervention_deep_link) {
      navigate(prediction.intervention_deep_link);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${urgencyStyle}`}>
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {prediction.explanation || prediction.forecast}
          </p>
        </div>
        {prediction.recommended_intervention && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-shrink-0"
            onClick={handleIntervention}
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`border ${urgencyStyle}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">
                {prediction.explanation || prediction.forecast}
              </p>
              {prediction.reasons && prediction.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(prediction.reasons as string[]).slice(0, 2).map((reason, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
              {prediction.recommended_intervention && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={handleIntervention}
                >
                  {prediction.recommended_intervention.length > 40
                    ? prediction.recommended_intervention.slice(0, 40) + "..."
                    : prediction.recommended_intervention}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            <div className="flex-shrink-0">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                prediction.urgency === "high" 
                  ? "bg-destructive/20 text-destructive" 
                  : prediction.urgency === "medium"
                  ? "bg-amber-500/20 text-amber-600"
                  : "bg-primary/20 text-primary"
              }`}>
                {Math.round(prediction.confidence * 100)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PredictionListProps {
  predictions: Prediction[];
  onInterventionTaken?: (id: string) => void;
  maxDisplay?: number;
  compact?: boolean;
}

export function PredictionList({ predictions, onInterventionTaken, maxDisplay = 3, compact = false }: PredictionListProps) {
  const display = predictions.slice(0, maxDisplay);
  if (display.length === 0) return null;

  return (
    <div className="space-y-2">
      {display.map((pred) => (
        <PredictionCard
          key={pred.id}
          prediction={pred}
          onInterventionTaken={onInterventionTaken}
          compact={compact}
        />
      ))}
    </div>
  );
}
