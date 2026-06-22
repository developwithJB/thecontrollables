export const MISSION_CONTROLLABLE_IDS = [
  "awareness",
  "perspective",
  "habit",
  "wellness",
  "environment",
] as const;

export type MissionControllableId = (typeof MISSION_CONTROLLABLE_IDS)[number];

export const MISSION_DAY_MODES = [
  "Recovery Day",
  "Focus Day",
  "Reset Day",
  "Momentum Day",
  "Build Day",
] as const;

export type MissionDayMode = (typeof MISSION_DAY_MODES)[number];

export interface MissionOfTheDay {
  date: string;
  dayMode: MissionDayMode;
  targetControllable: MissionControllableId;
  missionTitle: string;
  missionInstruction: string;
  shortWhy: string;
  xpReward: number;
  selfTrustReward: number;
  chargeStageImpact: string;
  appCtaLabel: string;
  appCtaUrl: string;
  completed: boolean;
}

export interface MissionEmailPayload {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  mission: MissionOfTheDay;
}

export interface DashboardRelaunchEmailPayload {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  appCtaUrl: string;
}

export interface BuildDashboardRelaunchEmailInput {
  displayName?: string | null;
  appCtaUrl?: string | null;
}

export interface BuildMissionOfTheDayInput {
  date?: string | null;
  dayMode?: string | null;
  targetControllable?: unknown;
  missionTitle?: string | null;
  missionInstruction?: string | null;
  shortWhy?: string | null;
  xpReward?: number | null;
  selfTrustReward?: number | null;
  chargeStageImpact?: string | null;
  appCtaLabel?: string | null;
  appCtaUrl?: string | null;
  completed?: boolean | null;
}

export interface MissionGuideInsightInput {
  guide_id?: unknown;
  guide_name?: string | null;
  recommended_action?: string | null;
  insight?: string | null;
  confidence?: string | null;
}

export interface BuildMissionFromPlanInput extends BuildMissionOfTheDayInput {
  guideInsights?: MissionGuideInsightInput[] | null;
  nextActions?: Array<string | null | undefined> | null;
  nextMove?: string | null;
  mainPriority?: string | null;
}

export const MISSION_CONTROLLABLE_NAMES: Record<MissionControllableId, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

export const CONTROLLABLE_MISSION_TEMPLATES: Record<
  MissionControllableId,
  Pick<
    MissionOfTheDay,
    "missionTitle" | "missionInstruction" | "shortWhy" | "xpReward" | "selfTrustReward" | "chargeStageImpact"
  >
> = {
  awareness: {
    missionTitle: "Charge Awareness",
    missionInstruction: "Take one quiet minute before your first reaction.",
    shortWhy: "Space turns reaction into response.",
    xpReward: 40,
    selfTrustReward: 10,
    chargeStageImpact: "Awareness charge progress.",
  },
  perspective: {
    missionTitle: "Charge Perspective",
    missionInstruction: "Name one thing that is still true.",
    shortWhy: "A wider view calms the circuit.",
    xpReward: 40,
    selfTrustReward: 10,
    chargeStageImpact: "Perspective charge progress.",
  },
  habit: {
    missionTitle: "Charge Habit",
    missionInstruction: "Keep one small promise before noon.",
    shortWhy: "Consistency rewires the circuit.",
    xpReward: 40,
    selfTrustReward: 10,
    chargeStageImpact: "Habit charge progress.",
  },
  wellness: {
    missionTitle: "Charge Wellness",
    missionInstruction: "Take one recovery action.",
    shortWhy: "A charged foundation makes cleaner choices.",
    xpReward: 40,
    selfTrustReward: 10,
    chargeStageImpact: "Wellness charge progress.",
  },
  environment: {
    missionTitle: "Charge Environment",
    missionInstruction: "Clear one friction point from your space.",
    shortWhy: "The room can support the rep.",
    xpReward: 40,
    selfTrustReward: 10,
    chargeStageImpact: "Environment charge progress.",
  },
};

const MS_PER_DAY = 86_400_000;

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, " ");

const getDateIndex = (date: string | null | undefined): number => {
  if (!date) return 0;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return 0;
  return Math.floor(timestamp / MS_PER_DAY);
};

export const getFallbackControllableForDate = (date?: string | null): MissionControllableId => {
  const index = Math.abs(getDateIndex(date)) % MISSION_CONTROLLABLE_IDS.length;
  return MISSION_CONTROLLABLE_IDS[index];
};

export const isMissionControllableId = (value: unknown): value is MissionControllableId => {
  return MISSION_CONTROLLABLE_IDS.includes(value as MissionControllableId);
};

