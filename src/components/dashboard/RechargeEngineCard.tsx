import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Battery, Droplets, Moon, Footprints, Apple, Sun, Wind, RotateCcw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useHealthData } from "@/hooks/useHealthData";

const RECHARGE_TYPES = [
  { value: "movement", label: "Movement", icon: Footprints, color: "text-green-400" },
  { value: "hydration", label: "Hydration", icon: Droplets, color: "text-blue-400" },
  { value: "sleep", label: "Sleep", icon: Moon, color: "text-indigo-400" },
  { value: "nutrition", label: "Nutrition", icon: Apple, color: "text-orange-400" },
  { value: "sunlight", label: "Sunlight", icon: Sun, color: "text-yellow-400" },
  { value: "breathwork", label: "Breathwork", icon: Wind, color: "text-cyan-400" },
  { value: "recovery", label: "Recovery", icon: RotateCcw, color: "text-purple-400" },
] as const;

interface RechargeEngineCardProps {
  userId: string;
  onComplete: (response: string) => void;
  lowEnergy?: boolean;
}

export const RechargeEngineCard = ({ userId, onComplete, lowEnergy }: RechargeEngineCardProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [todayLogs, setTodayLogs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { isConnected: wearableConnected, latest: healthLatest } = useHealthData(userId);

  const todayStr = new Date().toLocaleDateString("sv-SE");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("recharge_logs" as any)
        .select("recharge_type")
        .eq("user_id", userId)
        .eq("log_date", todayStr);
      if (data) setTodayLogs((data as any[]).map((d: any) => d.recharge_type));
    };
    load();
  }, [userId, todayStr]);

  const toggleType = (type: string) => {
    if (todayLogs.includes(type)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSaving(true);

    const inserts = Array.from(selected).map((type) => ({
      user_id: userId,
      recharge_type: type,
    }));

    const { error } = await supabase.from("recharge_logs" as any).insert(inserts as any);
    if (error) { console.error(error); setSaving(false); return; }

    const types = Array.from(selected).join(", ");
    onComplete(`Recharged: ${types}`);
  };

  const allLogged = [...todayLogs, ...Array.from(selected)];

  // WHOOP context hint
  const whoopHint = (() => {
    if (!wearableConnected) return null;
    const recovery = healthLatest.recovery;
    const strain = healthLatest.strain;
    const sleepMins = healthLatest.sleepMinutes;
    if (recovery !== null && recovery < 50) return { text: "Wearable shows low recovery — prioritize sleep & recovery today", color: "text-orange-500 bg-orange-500/10" };
    if (strain !== null && strain > 14) return { text: "High strain yesterday — consider lighter activity", color: "text-orange-500 bg-orange-500/10" };
    if (sleepMins !== null && sleepMins > 420 && recovery !== null && recovery > 67) return { text: "Great recovery — you're charged for a strong day", color: "text-green-500 bg-green-500/10" };
    return null;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Battery className="w-3.5 h-3.5" />
        <span>Recharge your system</span>
      </div>

      {whoopHint && (
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium", whoopHint.color)}>
          <Activity className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{whoopHint.text}</span>
        </div>
      )}

      {lowEnergy && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5">
          <p className="text-xs text-yellow-400">⚡ Low energy detected in your Circuit Check. Your body and mind need fuel.</p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {RECHARGE_TYPES.map(({ value, label, icon: Icon, color }) => {
          const alreadyLogged = todayLogs.includes(value);
          const isSelected = selected.has(value);
          return (
            <button
              key={value}
              onClick={() => toggleType(value)}
              disabled={alreadyLogged}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all",
                alreadyLogged
                  ? "bg-accent/10 text-accent/60 opacity-60 cursor-default"
                  : isSelected
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("w-4 h-4", alreadyLogged ? "text-accent/60" : isSelected ? "text-accent" : color)} />
              <span>{label}</span>
              {alreadyLogged && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>

      {allLogged.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg bg-muted/30">
          <Battery className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-foreground">{allLogged.length}/7 systems recharged</span>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={saving || selected.size === 0} className="w-full" size="sm">
        {saving ? "Recharging..." : `Log ${selected.size} Recharge${selected.size !== 1 ? "s" : ""} & Complete Ring`}
      </Button>
    </div>
  );
};
