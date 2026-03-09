import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import type { RingDefinition } from "@/hooks/useDailyRings";
import { cn } from "@/lib/utils";

interface RingActionCardProps {
  definition: RingDefinition;
  onComplete: (response?: string) => void;
  onDismiss: () => void;
}

const BORDER_COLORS: Record<string, string> = {
  awareness: "border-l-[hsl(var(--awareness))]",
  perspective: "border-l-[hsl(var(--perspective))]",
  habit: "border-l-[hsl(var(--habit))]",
  wellness: "border-l-[hsl(var(--wellness))]",
  environment: "border-l-[hsl(var(--environment))]",
};

export const RingActionCard = ({ definition, onComplete, onDismiss }: RingActionCardProps) => {
  const [response, setResponse] = useState("");
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(response.trim() || undefined);
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm p-4 border-l-4",
        BORDER_COLORS[definition.controllable] || "border-l-accent"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{definition.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{definition.name}</h3>
            <p className="text-[11px] text-muted-foreground">{definition.meaning}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-md hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Prompt */}
      <p className="text-xs font-medium text-foreground mb-3">
        {definition.prompt}
      </p>

      {/* Response input */}
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Write your response (optional)..."
        className="min-h-[60px] resize-none text-sm mb-3"
      />

      {/* Complete button */}
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={handleComplete}
          disabled={completing}
          className="w-full gap-2"
          size="sm"
        >
          {completing ? (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            >
              <Check className="w-4 h-4" />
            </motion.div>
          ) : (
            <Check className="w-4 h-4" />
          )}
          {completing ? "Completing..." : `Complete ${definition.name}`}
        </Button>
      </motion.div>
    </div>
  );
};
