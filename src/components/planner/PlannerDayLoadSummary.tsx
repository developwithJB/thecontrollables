import { motion } from "framer-motion";
import { Calendar, Clock, Focus, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";

interface PlannerDayLoadSummaryProps {
  intel: CalendarIntelligence;
}

const DAY_TYPE_CONFIG: Record<CalendarIntelligence["dayType"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  heavy: { label: "Heavy", variant: "destructive" },
  fragmented: { label: "Fragmented", variant: "destructive" },
  admin_heavy: { label: "Admin-Heavy", variant: "secondary" },
  moderate: { label: "Moderate", variant: "secondary" },
  light: { label: "Light", variant: "outline" },
  focus: { label: "Focus Day", variant: "default" },
  recovery_window: { label: "Recovery Window", variant: "outline" },
};

function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function PlannerDayLoadSummary({ intel }: PlannerDayLoadSummaryProps) {
  const config = DAY_TYPE_CONFIG[intel.dayType];
  const bestFocus = intel.focusBlocks.length > 0
    ? intel.focusBlocks.reduce((a, b) => (b.minutes > a.minutes ? b : a))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/40 bg-card/60 px-3 py-2.5 mx-4 mb-2 space-y-1.5"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
          {config.label}
        </Badge>

        {intel.meetingCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{intel.meetingCount} meeting{intel.meetingCount !== 1 ? "s" : ""}</span>
            <span className="text-border">·</span>
            <Clock className="w-3 h-3" />
            <span>{minutesToLabel(intel.meetingMinutes)}</span>
          </div>
        )}

        {bestFocus && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="text-border">·</span>
            <Focus className="w-3 h-3 text-primary/70" />
            <span>Best focus: {minutesToLabel(bestFocus.minutes)}</span>
          </div>
        )}

        {intel.overloadedPeriod && (
          <div className="flex items-center gap-1 text-[11px] text-destructive/70">
            <span className="text-border">·</span>
            <AlertTriangle className="w-3 h-3" />
            <span>{intel.overloadedPeriod} overloaded</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">{intel.interpretation}</p>
    </motion.div>
  );
}
