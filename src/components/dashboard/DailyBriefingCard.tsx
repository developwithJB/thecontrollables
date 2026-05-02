import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useGameSignals } from "@/hooks/useGameSignals";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import { getControllableRosterProfile } from "@/lib/controllableRoster";

interface BriefingStructured {
  day_type: string;
  interpretation: string;
  focus: string;
  watchout: string;
}

interface DailyBriefingCardProps {
  userId?: string;
  isPaid: boolean;
  isTrialing?: boolean;
  hasActiveSnapshot: boolean;
  onUpgrade?: () => void;
  healthRecovery?: number | null;
  plannerCount?: number | null;
  ringsCompleted?: number;
  healthMetrics?: HealthMetrics | null;
  healthTrend?: HealthMetrics[];
  calendarIntel?: CalendarIntelligence | null;
  wearableConnected?: boolean;
  calendarConnected?: boolean;
}

function tryParseStructured(content: string): BriefingStructured | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.day_type && parsed.interpretation && parsed.focus && parsed.watchout) {
      return parsed as BriefingStructured;
    }
  } catch {
    // Legacy text content falls through to rule-based copy.
  }
  return null;
}

function getFallbackBriefing(content: string | null): string | null {
  if (!content) return null;
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] ?? null;
}

function formatMode(mode: string | undefined): string {
  switch (mode) {
    case "recover":
      return "Recover Read";
    case "protect":
      return "Protect Read";
    case "stretch":
      return "Stretch Read";
    default:
      return "Daily Read";
  }
}

export function DailyBriefingCard({
  userId,
  isPaid,
  hasActiveSnapshot,
  healthRecovery,
  plannerCount,
  healthMetrics,
  healthTrend,
  calendarIntel,
  wearableConnected,
  calendarConnected,
}: DailyBriefingCardProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { signals } = useGameSignals({
    userId,
    enabled: true,
    wearable:
      healthMetrics !== undefined || healthRecovery !== undefined || wearableConnected !== undefined
        ? {
            connected: wearableConnected ?? (healthRecovery != null),
            recovery: healthMetrics?.recovery ?? healthRecovery ?? null,
            sleepMinutes: healthMetrics?.sleepMinutes ?? null,
            strain: healthMetrics?.strain ?? healthTrend?.[0]?.strain ?? null,
          }
        : undefined,
    calendar:
      calendarIntel !== undefined || plannerCount !== undefined || calendarConnected !== undefined
        ? {
            connected: calendarConnected ?? ((plannerCount ?? 0) > 0),
            plannerCount: plannerCount ?? 0,
            meetingCount: calendarIntel?.meetingCount ?? 0,
            meetingMinutes: calendarIntel?.meetingMinutes ?? 0,
            longestFocusBlock: calendarIntel?.longestFocusBlock ?? 0,
            contextSwitches: calendarIntel?.contextSwitches ?? 0,
            dayType: calendarIntel?.dayType ?? null,
            overloadedPeriod: calendarIntel?.overloadedPeriod ?? null,
          }
        : undefined,
  });

  const fetchBriefing = async () => {
    if (!isPaid || !hasActiveSnapshot) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-briefing");
      if (error) throw error;
      if (data?.content) {
        setContent(data.content);
      }
    } catch (error) {
      console.error("Briefing fetch failed:", error);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    if (!isPaid || !hasActiveSnapshot || hasLoaded) return;
    fetchBriefing();
  }, [isPaid, hasActiveSnapshot, hasLoaded]);

  const structured = useMemo(() => tryParseStructured(content ?? ""), [content]);
  const briefingText =
    structured?.interpretation ??
    signals?.explanation ??
    getFallbackBriefing(content) ??
    "The read sharpens as more of your real-world signals come online. For now, keep the day simple and honest.";

  const dominantControllable = signals
    ? signals.supportMode === "stretch"
      ? signals.likelyControllableOpportunity
      : signals.likelyControllableAtRisk
    : null;
  const rosterProfile = dominantControllable ? getControllableRosterProfile(dominantControllable) : null;

  const secondaryLine = structured
    ? structured.day_type
    : rosterProfile
      ? `${rosterProfile.roleLabel} energy is leading the read today.`
      : "A calm read of the day, grounded in the signals you have connected.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary/60" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Signal Briefing
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{formatMode(signals?.supportMode)}</p>
        </div>

        {isPaid && hasActiveSnapshot ? (
          <button
            onClick={fetchBriefing}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50"
            title="Refresh briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {rosterProfile ? (
          <Badge variant="outline" className="text-[11px]">
            {rosterProfile.roleLabel}
          </Badge>
        ) : null}
        {dominantControllable ? (
          <Badge variant="secondary" className="text-[11px] capitalize">
            {dominantControllable}
          </Badge>
        ) : null}
      </div>

      <p className="text-base leading-relaxed text-foreground">{briefingText}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{secondaryLine}</p>
    </motion.div>
  );
}
