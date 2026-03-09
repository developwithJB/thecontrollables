import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyRecapCardProps {
  userId?: string;
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
  const day = now.getDay(); // 0=Sun
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

export const WeeklyRecapCard = ({ userId }: WeeklyRecapCardProps) => {
  const [weekData, setWeekData] = useState<WeekDayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recap, setRecap] = useState<string | null>(null);

  const { start, end, dayOfWeek } = useMemo(getWeekBounds, []);

  // Only show from Thursday onward (enough data)
  const showCard = dayOfWeek >= 4 || dayOfWeek === 0;

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

  // Compute stats
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

  // Generate local recap text
  useEffect(() => {
    if (!stats || stats.daysTracked < 3) return;
    const lines: string[] = [];
    lines.push(`This week you tracked ${stats.daysTracked} days, completing ${stats.totalRings} rings total (${stats.avgRings}/day avg).`);
    if (stats.perfectDays > 0) lines.push(`${stats.perfectDays} perfect day${stats.perfectDays > 1 ? "s" : ""} — all 5 rings filled. 🔥`);
    if (stats.completionRate >= 80) lines.push("Strong week. Keep this consistency going.");
    else if (stats.completionRate >= 50) lines.push("Solid effort. Focus on filling one more ring each day.");
    else lines.push("Every ring matters. Try starting with Notice and Charge tomorrow.");
    setRecap(lines.join(" "));
  }, [stats]);

  if (!showCard || loading || !stats || stats.daysTracked < 3) return null;

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card shadow-sm p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Review</h3>
      </div>

      {/* Mini heatmap */}
      <div className="flex gap-1 mb-3">
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
      <div className="flex justify-between text-center mb-3 px-2">
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

      {recap && (
        <div className="flex gap-2 items-start">
          <TrendingUp className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{recap}</p>
        </div>
      )}
    </motion.div>
  );
};
