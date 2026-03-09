import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, X, Moon, Footprints, Apple, Battery, Smartphone } from "lucide-react";
import type { RingDefinition, RingKey } from "@/hooks/useDailyRings";
import { cn } from "@/lib/utils";

interface RingActionCardProps {
  definition: RingDefinition;
  onComplete: (response?: string) => void;
  onDismiss: () => void;
  // Embedded tracker props (optional — only passed for relevant rings)
  onLogWellness?: (sleep: number, movement: number, nutrition: number, notes?: string) => Promise<boolean>;
  onLogTime?: (data: { invested: number; wasted: number; notes?: string }) => Promise<any>;
  onLogScreenTime?: (hours: number, category: string) => Promise<void>;
  pendingPromises?: Array<{ id: string; promise_text: string; promised_at: string }>;
  onResolvePromise?: (data: { promiseId: string; kept: boolean }) => void;
}

const BORDER_COLORS: Record<string, string> = {
  awareness: "border-l-[hsl(var(--awareness))]",
  perspective: "border-l-[hsl(var(--perspective))]",
  habit: "border-l-[hsl(var(--habit))]",
  wellness: "border-l-[hsl(var(--wellness))]",
  environment: "border-l-[hsl(var(--environment))]",
};

// ─── Inline Wellness Form (Charge ring) ───
const InlineWellnessForm = ({ onLog, onDone }: { onLog: (s: number, m: number, n: number, notes?: string) => Promise<boolean>; onDone: (response: string) => void }) => {
  const [sleep, setSleep] = useState(3);
  const [movement, setMovement] = useState(3);
  const [nutrition, setNutrition] = useState(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const ok = await onLog(sleep, movement, nutrition, notes || undefined);
    setLoading(false);
    if (ok) {
      const avg = ((sleep + movement + nutrition) / 3).toFixed(1);
      onDone(`Sleep: ${sleep}/5, Movement: ${movement}/5, Nutrition: ${nutrition}/5 (avg ${avg})${notes ? ` — ${notes}` : ""}`);
    }
  };

  const avg = ((sleep + movement + nutrition) / 3).toFixed(1);
  const LABELS = ["Empty", "Low", "Half", "Good", "Full"];

  const Slider = ({ value, onChange, icon: Icon, label, color }: { value: number; onChange: (v: number) => void; icon: React.ElementType; label: string; color: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", color)} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{LABELS[value - 1]}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button key={level} onClick={() => onChange(level)} className={cn("flex-1 h-6 rounded transition-all", level <= value ? "bg-accent" : "bg-muted hover:bg-muted/80")} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-muted/50">
        <Battery className="w-4 h-4 text-accent" />
        <span className="text-sm font-bold text-foreground">{avg}/5</span>
      </div>
      <Slider value={sleep} onChange={setSleep} icon={Moon} label="Sleep" color="text-blue-400" />
      <Slider value={movement} onChange={setMovement} icon={Footprints} label="Movement" color="text-green-400" />
      <Slider value={nutrition} onChange={setNutrition} icon={Apple} label="Nutrition" color="text-orange-400" />
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." className="min-h-[50px] resize-none text-sm" />
      <Button onClick={handleSubmit} disabled={loading} className="w-full" size="sm">{loading ? "Logging..." : "Log Battery & Complete Ring"}</Button>
    </div>
  );
};

// ─── Inline Time Log Form (Prove ring — habit) ───
const InlineTimeLogForm = ({ onLog, onDone }: { onLog: (data: { invested: number; wasted: number; notes?: string }) => Promise<any>; onDone: (response: string) => void }) => {
  const [invested, setInvested] = useState("");
  const [wasted, setWasted] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onLog({ invested: Number(invested) || 0, wasted: Number(wasted) || 0, notes: notes || undefined });
    setLoading(false);
    onDone(`Invested ${invested || 0} min, wasted ${wasted || 0} min${notes ? ` — ${notes}` : ""}`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Invested (min)</label>
          <Input type="number" value={invested} onChange={(e) => setInvested(e.target.value)} placeholder="60" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Wasted (min)</label>
          <Input type="number" value={wasted} onChange={(e) => setWasted(e.target.value)} placeholder="30" className="h-8 text-sm" />
        </div>
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." className="min-h-[40px] resize-none text-sm" />
      <Button onClick={handleSubmit} disabled={loading || (!invested && !wasted)} className="w-full" size="sm">{loading ? "Logging..." : "Log Time & Complete Ring"}</Button>
    </div>
  );
};

// ─── Inline Promise Review (Prove ring — when promises pending) ───
const InlinePromiseReview = ({ promises, onResolve, onDone }: { promises: Array<{ id: string; promise_text: string; promised_at: string }>; onResolve: (data: { promiseId: string; kept: boolean }) => void; onDone: (response: string) => void }) => {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [keptCount, setKeptCount] = useState(0);

  const handleResolve = (id: string, kept: boolean) => {
    onResolve({ promiseId: id, kept });
    setResolved((prev) => new Set(prev).add(id));
    if (kept) setKeptCount((c) => c + 1);
  };

  const remaining = promises.filter((p) => !resolved.has(p.id));

  if (remaining.length === 0) {
    return (
      <div className="text-center py-3">
        <Check className="w-5 h-5 text-accent mx-auto mb-1" />
        <p className="text-sm text-muted-foreground">All promises reviewed!</p>
        <Button onClick={() => onDone(`Kept ${keptCount}/${promises.length} promises`)} size="sm" variant="outline" className="mt-2">Complete Ring</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {remaining.map((p) => (
        <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          <p className="flex-1 text-xs text-foreground">{p.promise_text}</p>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleResolve(p.id, true)}>Kept</Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={() => handleResolve(p.id, false)}>Broke</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Inline Screen Time Form (Align ring) ───
const InlineScreenTimeForm = ({ onLog, onDone }: { onLog: (hours: number, category: string) => Promise<void>; onDone: (response: string) => void }) => {
  const [hours, setHours] = useState("");
  const [category, setCategory] = useState("social");
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: "social", label: "Social Media" },
    { value: "entertainment", label: "Entertainment" },
    { value: "productivity", label: "Productivity" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    await onLog(Number(hours) || 0, category);
    setLoading(false);
    onDone(`${hours || 0}h of ${category} screen time`);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Hours today</label>
        <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2.5" className="h-8 text-sm" step="0.5" min="0" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Category</label>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <Button
              key={c.value}
              variant={category === c.value ? "default" : "outline"}
              size="sm"
              className="text-[10px] h-6 px-2"
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={loading || !hours} className="w-full" size="sm">{loading ? "Logging..." : "Log Screen Time & Complete Ring"}</Button>
    </div>
  );
};

// ─── Determine which embedded tracker to show per ring ───
function getEmbeddedTracker(
  key: RingKey,
  props: RingActionCardProps,
  onCompleteDone: (response: string) => void
) {
  if (key === "charge" && props.onLogWellness) {
    return <InlineWellnessForm onLog={props.onLogWellness} onDone={onCompleteDone} />;
  }
  if (key === "prove" && props.pendingPromises && props.pendingPromises.length > 0 && props.onResolvePromise) {
    return <InlinePromiseReview promises={props.pendingPromises} onResolve={props.onResolvePromise} onDone={onCompleteDone} />;
  }
  if (key === "prove" && props.onLogTime) {
    return <InlineTimeLogForm onLog={props.onLogTime} onDone={onCompleteDone} />;
  }
  if (key === "align" && props.onLogScreenTime) {
    return <InlineScreenTimeForm onLog={props.onLogScreenTime} onDone={onCompleteDone} />;
  }
  return null;
}

export const RingActionCard = (props: RingActionCardProps) => {
  const { definition, onComplete, onDismiss } = props;
  const [response, setResponse] = useState("");
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(response.trim() || undefined);
  };

  const handleTrackerComplete = async (trackerResponse: string) => {
    setCompleting(true);
    await onComplete(trackerResponse);
  };

  const embeddedTracker = getEmbeddedTracker(definition.key, props, handleTrackerComplete);

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

      {/* Embedded tracker OR simple response input */}
      {embeddedTracker ? (
        embeddedTracker
      ) : (
        <>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your response (optional)..."
            className="min-h-[60px] resize-none text-sm mb-3"
          />
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
        </>
      )}
    </div>
  );
};
