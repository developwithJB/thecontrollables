import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed,
  Footprints,
  Moon,
  Droplets,
  ListPlus,
} from "lucide-react";

type QuickAddType = "meal" | "movement" | "sleep" | "water" | null;

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  selectedDate: string;
}

const QUICK_ADD_OPTIONS = [
  { type: "meal" as const, icon: UtensilsCrossed, label: "Log Meal", color: "text-orange-400" },
  { type: "movement" as const, icon: Footprints, label: "Log Movement", color: "text-green-400" },
  { type: "sleep" as const, icon: Moon, label: "Log Sleep", color: "text-blue-400" },
  { type: "water" as const, icon: Droplets, label: "Log Water", color: "text-cyan-400" },
] as const;

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const QuickAddSheet = ({ open, onClose, userId, selectedDate }: QuickAddSheetProps) => {
  const [activeType, setActiveType] = useState<QuickAddType>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Meal state
  const [mealType, setMealType] = useState<string>("lunch");
  const [mealDescription, setMealDescription] = useState("");

  // Movement state
  const [movementType, setMovementType] = useState("");
  const [movementDuration, setMovementDuration] = useState("");

  // Sleep state
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState(3);

  // Water state
  const [waterGlasses, setWaterGlasses] = useState(4);

  const resetState = () => {
    setActiveType(null);
    setMealType("lunch");
    setMealDescription("");
    setMovementType("");
    setMovementDuration("");
    setSleepHours("");
    setSleepQuality(3);
    setWaterGlasses(4);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const invalidateActivity = () => {
    queryClient.invalidateQueries({ queryKey: ["planner-activity"] });
  };

  const handleSaveMeal = async () => {
    if (!mealDescription.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("meal_logs").insert({
      user_id: userId,
      meal_type: mealType,
      description: mealDescription.trim(),
      log_date: selectedDate,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: "Failed to log meal", variant: "destructive" }); return; }
    toast({ title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged` });
    invalidateActivity();
    handleClose();
  };

  const handleSaveMovement = async () => {
    if (!movementType.trim()) return;
    setSaving(true);
    // Save as recharge log + completed action
    const promises = [
      supabase.from("recharge_logs" as any).insert({
        user_id: userId,
        recharge_type: "movement",
        log_date: selectedDate,
        note: `${movementType}${movementDuration ? ` — ${movementDuration} min` : ""}`,
      } as any),
      supabase.from("completed_actions").insert({
        user_id: userId,
        action_text: `Movement: ${movementType}${movementDuration ? ` (${movementDuration} min)` : ""}`,
        controllable: "wellness",
        xp_awarded: 15,
      }),
    ];
    await Promise.all(promises);
    setSaving(false);
    toast({ title: "Movement logged" });
    invalidateActivity();
    handleClose();
  };

  const handleSaveSleep = async () => {
    setSaving(true);
    // Upsert wellness log with sleep data
    const { data: existing } = await supabase
      .from("wellness_logs")
      .select("id, movement_rating, nutrition_rating, notes")
      .eq("user_id", userId)
      .eq("log_date", selectedDate)
      .maybeSingle();

    if (existing) {
      await supabase.from("wellness_logs").update({
        sleep_rating: sleepQuality,
        notes: existing.notes ? `${existing.notes} | Sleep: ${sleepHours || "?"}h` : `Sleep: ${sleepHours || "?"}h`,
      }).eq("id", existing.id);
    } else {
      await supabase.from("wellness_logs").insert({
        user_id: userId,
        log_date: selectedDate,
        sleep_rating: sleepQuality,
        movement_rating: null,
        nutrition_rating: null,
        notes: sleepHours ? `Sleep: ${sleepHours}h` : null,
      });
    }

    // Also log as recharge
    await supabase.from("recharge_logs" as any).insert({
      user_id: userId,
      recharge_type: "sleep",
      log_date: selectedDate,
      note: sleepHours ? `${sleepHours} hours, quality ${sleepQuality}/5` : `Quality ${sleepQuality}/5`,
    } as any);

    setSaving(false);
    toast({ title: "Sleep logged" });
    invalidateActivity();
    handleClose();
  };

  const handleSaveWater = async () => {
    setSaving(true);
    await supabase.from("recharge_logs" as any).insert({
      user_id: userId,
      recharge_type: "hydration",
      log_date: selectedDate,
      note: `${waterGlasses} glasses`,
    } as any);
    setSaving(false);
    toast({ title: "Hydration logged" });
    invalidateActivity();
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{activeType ? `Log ${activeType.charAt(0).toUpperCase() + activeType.slice(1)}` : "Quick Add"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Type selector */}
          {!activeType && (
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ADD_OPTIONS.map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all text-left"
                >
                  <Icon className={cn("w-5 h-5", color)} />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Meal form */}
          {activeType === "meal" && (
            <div className="space-y-3">
              <div className="flex gap-1.5">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setMealType(t)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                      mealType === t ? "bg-accent/15 text-accent ring-1 ring-accent/30" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <Input
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
                placeholder="What did you eat? e.g. Grilled chicken salad, rice..."
                autoFocus
              />
              <Button onClick={handleSaveMeal} disabled={saving || !mealDescription.trim()} className="w-full">
                {saving ? "Saving..." : "Log Meal"}
              </Button>
            </div>
          )}

          {/* Movement form */}
          {activeType === "movement" && (
            <div className="space-y-3">
              <Input
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                placeholder="What did you do? e.g. Run, Gym, Walk, Yoga..."
                autoFocus
              />
              <Input
                type="number"
                value={movementDuration}
                onChange={(e) => setMovementDuration(e.target.value)}
                placeholder="Duration in minutes (optional)"
              />
              <Button onClick={handleSaveMovement} disabled={saving || !movementType.trim()} className="w-full">
                {saving ? "Saving..." : "Log Movement"}
              </Button>
            </div>
          )}

          {/* Sleep form */}
          {activeType === "sleep" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hours slept</label>
                <Input
                  type="number"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="e.g. 7.5"
                  step="0.5"
                  autoFocus
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground">Sleep quality</label>
                  <span className="text-xs text-foreground font-medium">{sleepQuality}/5</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSleepQuality(n)}
                      className={cn("flex-1 h-8 rounded transition-all text-xs", n <= sleepQuality ? "bg-blue-400 text-white" : "bg-muted text-muted-foreground")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveSleep} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Log Sleep"}
              </Button>
            </div>
          )}

          {/* Water form */}
          {activeType === "water" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground">Glasses of water today</label>
                  <span className="text-sm font-bold text-foreground">{waterGlasses}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setWaterGlasses(n)}
                      className={cn("flex-1 h-8 rounded transition-all text-[10px]", n <= waterGlasses ? "bg-cyan-400 text-white" : "bg-muted text-muted-foreground")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveWater} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Log Water"}
              </Button>
            </div>
          )}

          {/* Back button when in sub-form */}
          {activeType && (
            <Button variant="ghost" size="sm" onClick={() => setActiveType(null)} className="w-full text-muted-foreground">
              ← Back to options
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
