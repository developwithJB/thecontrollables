export const TIMELINE_EMAIL_CONTROLLABLES = [
  "awareness",
  "perspective",
  "habit",
  "wellness",
  "environment",
] as const;

export type TimelineEmailControllable = (typeof TIMELINE_EMAIL_CONTROLLABLES)[number];

export interface TimelineEmailMoment {
  eventType: string;
  occurredAt: string;
  netImpact: number;
  impacts: Array<{ controllable: TimelineEmailControllable; delta: number }>;
}

export interface TimelineEmailRecap {
  date: string;
  overallScore: number;
  netImpact: number;
  eventCount: number;
  categoryScores: Record<TimelineEmailControllable, number>;
  moments: TimelineEmailMoment[];
  nextMove: string;
  timelineUrl: string;
}

const LABELS: Record<TimelineEmailControllable, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

const EVENT_LABELS: Record<string, string> = {
  action_completed: "Rep completed",
  awareness_checkin: "Awareness check-in",
  daily_practice: "Daily Charge practiced",
  goal_training: "Goal training logged",
  meal: "Meal logged",
  meal_logged: "Meal logged",
  mission_completed: "Mission completed",
  planner_completed: "Plan completed",
  planner_skipped: "Plan changed",
  promise_kept: "Promise kept",
  promise_made: "Promise set",
  promise_unkept: "Promise needs an honest read",
  recovery: "Recovery protected",
  recovery_recorded: "Recovery recorded",
  reflection: "Reflection completed",
  sleep_recorded: "Sleep recorded",
  workout: "Workout completed",
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const signed = (value: number): string => `${value > 0 ? "+" : ""}${value}`;

export const getSafeTimelineMomentTitle = (eventType: string): string =>
  EVENT_LABELS[eventType] ?? "Moment recorded";

export const getTimelineEmailNextMove = (
  scores: Record<TimelineEmailControllable, number>,
): string => {
  const lowest = TIMELINE_EMAIL_CONTROLLABLES.reduce((current, candidate) =>
    scores[candidate] < scores[current] ? candidate : current,
  );
  const moves: Record<TimelineEmailControllable, string> = {
    awareness: "Name what is true before the day speeds up.",
    perspective: "Reframe one heavy story before it hardens.",
    habit: "Keep one small promise before the day ends.",
    wellness: "Protect food, water, movement, or recovery next.",
    environment: "Remove one point of friction around you.",
  };
  return moves[lowest];
};

export const renderTimelineEmailRecapText = (recap: TimelineEmailRecap): string => {
  const momentLines = recap.moments.map((moment) => {
    const impact = moment.impacts.length
      ? moment.impacts.map((item) => `${signed(item.delta)} ${LABELS[item.controllable]}`).join(" | ")
      : "Neutral";
    return `- ${getSafeTimelineMomentTitle(moment.eventType)}: ${impact}`;
  });

  return [
    "YESTERDAY ON YOUR DASHBOARD",
    `Daily Charge: ${recap.overallScore}/100 (${signed(recap.netImpact)})`,
    ...momentLines,
    `Next honest move: ${recap.nextMove}`,
    `See the full timeline: ${recap.timelineUrl}`,
  ].join("\n");
};

export const renderTimelineEmailRecapHtml = (recap: TimelineEmailRecap): string => {
  const moments = recap.moments.map((moment) => {
    const impact = moment.impacts.length
      ? moment.impacts.map((item) => `${signed(item.delta)} ${LABELS[item.controllable]}`).join(" &nbsp; ")
      : "Neutral";
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #1d2b40;color:#dce7f5;font-size:13px;">${escapeHtml(getSafeTimelineMomentTitle(moment.eventType))}</td>
        <td style="padding:8px 0;border-bottom:1px solid #1d2b40;color:${moment.netImpact < 0 ? "#fda4af" : moment.netImpact > 0 ? "#86efac" : "#8d99ae"};font-size:12px;font-weight:700;text-align:right;">${impact}</td>
      </tr>
    `;
  }).join("");

  const categoryBars = TIMELINE_EMAIL_CONTROLLABLES.map((controllable) => `
    <td style="width:20%;padding:0 3px;text-align:center;vertical-align:bottom;">
      <div style="height:4px;border-radius:99px;background:#202b3c;overflow:hidden;">
        <div style="width:${Math.max(0, Math.min(100, recap.categoryScores[controllable]))}%;height:4px;background:#55c7ff;"></div>
      </div>
      <p style="margin:5px 0 0;color:#8d99ae;font-size:9px;white-space:nowrap;overflow:hidden;">${LABELS[controllable]}</p>
    </td>
  `).join("");

  return `
    <div style="margin:0;padding:0 16px 30px;background:#060a12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#e5eefc;">
      <div style="max-width:500px;margin:0 auto;border:1px solid #1d2b40;border-radius:18px;background:#0a1020;padding:18px;">
        <table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;">
          <tr>
            <td>
              <p style="margin:0 0 4px;color:#8d99ae;font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Yesterday on your Dashboard</p>
              <p style="margin:0;color:#f8fbff;font-size:18px;font-weight:800;">Daily Charge ${recap.overallScore}</p>
            </td>
            <td style="text-align:right;color:${recap.netImpact < 0 ? "#fda4af" : "#86efac"};font-size:15px;font-weight:800;">${signed(recap.netImpact)}</td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin:0 0 14px 0;"><tr>${categoryBars}</tr></table>
        ${moments ? `<table style="width:100%;border-collapse:collapse;margin:0 0 14px 0;">${moments}</table>` : ""}
        <p style="margin:0 0 14px;color:#a8b3c7;font-size:13px;line-height:1.45;"><strong style="color:#f8fbff;">Next honest move:</strong> ${escapeHtml(recap.nextMove)}</p>
        <a href="${escapeHtml(recap.timelineUrl)}" style="display:block;border:1px solid #29405c;border-radius:10px;color:#7dd3fc;text-align:center;text-decoration:none;font-size:13px;font-weight:800;padding:11px 14px;">See your full timeline</a>
        <p style="margin:12px 0 0;color:#657287;font-size:10px;line-height:1.4;text-align:center;">Private activity details stay inside The Dashboard.</p>
      </div>
    </div>
  `;
};

export const appendTimelineEmailRecap = (
  html: string,
  text: string | undefined,
  recap: TimelineEmailRecap | null,
): { html: string; text: string | undefined } => {
  if (!recap) return { html, text };
  return {
    html: `${html}${renderTimelineEmailRecapHtml(recap)}`,
    text: text ? `${text}\n\n${renderTimelineEmailRecapText(recap)}` : renderTimelineEmailRecapText(recap),
  };
};
