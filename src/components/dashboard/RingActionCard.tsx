import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import type { RingDefinition, RingKey } from "@/hooks/useDailyRings";
import { cn } from "@/lib/utils";
import { NoticeCheckInCard } from "./NoticeCheckInCard";
import { ReframeStudioCard } from "./ReframeStudioCard";
import { ProofActionCard } from "./ProofActionCard";
import { RechargeEngineCard } from "./RechargeEngineCard";
import { EnvironmentResetCard } from "./EnvironmentResetCard";

interface RingActionCardProps {
  definition: RingDefinition;
  onComplete: (response?: string) => void;
  onDismiss: () => void;
  userId?: string;
  lowEnergy?: boolean;
}

const BORDER_COLORS: Record<string, string> = {
  awareness: "border-l-[hsl(var(--awareness))]",
  perspective: "border-l-[hsl(var(--perspective))]",
  habit: "border-l-[hsl(var(--habit))]",
  wellness: "border-l-[hsl(var(--wellness))]",
  environment: "border-l-[hsl(var(--environment))]",
};

function getEmbeddedTool(
  key: RingKey,
  userId: string | undefined,
  onComplete: (response: string) => void,
  lowEnergy?: boolean
) {
  if (!userId) return null;
  switch (key) {
    case "notice": return <NoticeCheckInCard userId={userId} onComplete={onComplete} />;
    case "choose": return <ReframeStudioCard userId={userId} onComplete={onComplete} />;
    case "prove": return <ProofActionCard userId={userId} onComplete={onComplete} />;
    case "charge": return <RechargeEngineCard userId={userId} onComplete={onComplete} lowEnergy={lowEnergy} />;
    case "align": return <EnvironmentResetCard userId={userId} onComplete={onComplete} />;
    default: return null;
  }
}

export const RingActionCard = (props: RingActionCardProps) => {
  const { definition, onComplete, onDismiss, userId, lowEnergy } = props;
  const [response, setResponse] = useState("");
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(response.trim() || undefined);
  };

  const handleToolComplete = async (toolResponse: string) => {
    setCompleting(true);
    await onComplete(toolResponse);
  };

  const embeddedTool = getEmbeddedTool(definition.key, userId, handleToolComplete, lowEnergy);

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

      {/* Embedded tool OR fallback text input */}
      {embeddedTool ? (
        embeddedTool
      ) : (
        <>
          <p className="text-xs font-medium text-foreground mb-3">{definition.prompt}</p>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your response (optional)..."
            className="min-h-[60px] resize-none text-sm mb-3"
          />
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button onClick={handleComplete} disabled={completing} className="w-full gap-2" size="sm">
              {completing ? (
                <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}>
                  <Check className="w-4 h-4" />
                </motion.div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              {completing ? "Completing..." : `Complete ${definition.name}`}
            </Button>
          </motion.div>
        </>
      )}
    </div>
  );
};
