import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Flame, Brain, Utensils, CalendarCheck, DollarSign,
  TrendingUp, TrendingDown, Minus, ChevronRight, Zap, Moon, Heart
} from "lucide-react";
import type { WeeklyTrackerData } from "@/hooks/useWeeklyTracker";

interface WeeklyPulseScreenProps {
  data: WeeklyTrackerData;
  previousWeek: {
    overall: number;
    rings: number;
    wearable: number;
    planner: number;
    nutrition: number;
    money: number;
  } | null;
  onDismiss: () => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ScoreBar({
  label,
  icon: Icon,
  score,
  prev,
  color,
}: {
  label: string;
  icon: any;
  score: number;
  prev: number | null;
  color: string;
}) {
  const diff = prev != null ? score - prev : null;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-foreground">{score}%</span>
            {diff != null && diff !== 0 && (
              <span className={`text-[10px] flex items-center ${diff > 0 ? "text-green-500" : "text-red-400"}`}>
                {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(diff)}
              </span>
            )}
          </div>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>
    </div>
  );
}

function getGreeting(dayOfWeek: number, overallScore: number): { headline: string; subline: string } {
  const dayName = DAY_NAMES[dayOfWeek];

  if (dayOfWeek === 0) {
    return {
      headline: "New week. Clean slate.",
      subline: "Every system resets. What will you build this week?",
    };
  }
  if (dayOfWeek === 1) {
    return {
      headline: "Monday momentum.",
      subline: "Set the tone. One strong day compounds all week.",
    };
  }
  if (dayOfWeek <= 3) {
    if (overallScore >= 60) return { headline: "You're in the zone.", subline: `${dayName} — your systems are tracking well. Keep building.` };
    return { headline: "Mid-week check.", subline: `${dayName} — still time to shift the trajectory this week.` };
  }
  if (dayOfWeek <= 5) {
    if (overallScore >= 70) return { headline: "Strong week forming.", subline: "Your consistency is showing. Finish what you started." };
    if (overallScore >= 40) return { headline: "The chapter is still turning.", subline: "Two more days to shape how this stretch lands. What's one system you can steady?" };
    return { headline: "Real talk.", subline: "This week's been rough. But you showed up. That counts." };
  }
  // Saturday
  if (overallScore >= 70) return { headline: "What a week.", subline: "Tomorrow you'll see the full chapter read. You earned it." };
  return { headline: "Almost there.", subline: "One more day. Make Saturday count." };
}

export function WeeklyPulseScreen({ data, previousWeek, onDismiss }: WeeklyPulseScreenProps) {
  const greeting = getGreeting(data.dayOfWeek, data.scores.overall);

  // Day progress dots
  const dayDots = DAY_NAMES.map((name, i) => ({
    name,
    isPast: i < data.dayOfWeek,
    isToday: i === data.dayOfWeek,
    isFuture: i > data.dayOfWeek,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header area with gradient */}
      <div className="relative flex-shrink-0 pt-safe">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative px-6 pt-8 pb-4">
          {/* Week progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {dayDots.map((d) => (
              <div key={d.name} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    d.isToday
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background scale-110"
                      : d.isPast
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {d.name.charAt(0)}
                </div>
              </div>
            ))}
          </div>

          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-2"
          >
            <h1 className="text-2xl font-display font-bold text-foreground">
              {greeting.headline}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{greeting.subline}</p>
          </motion.div>

          {/* Overall score ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="flex justify-center mt-4"
          >
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity="0.3" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - data.scores.overall / 100) }}
                  transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold text-foreground">{data.scores.overall}</span>
                <span className="text-[10px] text-muted-foreground font-medium">CHAPTER READ</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-6 pb-32">
        {/* Quick stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-4 gap-2 mb-6"
        >
          <div className="bg-card/80 rounded-xl p-3 text-center border border-border/30">
            <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold text-foreground">{data.totalXp}</p>
            <p className="text-[9px] text-muted-foreground">Charge XP</p>
          </div>
          <div className="bg-card/80 rounded-xl p-3 text-center border border-border/30">
            <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold text-foreground">{data.daysActive}</p>
            <p className="text-[9px] text-muted-foreground">Days Active</p>
          </div>
          <div className="bg-card/80 rounded-xl p-3 text-center border border-border/30">
            <Moon className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
            <p className="text-lg font-bold text-foreground">{data.sleepAvg ? `${Math.round(data.sleepAvg / 60)}h` : "—"}</p>
            <p className="text-[9px] text-muted-foreground">Sleep Avg</p>
          </div>
          <div className="bg-card/80 rounded-xl p-3 text-center border border-border/30">
            <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
            <p className="text-lg font-bold text-foreground">{data.recoveryAvg ?? "—"}%</p>
            <p className="text-[9px] text-muted-foreground">Recovery</p>
          </div>
        </motion.div>

        {/* System scores */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 mb-6"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your 5 Systems</h2>
          <ScoreBar label="Moves" icon={Brain} score={data.scores.rings} prev={previousWeek?.rings ?? null} color="bg-primary/10 text-primary" />
          <ScoreBar label="Body" icon={Heart} score={data.scores.wearable} prev={previousWeek?.wearable ?? null} color="bg-red-500/10 text-red-500" />
          <ScoreBar label="Plan" icon={CalendarCheck} score={data.scores.planner} prev={previousWeek?.planner ?? null} color="bg-blue-500/10 text-blue-500" />
          <ScoreBar label="Fuel" icon={Utensils} score={data.scores.nutrition} prev={previousWeek?.nutrition ?? null} color="bg-green-500/10 text-green-500" />
          <ScoreBar label="Money" icon={DollarSign} score={data.scores.money} prev={previousWeek?.money ?? null} color="bg-yellow-500/10 text-yellow-500" />
        </motion.div>

        {/* Today's challenge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card border border-border/50 rounded-xl p-4 mb-4"
        >
          <p className="text-xs font-semibold text-muted-foreground mb-1">TODAY'S FOCUS</p>
          <p className="text-sm text-foreground">
            {data.scores.rings < 40
              ? "Complete at least 3 moves today to build momentum."
              : data.scores.planner < 40
              ? "Knock out your planned tasks — your schedule needs attention."
              : data.scores.nutrition < 40
              ? "Log your meals today. Fuel awareness = better choices."
              : data.scores.wearable < 40
              ? "Prioritize sleep tonight. Your body score needs recovery."
              : "Keep going. You're building something real this week."}
          </p>
        </motion.div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-20 inset-x-0 px-6 pb-2 bg-gradient-to-t from-background via-background to-transparent pt-8 z-50">
        <Button onClick={onDismiss} className="w-full h-14 text-lg font-semibold" size="lg">
          Let's go <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
