import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Keyboard, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MealAnalysis } from "@/hooks/useMealTracking";

interface MealLogEntryProps {
  mealType: string;
  mealLabel: string;
  emoji: string;
  existingAnalysis?: MealAnalysis | null;
  existingDescription?: string | null;
  plannedMealName?: string | null;
  onSubmit: (data: { description?: string; imageFile?: File; mealType: string }) => Promise<MealAnalysis>;
  onConfirmAsEaten?: (mealType: string) => void;
  isAnalyzing: boolean;
}

export function MealLogEntry({
  mealType,
  mealLabel,
  emoji,
  existingAnalysis,
  existingDescription,
  plannedMealName,
  onSubmit,
  onConfirmAsEaten,
  isAnalyzing,
}: MealLogEntryProps) {
  const [mode, setMode] = useState<"idle" | "text" | "photo">("idle");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<MealAnalysis | null>(existingAnalysis || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLogged = !!result || !!existingAnalysis;
  const analysis = result || existingAnalysis;

  const handleTextSubmit = async () => {
    if (!description.trim()) return;
    try {
      const res = await onSubmit({ description: description.trim(), mealType });
      setResult(res);
      setMode("idle");
    } catch { /* handled in hook */ }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await onSubmit({ imageFile: file, mealType });
      setResult(res);
      setMode("idle");
    } catch { /* handled in hook */ }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-medium text-foreground">{mealLabel}</span>
        </div>
        {isLogged && (
          <div className="flex items-center gap-1 text-xs text-wellness-foreground">
            <Check className="w-3 h-3" />
            <span>{analysis?.calories || 0} cal</span>
          </div>
        )}
      </div>

      {/* Logged state: show macros */}
      {isLogged && analysis && (
        <div className="space-y-1.5">
          {existingDescription && (
            <p className="text-xs text-muted-foreground">{existingDescription}</p>
          )}
          <div className="flex gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              P {analysis.protein}g
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              C {analysis.carbs}g
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              F {analysis.fat}g
            </span>
          </div>
          {analysis.satellite_tip && (
            <p className="text-[11px] text-muted-foreground italic">
              🛰️ {analysis.satellite_tip}
            </p>
          )}
        </div>
      )}

      {/* Input mode selection */}
      {!isLogged && mode === "idle" && !isAnalyzing && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => setMode("text")}
          >
            <Keyboard className="w-3 h-3 mr-1" /> Type it
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="w-3 h-3 mr-1" /> Snap it
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>
      )}

      {/* Text input mode */}
      <AnimatePresence>
        {mode === "text" && !isLogged && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2">
              <Input
                placeholder="2 eggs, toast, coffee..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                className="text-xs h-8"
                autoFocus
                maxLength={200}
              />
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleTextSubmit}
                disabled={!description.trim() || isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Log"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyzing state */}
      {isAnalyzing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>🛰️ Satellite is scanning your fuel...</span>
        </div>
      )}
    </div>
  );
}