export const normalizeMissionControllableId = (
  value: unknown,
  fallback: MissionControllableId = "habit",
): MissionControllableId => {
  if (isMissionControllableId(value)) return value;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (isMissionControllableId(normalized)) return normalized;

  const byName = MISSION_CONTROLLABLE_IDS.find(
    (id) => MISSION_CONTROLLABLE_NAMES[id].toLowerCase() === value.trim().toLowerCase(),
  );
  return byName || fallback;
};

export const normalizeMissionDayMode = (
  value: string | null | undefined,
  date?: string | null,
): MissionDayMode => {
  if (value) {
    const exact = MISSION_DAY_MODES.find((mode) => mode.toLowerCase() === value.trim().toLowerCase());
    if (exact) return exact;

    const normalized = value.toLowerCase();
    if (/\brecover|rest|protect|light|space|low\b/.test(normalized)) return "Recovery Day";
    if (/\bfocus|deep|clear\b/.test(normalized)) return "Focus Day";
    if (/\breset|drift|chaos|busy|return\b/.test(normalized)) return "Reset Day";
    if (/\bmomentum|steady|flow|charge\b/.test(normalized)) return "Momentum Day";
    if (/\bbuild|execute|train|practice\b/.test(normalized)) return "Build Day";
  }

  const index = Math.abs(getDateIndex(date)) % MISSION_DAY_MODES.length;
  return MISSION_DAY_MODES[index];
};

const trimTrailingPunctuation = (value: string): string => normalizeWhitespace(value).replace(/[.!?]+$/g, "");

export const toMissionSentence = (value: string | null | undefined, maxWords = 12): string => {
  if (!value) return "";
  const normalized = normalizeWhitespace(value);
  const [firstSentence] = normalized.split(/(?<=[.!?])\s+/);
  const words = (firstSentence || normalized).split(/\s+/);
  const compact = words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}...` : words.join(" ");
  return /[.!?]$/.test(compact) ? compact : `${compact}.`;
};

export const buildMissionOfTheDay = (input: BuildMissionOfTheDayInput = {}): MissionOfTheDay => {
  const date = input.date || new Date().toLocaleDateString("sv-SE");
  const fallbackControllable = getFallbackControllableForDate(date);
  const targetControllable = normalizeMissionControllableId(input.targetControllable, fallbackControllable);
  const template = CONTROLLABLE_MISSION_TEMPLATES[targetControllable];

  return {
    date,
    dayMode: normalizeMissionDayMode(input.dayMode, date),
    targetControllable,
    missionTitle: toMissionSentence(input.missionTitle || template.missionTitle, 6).replace(/[.]$/g, ""),
    missionInstruction: toMissionSentence(input.missionInstruction || template.missionInstruction, 12),
    shortWhy: toMissionSentence(input.shortWhy || template.shortWhy, 10),
    xpReward: typeof input.xpReward === "number" && input.xpReward > 0 ? input.xpReward : template.xpReward,
    selfTrustReward:
      typeof input.selfTrustReward === "number" && input.selfTrustReward > 0
        ? input.selfTrustReward
        : template.selfTrustReward,
    chargeStageImpact: toMissionSentence(input.chargeStageImpact || template.chargeStageImpact, 9),
    appCtaLabel: normalizeWhitespace(input.appCtaLabel || "Open The Dashboard"),
    appCtaUrl: normalizeWhitespace(input.appCtaUrl || "https://thedashboard.agbcoaching.com/home"),
    completed: input.completed === true,
  };
};

const chooseMissionGuide = (guides: MissionGuideInsightInput[] = []): MissionGuideInsightInput | null => {
  return (
    guides.find((guide) => guide.confidence === "High" && guide.recommended_action) ||
    guides.find((guide) => guide.recommended_action) ||
    guides[0] ||
    null
  );
};

export const buildMissionOfTheDayFromPlan = (input: BuildMissionFromPlanInput): MissionOfTheDay => {
  const guide = chooseMissionGuide(input.guideInsights || []);
  const targetControllable = normalizeMissionControllableId(
    input.targetControllable || guide?.guide_id,
    getFallbackControllableForDate(input.date),
  );
  const template = CONTROLLABLE_MISSION_TEMPLATES[targetControllable];
  const firstAction = input.nextActions?.find((action): action is string => Boolean(action?.trim()));
  const instruction = guide?.recommended_action || firstAction || input.nextMove || input.mainPriority || template.missionInstruction;
  const why = guide?.insight || input.shortWhy || template.shortWhy;

  return buildMissionOfTheDay({
    ...input,
    targetControllable,
    missionTitle: input.missionTitle || template.missionTitle,
    missionInstruction: instruction,
    shortWhy: why,
  });
};

export const getMissionEmailSubject = (mission: MissionOfTheDay): string => {
  return `Today's Training Drop: Charge ${MISSION_CONTROLLABLE_NAMES[mission.targetControllable]}`;
};

