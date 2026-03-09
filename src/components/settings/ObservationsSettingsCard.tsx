import { useState } from "react";
import { ChevronDown, ChevronUp, Brain, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Observation, InferredPreference } from "@/hooks/useObservations";

interface ObservationsSettingsCardProps {
  observations: Observation[];
  inferredPreferences: InferredPreference[];
  onDismiss: (id: string) => void;
}

const OBSERVATION_TYPE_LABELS: Record<string, string> = {
  task_slippage: "Task patterns",
  focus_window: "Focus windows",
  sleep_energy_correlation: "Sleep & energy links",
  meal_consistency: "Meal habits",
  planner_trend: "Planning trends",
  promise_followthrough: "Promise integrity",
  season_momentum: "Snapshot momentum",
  money_stress: "Money signals",
  circle_pattern: "Circle patterns",
};

const PREFERENCE_KEY_LABELS: Record<string, string> = {
  best_focus_time: "Best focus time",
  preferred_routine_density: "Routine density",
  low_energy_tendency: "Low energy patterns",
  overload_threshold: "Overload threshold",
  meal_timing_pattern: "Meal timing",
  sleep_recovery_window: "Sleep recovery",
};

export function ObservationsSettingsCard({
  observations,
  inferredPreferences,
  onDismiss,
}: ObservationsSettingsCardProps) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [showObservations, setShowObservations] = useState(false);

  const confirmedObservations = observations.filter((o) => o.status === "confirmed");
  const pendingObservations = observations.filter((o) => o.status === "pending");

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-4 h-4 text-muted-foreground" />
        <Label className="font-medium">What the System Learns</Label>
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed">
        The app learns from your patterns to improve suggestions. All data stays 
        private to your account — nothing is shared or aggregated.
      </p>

      {/* Inferred Preferences */}
      <Collapsible open={showPreferences} onOpenChange={setShowPreferences}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between px-3 h-9 text-sm"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              Learned Preferences ({inferredPreferences.length})
            </span>
            {showPreferences ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {inferredPreferences.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 px-3 py-2">
              No preferences learned yet. Keep using the app normally.
            </p>
          ) : (
            <div className="space-y-2">
              {inferredPreferences.map((pref) => (
                <div
                  key={pref.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 text-xs"
                >
                  <span className="text-muted-foreground">
                    {PREFERENCE_KEY_LABELS[pref.preference_key] || pref.preference_key}
                  </span>
                  <span className="text-foreground font-medium">
                    {formatPreferenceValue(pref.preference_value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Active Observations */}
      <Collapsible open={showObservations} onOpenChange={setShowObservations}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between px-3 h-9 text-sm"
          >
            <span className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              Active Observations ({confirmedObservations.length + pendingObservations.length})
            </span>
            {showObservations ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {confirmedObservations.length === 0 && pendingObservations.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 px-3 py-2">
              No observations yet. The system will learn as you use the app.
            </p>
          ) : (
            <div className="space-y-2">
              {[...confirmedObservations, ...pendingObservations].map((obs) => (
                <div
                  key={obs.id}
                  className="flex items-start justify-between px-3 py-2 rounded-md bg-muted/50 text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-muted-foreground">
                        {OBSERVATION_TYPE_LABELS[obs.observation_type] || obs.observation_type}
                      </span>
                      {obs.status === "confirmed" && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary">
                          Confirmed
                        </span>
                      )}
                    </div>
                    <p className="text-foreground truncate">{obs.title}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDismiss(obs.id)}
                    title="Dismiss this observation"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function formatPreferenceValue(value: Record<string, unknown>): string {
  if (value.window) return String(value.window);
  if (value.time) return String(value.time);
  if (typeof value === "object") {
    const first = Object.values(value)[0];
    return typeof first === "string" || typeof first === "number" ? String(first) : "Set";
  }
  return "Set";
}
