import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DailyRingsState } from "@/hooks/useDailyRings";

interface DailyRecapCardProps {
  userId?: string;
  rings: DailyRingsState;
  completedCount: number;
  rowId: string | null;
  existingRecap?: string | null;
}

export const DailyRecapCard = ({ userId, rings, completedCount, rowId, existingRecap }: DailyRecapCardProps) => {
  const [recap, setRecap] = useState<string | null>(existingRecap || null);
  const [loading, setLoading] = useState(false);

  const shouldShow = completedCount >= 3 || !!recap;

  const generateRecap = async () => {
    if (!userId || !rowId) return;
    setLoading(true);
    try {
      const ringsSummary = Object.entries(rings)
        .filter(([k, v]) => k.endsWith("_completed") && v)
        .map(([k]) => k.replace("_completed", ""))
        .join(", ");

      const responses = Object.entries(rings)
        .filter(([k, v]) => k.endsWith("_response") && v)
        .map(([k, v]) => `${k.replace("_response", "")}: ${v}`)
        .join("; ");

      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: {
          type: "daily_recap",
          context: {
            completed_rings: ringsSummary,
            responses,
            completed_count: completedCount,
          },
        },
      });

      if (error) throw error;

      const recapText = data?.insight || data?.recap || `You completed ${completedCount}/5 rings today. ${completedCount >= 4 ? "Strong day of control." : "Keep building momentum."}`;
      setRecap(recapText);

      // Save to DB
      await supabase
        .from("daily_rings")
        .update({ daily_recap: recapText })
        .eq("id", rowId);
    } catch (err) {
      console.error("Failed to generate recap:", err);
      // Fallback to a simple local recap
      setRecap(`You completed ${completedCount}/5 rings today. ${completedCount === 5 ? "Fully Charged. ⚡" : completedCount >= 4 ? "Almost there — strong effort." : "Solid start. Every ring matters."}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on first render if 3+ and no existing recap
  useEffect(() => {
    if (completedCount >= 3 && !recap && !loading) {
      generateRecap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount]);

  if (!shouldShow) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card shadow-sm p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Today's Recap</h3>
        </div>
        {recap && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={generateRecap} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {loading && !recap ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Analyzing your day...</span>
        </div>
      ) : recap ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{recap}</p>
      ) : null}

      <div className="flex gap-1 mt-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full ${i <= completedCount ? "bg-accent" : "bg-muted"}`}
          />
        ))}
      </div>
    </motion.div>
  );
};
