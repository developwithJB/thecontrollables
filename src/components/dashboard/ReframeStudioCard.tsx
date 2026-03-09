import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Lightbulb, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  { value: "work_conflict", label: "Work conflict" },
  { value: "feeling_behind", label: "Feeling behind" },
  { value: "relationship", label: "Relationship tension" },
  { value: "setback", label: "Injury / setback" },
  { value: "self_doubt", label: "Self-doubt" },
  { value: "other", label: "Other" },
] as const;

interface ReframeStudioCardProps {
  userId: string;
  onComplete: (response: string) => void;
}

export const ReframeStudioCard = ({ userId, onComplete }: ReframeStudioCardProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [situation, setSituation] = useState("");
  const [fearStory, setFearStory] = useState("");
  const [scenario, setScenario] = useState("");
  const [whatElse, setWhatElse] = useState("");
  const [teaching, setTeaching] = useState("");
  const [bestSelf, setBestSelf] = useState("");
  const [loveResponse, setLoveResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (step === 1 && situation && fearStory) setStep(2);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const { error } = await supabase.from("reframe_entries" as any).insert({
      user_id: userId,
      situation,
      fear_story: fearStory,
      reframe_what_else: whatElse || null,
      reframe_teaching: teaching || null,
      reframe_best_self: bestSelf || null,
      reframe_love_response: loveResponse || null,
      scenario_tag: scenario || null,
    } as any);

    if (error) {
      console.error("Failed to save reframe entry:", error);
      setSaving(false);
      return;
    }
    setStep(3);
    setTimeout(() => {
      onComplete(`Reframed: "${situation.slice(0, 40)}..." — moved from fear to love`);
    }, 2500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Reframe the story. Move from fear to love.</span>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">What happened?</p>
              <Textarea value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Describe the situation..." className="min-h-[50px] resize-none text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">What story are you telling yourself?</p>
              <Textarea value={fearStory} onChange={(e) => setFearStory(e.target.value)} placeholder="The fear-based narrative running in your head..." className="min-h-[50px] resize-none text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">Category (optional)</p>
              <div className="flex gap-1.5 flex-wrap">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScenario(s.value)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                      scenario === s.value ? "bg-accent/15 text-accent ring-1 ring-accent/30" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleNext} disabled={!situation || !fearStory} className="w-full gap-2" size="sm">
              <ArrowRight className="w-3.5 h-3.5" /> Begin Reframe
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="rounded-lg bg-muted/30 p-2.5 mb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Fear story</p>
              <p className="text-xs text-foreground italic">"{fearStory}"</p>
            </div>

            <div>
              <p className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3 text-accent" /> What else could be true?
              </p>
              <Textarea value={whatElse} onChange={(e) => setWhatElse(e.target.value)} placeholder="Consider another perspective..." className="min-h-[40px] resize-none text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">What might this be teaching you?</p>
              <Textarea value={teaching} onChange={(e) => setTeaching(e.target.value)} placeholder="The lesson hiding inside the difficulty..." className="min-h-[40px] resize-none text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">How would your best self view this?</p>
              <Textarea value={bestSelf} onChange={(e) => setBestSelf(e.target.value)} placeholder="Step into the version of you that's already through it..." className="min-h-[40px] resize-none text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1.5">What response would come from love, not fear?</p>
              <Textarea value={loveResponse} onChange={(e) => setLoveResponse(e.target.value)} placeholder="Choose the love circuit..." className="min-h-[40px] resize-none text-sm" />
            </div>

            <Button onClick={handleSubmit} disabled={saving || (!whatElse && !teaching && !bestSelf && !loveResponse)} className="w-full" size="sm">
              {saving ? "Saving reframe..." : "Complete Reframe"}
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-[10px] text-red-400 uppercase tracking-wide mb-1">Fear Circuit</p>
                <p className="text-xs text-foreground/80 italic">"{fearStory.slice(0, 80)}{fearStory.length > 80 ? "..." : ""}"</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wide mb-1">Love Circuit</p>
                <p className="text-xs text-foreground/80 italic">"{(loveResponse || bestSelf || whatElse || teaching).slice(0, 80)}..."</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">Story reframed. You chose love over fear.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
