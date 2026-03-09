import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Scan, Brain, Zap, AlertTriangle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MOODS = [
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "anxious", emoji: "😰", label: "Anxious" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
  { value: "energized", emoji: "⚡", label: "Energized" },
  { value: "flat", emoji: "😐", label: "Flat" },
  { value: "overwhelmed", emoji: "🌊", label: "Overwhelmed" },
] as const;

const LEVEL_LABELS = ["", "Very Low", "Low", "Moderate", "High", "Very High"];

function getInterpretation(mood: string, energy: number, stress: number): { text: string; icon: React.ElementType; variant: "fear" | "low" | "overload" | "grounded" } {
  if (stress >= 4) return { text: "Mental overload may be building.", icon: AlertTriangle, variant: "overload" };
  if (energy <= 2) return { text: "Low energy detected — consider recharging.", icon: Zap, variant: "low" };
  if (["anxious", "frustrated", "overwhelmed"].includes(mood)) return { text: "You may be running on fear circuits.", icon: Brain, variant: "fear" };
  return { text: "You look steady and grounded.", icon: Heart, variant: "grounded" };
}

const VARIANT_STYLES = {
  fear: "border-red-500/30 bg-red-500/5 text-red-400",
  low: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  overload: "border-orange-500/30 bg-orange-500/5 text-orange-400",
  grounded: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
};

interface NoticeCheckInCardProps {
  userId: string;
  onComplete: (response: string) => void;
}

export const NoticeCheckInCard = ({ userId, onComplete }: NoticeCheckInCardProps) => {
  const [mood, setMood] = useState<string>("");
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [emotion, setEmotion] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof getInterpretation> | null>(null);

  const handleSubmit = async () => {
    if (!mood) return;
    setSaving(true);
    const interpretation = getInterpretation(mood, energy, stress);

    const { error } = await supabase.from("notice_entries" as any).insert({
      user_id: userId,
      mood,
      energy_level: energy,
      stress_level: stress,
      dominant_emotion: emotion || null,
      note: note || null,
      interpretation: interpretation.text,
    } as any);

    if (error) {
      console.error("Failed to save notice entry:", error);
      setSaving(false);
      return;
    }

    setResult(interpretation);
    setTimeout(() => {
      onComplete(`Circuit Check: ${mood} mood, energy ${energy}/5, stress ${stress}/5 — ${interpretation.text}`);
    }, 2000);
  };

  if (result) {
    const Icon = result.icon;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("rounded-lg border p-4 text-center", VARIANT_STYLES[result.variant])}>
        <Icon className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm font-medium">{result.text}</p>
        <p className="text-xs mt-2 opacity-70">Circuit scanned. Ring complete.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Scan className="w-3.5 h-3.5" />
        <span>Scan your internal system</span>
      </div>

      {/* Mood selector */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">What's your current state?</p>
        <div className="grid grid-cols-3 gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs transition-all",
                mood === m.value
                  ? "bg-accent/15 ring-1 ring-accent text-accent"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="text-lg">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy level */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-foreground">Energy</p>
          <span className="text-[10px] text-muted-foreground">{LEVEL_LABELS[energy]}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setEnergy(level)}
              className={cn("flex-1 h-7 rounded transition-all text-[10px]", level <= energy ? "bg-accent text-accent-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground")}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Stress level */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-foreground">Stress</p>
          <span className="text-[10px] text-muted-foreground">{LEVEL_LABELS[stress]}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setStress(level)}
              className={cn("flex-1 h-7 rounded transition-all text-[10px]", level <= stress ? "bg-destructive/70 text-destructive-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground")}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Optional note */}
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What are you noticing right now? (optional)"
        className="min-h-[50px] resize-none text-sm"
      />

      <Button onClick={handleSubmit} disabled={saving || !mood} className="w-full" size="sm">
        {saving ? "Scanning..." : "Run Circuit Check"}
      </Button>
    </div>
  );
};
