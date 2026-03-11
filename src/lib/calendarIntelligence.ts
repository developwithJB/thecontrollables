import type { PlannerItem } from "@/hooks/usePlanner";

export interface CalendarIntelligence {
  dayType: "heavy" | "light" | "focus" | "fragmented" | "recovery_window" | "admin_heavy" | "moderate";
  meetingCount: number;
  meetingMinutes: number;
  focusBlocks: { start: string; end: string; minutes: number }[];
  longestFocusBlock: number;
  contextSwitches: number;
  overloadedPeriod: "morning" | "afternoon" | "evening" | null;
  interpretation: string;
  plannerTip: string;
}

interface TimedEvent {
  start: number; // minutes from midnight
  end: number;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeRange(startMin: number, endMin: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const suffix = h >= 12 ? "pm" : "am";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return mm > 0 ? `${h12}:${String(mm).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

export function analyzeCalendar(items: PlannerItem[]): CalendarIntelligence | null {
  // Extract timed events (items with both start_time and end_time)
  const timedEvents: TimedEvent[] = items
    .filter((i) => i.start_time && i.end_time)
    .map((i) => ({
      start: timeToMinutes(i.start_time!),
      end: timeToMinutes(i.end_time!),
    }))
    .filter((e) => e.end > e.start)
    .sort((a, b) => a.start - b.start);

  // If no timed events, can still produce basic signals from item count
  if (timedEvents.length === 0 && items.length === 0) return null;

  const meetingCount = timedEvents.length;
  const meetingMinutes = timedEvents.reduce((sum, e) => sum + (e.end - e.start), 0);

  // Calculate focus blocks (gaps ≥ 45 min between meetings)
  const focusBlocks: { start: string; end: string; minutes: number }[] = [];
  const dayStart = 480; // 8am
  const dayEnd = 1080; // 6pm

  if (timedEvents.length === 0) {
    // Entire day is a focus block
    focusBlocks.push({
      start: formatTimeRange(dayStart, dayStart).split("–")[0],
      end: formatTimeRange(dayEnd, dayEnd).split("–")[0],
      minutes: dayEnd - dayStart,
    });
  } else {
    // Gap before first meeting
    if (timedEvents[0].start - dayStart >= 45) {
      const gap = timedEvents[0].start - dayStart;
      focusBlocks.push({
        start: formatTimeRange(dayStart, dayStart).split("–")[0],
        end: formatTimeRange(timedEvents[0].start, timedEvents[0].start).split("–")[0],
        minutes: gap,
      });
    }

    // Gaps between meetings
    for (let i = 0; i < timedEvents.length - 1; i++) {
      const gapStart = timedEvents[i].end;
      const gapEnd = timedEvents[i + 1].start;
      if (gapEnd - gapStart >= 45) {
        focusBlocks.push({
          start: formatTimeRange(gapStart, gapStart).split("–")[0],
          end: formatTimeRange(gapEnd, gapEnd).split("–")[0],
          minutes: gapEnd - gapStart,
        });
      }
    }

    // Gap after last meeting
    const lastEnd = timedEvents[timedEvents.length - 1].end;
    if (dayEnd - lastEnd >= 45) {
      focusBlocks.push({
        start: formatTimeRange(lastEnd, lastEnd).split("–")[0],
        end: formatTimeRange(dayEnd, dayEnd).split("–")[0],
        minutes: dayEnd - lastEnd,
      });
    }
  }

  const longestFocusBlock = focusBlocks.length > 0
    ? Math.max(...focusBlocks.map((b) => b.minutes))
    : 0;

  // Context switches: transitions with < 15 min gap
  let contextSwitches = 0;
  for (let i = 0; i < timedEvents.length - 1; i++) {
    if (timedEvents[i + 1].start - timedEvents[i].end < 15) {
      contextSwitches++;
    }
  }

  // Overloaded period
  const morningMeetings = timedEvents.filter((e) => e.start < 720).length; // before noon
  const afternoonMeetings = timedEvents.filter((e) => e.start >= 720).length;
  let overloadedPeriod: "morning" | "afternoon" | "evening" | null = null;
  if (meetingCount >= 3) {
    const morningRatio = morningMeetings / meetingCount;
    const afternoonRatio = afternoonMeetings / meetingCount;
    if (morningRatio > 0.6) overloadedPeriod = "morning";
    else if (afternoonRatio > 0.6) overloadedPeriod = "afternoon";
  }

  // Day type classification
  let dayType: CalendarIntelligence["dayType"];
  if (contextSwitches >= 4) {
    dayType = "fragmented";
  } else if (meetingMinutes >= 240) {
    dayType = "heavy";
  } else if (meetingCount <= 1 && longestFocusBlock >= 120) {
    dayType = "focus";
  } else if (meetingCount === 0 && items.length <= 2) {
    dayType = "recovery_window";
  } else if (meetingCount <= 2 && items.length <= 4) {
    dayType = "light";
  } else if (meetingCount >= 3 && meetingMinutes < 240) {
    dayType = "admin_heavy";
  } else {
    dayType = "moderate";
  }

  // Interpretation
  let interpretation: string;
  switch (dayType) {
    case "heavy":
      interpretation = `${meetingCount} meetings totaling ${minutesToLabel(meetingMinutes)}. Heavy schedule — protect energy between blocks.`;
      break;
    case "fragmented":
      interpretation = `${contextSwitches} back-to-back transitions today. High context-switching risk — batch similar tasks.`;
      break;
    case "focus":
      interpretation = `Light calendar with ${minutesToLabel(longestFocusBlock)} of unbroken focus time. Good day for deep work.`;
      break;
    case "recovery_window":
      interpretation = "Open schedule today — use this as recovery or strategic planning time.";
      break;
    case "light":
      interpretation = `${items.length} items, mostly flexible. Light day — good for proactive work.`;
      break;
    case "admin_heavy":
      interpretation = `${meetingCount} shorter meetings spread through the day. Admin-heavy — find one focus window.`;
      break;
    default:
      interpretation = `${meetingCount} meetings (${minutesToLabel(meetingMinutes)}), ${focusBlocks.length} focus window${focusBlocks.length !== 1 ? "s" : ""} available.`;
  }

  // Planner tip
  let plannerTip: string;
  if (dayType === "heavy" && overloadedPeriod === "afternoon") {
    plannerTip = "Afternoon is packed — front-load focus work before noon.";
  } else if (dayType === "heavy" && overloadedPeriod === "morning") {
    plannerTip = "Morning is meeting-heavy — save focused work for the afternoon.";
  } else if (dayType === "heavy") {
    plannerTip = "Heavy day — cut optional tasks and protect breaks between meetings.";
  } else if (dayType === "fragmented") {
    plannerTip = "Fragmented schedule — group similar tasks and minimize switching.";
  } else if (dayType === "focus" && longestFocusBlock >= 120) {
    plannerTip = `Use your ${minutesToLabel(longestFocusBlock)} focus block for your most important task.`;
  } else if (dayType === "recovery_window") {
    plannerTip = "Open day — good time for planning, reflection, or movement.";
  } else if (focusBlocks.length > 0) {
    const best = focusBlocks.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    plannerTip = `Best focus window: ${best.start}–${best.end} (${minutesToLabel(best.minutes)}).`;
  } else {
    plannerTip = "Moderate schedule — stay intentional with your energy allocation.";
  }

  return {
    dayType,
    meetingCount,
    meetingMinutes,
    focusBlocks,
    longestFocusBlock,
    contextSwitches,
    overloadedPeriod,
    interpretation,
    plannerTip,
  };
}