export const getMissionEmailPreview = (mission: MissionOfTheDay): string => {
  const controllableName = MISSION_CONTROLLABLE_NAMES[mission.targetControllable];
  return `Train ${controllableName}: ${trimTrailingPunctuation(mission.missionInstruction)}. +${mission.xpReward} ${controllableName} XP.`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const renderMissionEmailText = (mission: MissionOfTheDay): string => {
  const controllableName = MISSION_CONTROLLABLE_NAMES[mission.targetControllable];
  return [
    "Today's Training Drop",
    "Train one Controllable. Earn XP. Build Self-Trust. Add proof to your deck.",
    "",
    "Card to train:",
    mission.missionTitle,
    "",
    "Today's rep:",
    mission.missionInstruction,
    "",
    "Why:",
    mission.shortWhy,
    "",
    "Rewards:",
    `+${mission.xpReward} ${controllableName} XP`,
    `+${mission.selfTrustReward} Self-Trust`,
    "Proof Loop: add a photo or note after you complete it.",
    "",
    `${mission.appCtaLabel}: ${mission.appCtaUrl}`,
    "",
    "Control the Controllables one day at a time.",
  ].join("\n");
};

export const renderMissionEmailHtml = (mission: MissionOfTheDay): string => {
  const controllableName = MISSION_CONTROLLABLE_NAMES[mission.targetControllable];
  const preview = getMissionEmailPreview(mission);
  const accent = "#38bdf8";
  const ink = "#e5eefc";
  const muted = "#8d99ae";
  const panel = "#0f1522";

  return `
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:transparent;">
      ${escapeHtml(preview)}
    </div>
    <div style="margin:0;padding:32px 16px;background:#060a12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${ink};">
      <div style="max-width:480px;margin:0 auto;">
        <div style="border:1px solid #1d2b40;border-radius:20px;background:${panel};padding:24px;">
          <p style="margin:0 0 10px 0;color:${accent};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
            Today's Training Drop
          </p>
          <h1 style="margin:0 0 18px 0;color:#f8fbff;font-size:28px;line-height:1.12;font-weight:800;">
            ${escapeHtml(mission.missionTitle)}
          </h1>
          <p style="margin:-8px 0 18px 0;color:${muted};font-size:14px;line-height:1.45;">
            Train one Controllable. Earn XP. Build Self-Trust. Add proof to your deck.
          </p>

          <div style="border:1px solid #22314a;border-radius:16px;background:#0a1020;padding:18px;margin:0 0 16px 0;">
            <p style="margin:0 0 8px 0;color:${muted};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
              Today's rep
            </p>
            <p style="margin:0;color:#f8fbff;font-size:20px;line-height:1.35;font-weight:700;">
              ${escapeHtml(mission.missionInstruction)}
            </p>
          </div>

          <div style="border:1px solid #22314a;border-radius:16px;background:#0a1020;padding:16px;margin:0 0 16px 0;">
            <p style="margin:0 0 8px 0;color:${muted};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
              Why
            </p>
            <p style="margin:0;color:${ink};font-size:15px;line-height:1.45;">
              ${escapeHtml(mission.shortWhy)}
            </p>
          </div>

          <div style="margin:0 0 22px 0;">
            <p style="margin:0 0 10px 0;color:${muted};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
              Rewards
            </p>
            <span style="display:inline-block;margin:0 6px 8px 0;border:1px solid rgba(56,189,248,0.45);border-radius:999px;background:rgba(56,189,248,0.14);color:#dff5ff;padding:8px 12px;font-size:14px;font-weight:700;">
              +${mission.xpReward} ${escapeHtml(controllableName)} XP
            </span>
            <span style="display:inline-block;margin:0 0 8px 0;border:1px solid rgba(148,163,184,0.35);border-radius:999px;background:rgba(148,163,184,0.12);color:#edf2ff;padding:8px 12px;font-size:14px;font-weight:700;">
              +${mission.selfTrustReward} Self-Trust
            </span>
            <p style="margin:6px 0 0 0;color:${muted};font-size:13px;line-height:1.45;">
              Proof Loop: add a photo or note after you complete it.
            </p>
          </div>

          <a href="${escapeHtml(mission.appCtaUrl)}" style="display:block;border-radius:14px;background:${accent};color:#03111f;text-align:center;text-decoration:none;font-size:16px;font-weight:800;padding:15px 18px;">
            ${escapeHtml(mission.appCtaLabel)}
          </a>

          <p style="margin:18px 0 0 0;color:${muted};font-size:13px;line-height:1.45;text-align:center;">
            Control the Controllables one day at a time.
          </p>
        </div>
      </div>
    </div>
  `;
};

export const buildMissionEmailPayload = (mission: MissionOfTheDay): MissionEmailPayload => {
  return {
    subject: getMissionEmailSubject(mission),
    previewText: getMissionEmailPreview(mission),
    html: renderMissionEmailHtml(mission),
    text: renderMissionEmailText(mission),
    mission,
  };
};

const DEFAULT_DASHBOARD_RELAUNCH_CTA_URL = "https://thedashboard.agbcoaching.com/quick-start";

export const buildDashboardRelaunchEmailPayload = (
  input: BuildDashboardRelaunchEmailInput = {},
): DashboardRelaunchEmailPayload => {
  const appCtaUrl = normalizeWhitespace(input.appCtaUrl || DEFAULT_DASHBOARD_RELAUNCH_CTA_URL);
  const displayName = normalizeWhitespace(input.displayName || "");
  const greeting = displayName ? `Good morning ${displayName},` : "Good morning,";
  const subject = "The new Dashboard is ready";
  const previewText = "Start the new onboarding and see the new Controllables training loop.";

  const text = [
    subject,
    "",
    greeting,
    "",
    "The Dashboard has changed.",
    "The book gave you the language. The app now gives you the reps.",
    "",
    "Start with one honest read:",
    "- Starting Charge: find your current charge in 60 seconds.",
    "- Daily Charge: save today's Control / Release / Move note.",
    "- My Controllables: train your cards and build Self-Trust.",
    "- Proof Dex: collect private proof of real-life reps.",
    "",
    `Start the new onboarding: ${appCtaUrl}`,
    "",
    "Control the Controllables one day at a time.",
  ].join("\n");

  const html = `
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:transparent;">
      ${escapeHtml(previewText)}
    </div>
    <div style="margin:0;padding:32px 16px;background:#060a12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#e5eefc;">
      <div style="max-width:500px;margin:0 auto;">
        <div style="border:1px solid #1d2b40;border-radius:24px;background:#0f1522;padding:26px;">
          <p style="margin:0 0 12px 0;color:#38bdf8;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
            New Dashboard
          </p>
          <h1 style="margin:0 0 12px 0;color:#f8fbff;font-size:30px;line-height:1.1;font-weight:850;">
            The practice begins again.
          </h1>
          <p style="margin:0 0 22px 0;color:#a8b3c7;font-size:15px;line-height:1.55;">
            ${escapeHtml(greeting)} The Dashboard has changed. The book gave you the language. The app now gives you the reps.
          </p>

          <div style="border:1px solid #22314a;border-radius:18px;background:#0a1020;padding:18px;margin:0 0 18px 0;">
            <p style="margin:0 0 12px 0;color:#8d99ae;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
              Start with one honest read
            </p>
            <p style="margin:0 0 10px 0;color:#f8fbff;font-size:16px;line-height:1.45;"><strong>Starting Charge</strong> — find your current charge in 60 seconds.</p>
            <p style="margin:0 0 10px 0;color:#f8fbff;font-size:16px;line-height:1.45;"><strong>Daily Charge</strong> — save today's Control / Release / Move note.</p>
            <p style="margin:0 0 10px 0;color:#f8fbff;font-size:16px;line-height:1.45;"><strong>My Controllables</strong> — train your cards and build Self-Trust.</p>
            <p style="margin:0;color:#f8fbff;font-size:16px;line-height:1.45;"><strong>Proof Dex</strong> — collect private proof of real-life reps.</p>
          </div>

          <a href="${escapeHtml(appCtaUrl)}" style="display:block;border-radius:14px;background:#38bdf8;color:#03111f;text-align:center;text-decoration:none;font-size:16px;font-weight:850;padding:15px 18px;">
            Start the new onboarding
          </a>

          <p style="margin:18px 0 0 0;color:#8d99ae;font-size:13px;line-height:1.45;text-align:center;">
            Control the Controllables one day at a time.
          </p>
        </div>
      </div>
    </div>
  `;

  return {
    subject,
    previewText,
    html,
    text,
    appCtaUrl,
  };
};

export const MISSION_EMAIL_FORBIDDEN_PATTERNS = [
  /\bprivate reflections?\b/i,
  /\bmoney\b/i,
  /\bcalendar\b/i,
  /\bjournal\b/i,
  /\bai guidance\b/i,
  /\bavoided promises?\b/i,
  /\brelease text\b/i,
  /\breset vision\b/i,
];

export const isPrivacySafeMissionEmailPayload = (payload: MissionEmailPayload): boolean => {
  const combined = [
    payload.subject,
    payload.previewText,
    payload.html,
    payload.text,
  ].join(" ");

  return !MISSION_EMAIL_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(combined));
};

export const isPrivacySafeDashboardRelaunchEmailPayload = (payload: DashboardRelaunchEmailPayload): boolean => {
  const combined = [
    payload.subject,
    payload.previewText,
    payload.html,
    payload.text,
  ].join(" ");

  return !MISSION_EMAIL_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(combined));
};
