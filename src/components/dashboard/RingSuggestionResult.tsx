import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Archive, ArrowLeft, ChevronDown, Share2, Zap } from "lucide-react";
import { RING_DEFINITIONS, type RingKey } from "@/hooks/useDailyRings";
import type { IGProofAnalysis } from "@/hooks/useIGProof";
import { cn } from "@/lib/utils";
import { buildDailyMoveSharePayload } from "@/lib/shareProof";

const RING_BORDER_COLORS: Record<string, string> = {
  notice: "border-[hsl(var(--awareness))]",
  choose: "border-[hsl(var(--perspective))]",
  prove: "border-[hsl(var(--habit))]",
  charge: "border-[hsl(var(--wellness))]",
  align: "border-[hsl(var(--environment))]",
};

const RING_BG_COLORS: Record<string, string> = {
  notice: "bg-awareness-soft",
  choose: "bg-perspective-soft",
  prove: "bg-habit-soft",
  charge: "bg-wellness-soft",
  align: "bg-environment-soft",
};

interface RingSuggestionResultProps {
  analysis: IGProofAnalysis;
  saving: boolean;
  onSave: (ringKey: RingKey, attachToRing: boolean) => Promise<void>;
  onBack: () => void;
  imagePreview?: string | null;
  captionPreview?: string;
  preselectedRing?: RingKey;
}

export const RingSuggestionResult = ({
  analysis,
  saving,
  onSave,
  onBack,
  imagePreview,
  captionPreview,
  preselectedRing,
}: RingSuggestionResultProps) => {
  const [selectedRing, setSelectedRing] = useState<RingKey>(preselectedRing || analysis.primary_ring);
  const [showRingPicker, setShowRingPicker] = useState(false);

  const def = RING_DEFINITIONS.find((d) => d.key === selectedRing)!;
  const proofPayload = buildDailyMoveSharePayload(selectedRing);
  const secondaryDef = analysis.secondary_ring && analysis.secondary_ring !== "none"
    ? RING_DEFINITIONS.find((d) => d.key === analysis.secondary_ring)
    : null;

  return (
    <div className="space-y-3">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3 h-3" />
        Try different content
      </button>

      {/* Preview */}
      {(imagePreview || captionPreview) && (
        <div className="flex gap-2 items-start">
          {imagePreview && (
            <img src={imagePreview} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          )}
          <p className="text-xs text-muted-foreground">Private proof ready.</p>
        </div>
      )}

      {/* Primary ring suggestion */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("dashboard-os-card overflow-hidden rounded-2xl border-2 p-3", RING_BORDER_COLORS[selectedRing], RING_BG_COLORS[selectedRing])}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/70 text-2xl shadow-sm">{def.emoji}</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Charge Proof</p>
              <span className="text-sm font-semibold text-foreground">{def.name}</span>
            </div>
          </div>
          <button
            onClick={() => setShowRingPicker(!showRingPicker)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-background/50 px-2 py-0.5 rounded-full"
          >
            Change <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="rounded-xl border border-primary/15 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Share Card</span>
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="font-display text-base font-semibold text-foreground">{proofPayload.headline}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{proofPayload.proofLine}</p>
          {proofPayload.xpLabel ? (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              <Zap className="h-3 w-3" />
              {proofPayload.xpLabel}
            </span>
          ) : null}
        </div>
      </motion.div>

      {/* Ring picker dropdown */}
      {showRingPicker && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-1.5 flex-wrap">
          {RING_DEFINITIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => { setSelectedRing(d.key); setShowRingPicker(false); }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border",
                selectedRing === d.key
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              <span>{d.emoji}</span>
              <span>{d.name}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Secondary ring */}
      {secondaryDef && secondaryDef.key !== selectedRing && (
        <p className="text-[10px] text-muted-foreground">
          Also relates to {secondaryDef.emoji} {secondaryDef.name}
        </p>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={() => onSave(selectedRing, true)}
            disabled={saving}
            className="dashboard-primary-glow flex-1 gap-1.5"
            size="sm"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? "Saving..." : `Charge ${def.shortName}`}
          </Button>
          <Button
            onClick={() => onSave(selectedRing, false)}
            disabled={saving}
            variant="outline"
            className="flex-1 gap-1.5"
            size="sm"
          >
            <Archive className="w-3.5 h-3.5" />
            Save Proof
          </Button>
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <p className="flex-1 text-center">Adds charge progress</p>
          <p className="flex-1 text-center">Keeps it private</p>
        </div>
      </div>
    </div>
  );
};
