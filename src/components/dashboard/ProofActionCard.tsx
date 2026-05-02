import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "work", label: "Work" },
  { value: "fitness", label: "Fitness" },
  { value: "relationships", label: "Relationships" },
  { value: "recovery", label: "Recovery" },
  { value: "discipline", label: "Discipline" },
] as const;

const REINFORCEMENTS = [
  "Confidence grows when you keep promises to yourself.",
  "This is proof, not theory.",
  "Small actions build unshakeable identity.",
  "You just edged out the Ego with action.",
  "Proof stacks. Keep going.",
];

interface ProofActionCardProps {
  userId: string;
  onComplete: (response: string) => void;
}

export const ProofActionCard = ({ userId, onComplete }: ProofActionCardProps) => {
  const [existingAction, setExistingAction] = useState<any>(null);
  const [proofAction, setProofAction] = useState("");
  const [category, setCategory] = useState("");
  const [reflection, setReflection] = useState("");
  const [phase, setPhase] = useState<"loading" | "set" | "complete" | "done">("loading");
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);

  const todayStr = new Date().toLocaleDateString("sv-SE");

  useEffect(() => {
    const load = async () => {
      // Check for today's existing proof action
      const { data } = await supabase
        .from("proof_actions" as any)
        .select("*")
        .eq("user_id", userId)
        .eq("action_date", todayStr)
        .maybeSingle();

      if (data) {
        setExistingAction(data);
        setProofAction((data as any).proof_action);
        setCategory((data as any).category || "");
        setPhase((data as any).completed ? "done" : "complete");
      } else {
        setPhase("set");
      }

      // Calculate streak
      const { data: recent } = await supabase
        .from("proof_actions" as any)
        .select("action_date, completed")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("action_date", { ascending: false })
        .limit(30);

      if (recent) {
        let s = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toLocaleDateString("sv-SE");
          if ((recent as any[]).some((r: any) => r.action_date === dateStr)) {
            s++;
          } else if (i > 0) break;
        }
        setStreak(s);
      }
    };
    load();
  }, [userId, todayStr]);

  const handleSetAction = async () => {
    if (!proofAction) return;
    setSaving(true);
    const { data, error } = await supabase.from("proof_actions" as any).insert({
      user_id: userId,
      proof_action: proofAction,
      category: category || null,
    } as any).select().single();

    if (error) { console.error(error); setSaving(false); return; }
    setExistingAction(data);
    setPhase("complete");
    setSaving(false);
  };

  const handleComplete = async () => {
    if (!existingAction) return;
    setSaving(true);
    const { error } = await supabase
      .from("proof_actions" as any)
      .update({ completed: true, completed_at: new Date().toISOString(), reflection: reflection || null } as any)
      .eq("id", (existingAction as any).id);

    if (error) { console.error(error); setSaving(false); return; }
    setPhase("done");
    const msg = REINFORCEMENTS[Math.floor(Math.random() * REINFORCEMENTS.length)];
    setTimeout(() => {
      onComplete(`Proof: "${proofAction}" — ${msg}`);
    }, 2000);
  };

  if (phase === "loading") return <div className="h-20 flex items-center justify-center"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  if (phase === "done") {
    const msg = REINFORCEMENTS[Math.floor(Math.random() * REINFORCEMENTS.length)];
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-2 py-2">
        <Trophy className="w-6 h-6 text-accent mx-auto" />
        <p className="text-sm font-medium text-foreground">"{proofAction}"</p>
        <p className="text-xs text-accent">{msg}</p>
        {streak > 1 && <p className="text-[10px] text-muted-foreground">🔥 {streak}-day proof rhythm</p>}
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Target className="w-3.5 h-3.5" />
        <span>{phase === "set" ? "Set your proof action for today" : "Complete your proof"}</span>
      </div>

      {phase === "set" && (
        <>
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">What is one action that proves who you are becoming today?</p>
            <Input value={proofAction} onChange={(e) => setProofAction(e.target.value)} placeholder="e.g. 30 min focused work, gym session, difficult conversation..." className="text-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">Category</p>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategory(c.value)} className={cn("px-2 py-1 rounded-md text-[10px] font-medium transition-all", category === c.value ? "bg-accent/15 text-accent ring-1 ring-accent/30" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSetAction} disabled={saving || !proofAction} className="w-full" size="sm">
            {saving ? "Setting..." : "Set Proof Action"}
          </Button>
        </>
      )}

      {phase === "complete" && (
        <>
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
            <p className="text-[10px] text-accent uppercase tracking-wide mb-1">Today's proof</p>
            <p className="text-sm font-medium text-foreground">{proofAction}</p>
            {category && <span className="text-[10px] text-muted-foreground mt-1 inline-block bg-muted px-1.5 py-0.5 rounded">{category}</span>}
          </div>
          <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What did completing this prove? (optional)" className="min-h-[40px] resize-none text-sm" />
          <Button onClick={handleComplete} disabled={saving} className="w-full gap-2" size="sm">
            <Check className="w-3.5 h-3.5" /> {saving ? "Completing..." : "Mark as Proven"}
          </Button>
        </>
      )}
    </div>
  );
};
