import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Compass, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ACTION_TYPES = [
  { value: "clean_space", label: "Clean / organize a space", emoji: "🧹" },
  { value: "reduce_distraction", label: "Reduce a distraction", emoji: "🔕" },
  { value: "set_boundary", label: "Set a boundary", emoji: "🛡️" },
  { value: "reconnect_person", label: "Reconnect with someone uplifting", emoji: "🤝" },
  { value: "remove_drain", label: "Remove a draining input", emoji: "🚫" },
] as const;

const CATEGORIES = [
  { value: "physical_space", label: "Physical Space" },
  { value: "people", label: "People" },
  { value: "digital", label: "Digital" },
  { value: "schedule", label: "Schedule" },
  { value: "boundaries", label: "Boundaries" },
] as const;

interface EnvironmentResetCardProps {
  userId: string;
  onComplete: (response: string) => void;
}

export const EnvironmentResetCard = ({ userId, onComplete }: EnvironmentResetCardProps) => {
  const [actionType, setActionType] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [energizing, setEnergizing] = useState("");
  const [draining, setDraining] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!actionType || !category) return;
    setSaving(true);

    const { error } = await supabase.from("environment_resets" as any).insert({
      user_id: userId,
      action_type: actionType,
      category,
      note: note || null,
      energizing: energizing || null,
      draining: draining || null,
    } as any);

    if (error) { console.error(error); setSaving(false); return; }
    setDone(true);
    const actionLabel = ACTION_TYPES.find((a) => a.value === actionType)?.label || actionType;
    setTimeout(() => {
      onComplete(`Aligned: ${actionLabel} (${category.replace("_", " ")})`);
    }, 1500);
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3 space-y-2">
        <Sparkles className="w-6 h-6 text-accent mx-auto" />
        <p className="text-sm font-medium text-foreground">Environment aligned.</p>
        <p className="text-xs text-muted-foreground">Your surroundings now support who you're becoming.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Compass className="w-3.5 h-3.5" />
        <span>Shape your environment to support growth</span>
      </div>

      {/* Action type */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">What did you align today?</p>
        <div className="space-y-1.5">
          {ACTION_TYPES.map((a) => (
            <button
              key={a.value}
              onClick={() => setActionType(a.value)}
              className={cn(
                "w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium text-left transition-all",
                actionType === a.value
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span>{a.emoji}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-xs font-medium text-foreground mb-1.5">Area of life</p>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                category === c.value ? "bg-accent/15 text-accent ring-1 ring-accent/30" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Support vs drain reflection */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-medium text-emerald-400 mb-1">What's energizing you?</p>
          <Textarea value={energizing} onChange={(e) => setEnergizing(e.target.value)} placeholder="Support..." className="min-h-[40px] resize-none text-xs" />
        </div>
        <div>
          <p className="text-[10px] font-medium text-red-400 mb-1">What's draining you?</p>
          <Textarea value={draining} onChange={(e) => setDraining(e.target.value)} placeholder="Drain..." className="min-h-[40px] resize-none text-xs" />
        </div>
      </div>

      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes (optional)" className="min-h-[40px] resize-none text-sm" />

      <Button onClick={handleSubmit} disabled={saving || !actionType || !category} className="w-full" size="sm">
        {saving ? "Aligning..." : "Complete Environment Reset"}
      </Button>
    </div>
  );
};
