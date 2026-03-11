import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Calendar, ArrowRight, Shield, Zap, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWeeklyReview, type WeeklyReview } from "@/hooks/useWeeklyReview";

interface WeeklyRecapCardProps {
  userId?: string;
  isPaid?: boolean;
}

interface WeekDayData {
  ring_date: string;
  notice_completed: boolean;
  choose_completed: boolean;
  prove_completed: boolean;
  charge_completed: boolean;
  align_completed: boolean;
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString("sv-SE"),
    end: sunday.toLocaleDateString("sv-SE"),
    dayOfWeek: day,
  };
}

const SYSTEM_ICONS: Record<string, { icon: typeof Shield; color: string }> = {
  Growth: { icon: Sparkles, color: "text-accent" },
  Plan: { icon: Calendar, color: "text-primary" },
  Body: { icon: Shield, color: "text-emerald-500" },
  Fuel: { icon: Zap, color: "text-amber-500" },
  Money: { icon: TrendingUp, color: "text-cyan-500" },
};

export const WeeklyRecapCard = ({ userId, isPaid = false }: WeeklyRecapCardProps) => {
  const [weekData, setWeekData] = useState<WeekDayData[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end, dayOfWeek } = useMemo(getWeekBounds, []);
  const showCard = dayOfWeek >= 4 || dayOfWeek === 0;

  const { review, isLoading: reviewLoading, isAvailable } = useWeeklyReview(userId, isPaid);

  useEffect(() => {
    if (!userId || !showCard) { setLoading(false); return; }
    const fetchWeek = async () => {
      const { data, error } = await supabase
        .from("daily_rings")
        .select("ring_date, notice_completed, choose_completed, prove_completed, charge_completed, align_completed")
        .eq("user_id", userId)
        .gte("ring_date", start)
        .lte("ring_date", end)
        .order("ring_date");
      if (error) { console.error(error); setLoading(false); return; }
      setWeekData((data as WeekDayData[]) || []);
      setLoading(false);
    };
    fetchWeek();
  }, [userId, start, end, showCard]);

  const stats = useMemo(() => {
    if (weekData.length === 0) return null;
    let totalRings = 0;
    let perfectDays = 0;
    weekData.forEach((d) => {
      const count = [d.notice_completed, d.choose_completed, d.prove_completed, d.charge_completed, d.align_completed].filter(Boolean).length;
      totalRings += count;
      if (count === 5) perfectDays++;
    });
    return {
      daysTracked: weekData.length,
      totalRings,
      perfectDays,
      avgRings: (totalRings / weekData.length).toFixed(1),
      completionRate: Math.round((totalRings / (weekData.length * 5)) * 100),
    };
  }, [weekData]);

  // Local fallback recap
  const localRecap = useMemo(() => {
    if (!stats || stats.daysTracked < 3) return null;
    const lines: string[] = [];
    lines.push(`This week you tracked ${stats.daysTracked} days, completing ${stats.totalRings} rings total (${stats.avgRings}/day avg).`);
    if (stats.perfectDays > 0) lines.push(`${stats.perfectDays} perfect day${stats.perfectDays > 1 ? "s" : ""} — all 5 rings filled. 🔥`);
    if (stats.completionRate >= 80) lines.push("Strong week. Keep this consistency going.");
    else if (stats.completionRate >= 50) lines.push("Solid effort. Focus on filling one more ring each day.");
    else lines.push("Every ring matters. Try starting with Notice and Charge tomorrow.");
    return lines.join(" ");
  }, [stats]);

  if (!showCard || loading || !stats || stats.daysTracked < 3) return null;

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card shadow-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Review</h3>
        {reviewLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
      </div>

      {/* AI Review — structured display */}
      {review ? (
        <AIReviewDisplay review={review} />
      ) : null}

      {/* Mini heatmap */}
      <div className="flex gap-1">
        {dayLabels.map((label, i) => {
          const dayData = weekData.find((d) => {
            const date = new Date(d.ring_date);
            return ((date.getDay() + 6) % 7) === i;
          });
          const count = dayData
            ? [dayData.notice_completed, dayData.choose_completed, dayData.prove_completed, dayData.charge_completed, dayData.align_completed].filter(Boolean).length
            : 0;
          return (
            <div key={i} className="flex-1 text-center">
              <span className="text-[9px] text-muted-foreground block mb-0.5">{label}</span>
              <div
                className={`h-5 rounded ${
                  count === 5 ? "bg-accent" : count >= 3 ? "bg-accent/60" : count >= 1 ? "bg-accent/30" : "bg-muted"
                }`}
              />
              <span className="text-[9px] text-muted-foreground">{count || "–"}</span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-center px-2">
        <div>
          <p className="text-lg font-bold text-foreground">{stats.completionRate}%</p>
          <p className="text-[9px] text-muted-foreground">Completion</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{stats.avgRings}</p>
          <p className="text-[9px] text-muted-foreground">Avg/Day</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{stats.perfectDays}</p>
          <p className="text-[9px] text-muted-foreground">Perfect Days</p>
        </div>
      </div>

      {/* Fallback local recap when no AI review */}
      {!review && localRecap && (
        <div className="flex gap-2 items-start">
          <TrendingUp className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{localRecap}</p>
        </div>
      )}
    </motion.div>
  );
};

function AIReviewDisplay({ review }: { review: WeeklyReview }) {
  const strongestMeta = SYSTEM_ICONS[review.strongest_system] || SYSTEM_ICONS.Growth;
  const weakestMeta = SYSTEM_ICONS[review.weakest_system] || SYSTEM_ICONS.Body;

  return (
    <div className="space-y-2.5">
      {/* Headline */}
      <p className="text-sm font-medium text-foreground leading-snug">{review.headline}</p>

      {/* Strongest / Weakest system badges */}
      <div className="flex gap-2">
        <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
          <strongestMeta.icon className={`w-3 h-3 ${strongestMeta.color}`} />
          Strongest: {review.strongest_system}
        </Badge>
        <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5">
          <weakestMeta.icon className={`w-3 h-3 ${weakestMeta.color}`} />
          Weakest: {review.weakest_system}
        </Badge>
      </div>

      {/* Supported by / Drained by */}
      <div className="space-y-1.5">
        <div className="flex gap-2 items-start">
          <Zap className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Supported by:</span> {review.supported_by}
          </p>
        </div>
        <div className="flex gap-2 items-start">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Drained by:</span> {review.drained_by}
          </p>
        </div>
      </div>

      {/* Patterns */}
      {review.patterns && review.patterns.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Patterns</p>
          {review.patterns.slice(0, 3).map((pattern, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-accent/30">
              {pattern}
            </p>
          ))}
        </div>
      )}

      {/* Next week recommendation */}
      <div className="flex gap-2 items-start rounded-lg bg-accent/5 border border-accent/10 p-2.5">
        <ArrowRight className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          <span className="font-medium">Next week:</span> {review.next_week}
        </p>
      </div>
    </div>
  );
}
