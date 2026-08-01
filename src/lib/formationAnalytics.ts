export const FORMATION_EVENT_NAMES = [
  "landing_page_viewed",
  "path_selected",
  "book_status_selected",
  "onboarding_completed",
  "starting_charge_completed",
  "covenant_created",
  "formation_journey_started",
  "formation_day_opened",
  "circuit_started",
  "circuit_completed",
  "day_completed",
  "recovery_win_recorded",
  "attempt_ended",
  "new_attempt_started",
  "formation_season_reached",
  "read_along_chapter_completed",
  "witness_act_started",
  "witness_act_completed",
  "weekly_review_completed",
  "journey_completed",
  "share_previewed",
  "milestone_shared",
  "email_delivered",
  "email_opened",
  "deep_link_opened",
] as const;

export type FormationEventName = (typeof FORMATION_EVENT_NAMES)[number];

export type FormationAnalyticsValue = string | number | boolean | null;
export type FormationAnalyticsProperties = Partial<Record<
  | "track"
  | "circuit"
  | "day_number"
  | "season"
  | "outcome"
  | "source"
  | "chapter_id"
  | "witness_act"
  | "email_kind"
  | "deep_link_kind"
  | "experiment_id"
  | "variant"
  | "reason_category"
  | "count"
  | "is_recovery"
  | "sync_state",
  FormationAnalyticsValue
>>;

export interface FormationAnalyticsEvent {
  name: FormationEventName;
  properties: FormationAnalyticsProperties;
}

export const FORMATION_ANALYTICS_ALLOWED_KEYS = [
  "track",
  "circuit",
  "day_number",
  "season",
  "outcome",
  "source",
  "chapter_id",
  "witness_act",
  "email_kind",
  "deep_link_kind",
  "experiment_id",
  "variant",
  "reason_category",
  "count",
  "is_recovery",
  "sync_state",
] as const;

export const FORMATION_ANALYTICS_FORBIDDEN_TERMS = [
  "prayer",
  "reflection",
  "proof",
  "url",
  "health",
  "covenant",
  "nutrition",
  "hydration",
  "service_recipient",
  "recipient",
  "witness_note",
  "gratitude",
  "control",
  "release",
  "ego",
  "scripture_annotation",
  "note",
  "text",
  "quote",
] as const;

const ALLOWED_KEY_SET = new Set<string>(FORMATION_ANALYTICS_ALLOWED_KEYS);

export function validateFormationAnalyticsEvent(event: FormationAnalyticsEvent): FormationAnalyticsEvent {
  if (!FORMATION_EVENT_NAMES.includes(event.name)) throw new Error("Unknown formation analytics event.");
  const safeProperties: FormationAnalyticsProperties = {};
  for (const [key, value] of Object.entries(event.properties)) {
    const normalizedKey = key.toLowerCase();
    if (!ALLOWED_KEY_SET.has(key) || FORMATION_ANALYTICS_FORBIDDEN_TERMS.some((term) => normalizedKey.includes(term))) {
      throw new Error(`Sensitive or unsupported formation analytics property: ${key}`);
    }
    if (value === undefined) continue;
    if (!["string", "number", "boolean"].includes(typeof value) && value !== null) {
      throw new Error(`Unsupported formation analytics value for: ${key}`);
    }
    if (typeof value === "string") {
      if (value.length > 80 || /https?:\/\/|data:|@/.test(value)) throw new Error(`Unsafe formation analytics value for: ${key}`);
      safeProperties[key as keyof FormationAnalyticsProperties] = value;
    } else {
      safeProperties[key as keyof FormationAnalyticsProperties] = value;
    }
  }
  return { name: event.name, properties: safeProperties };
}

export const FORMATION_EXPERIMENT_SURFACES = ["layout", "guidance_timing", "navigation", "copy_density"] as const;
export type FormationExperimentSurface = (typeof FORMATION_EXPERIMENT_SURFACES)[number];

export function validateFormationExperiment(input: {
  id: string;
  surface: FormationExperimentSurface;
  variant: string;
}): typeof input {
  if (!FORMATION_EXPERIMENT_SURFACES.includes(input.surface)) {
    throw new Error("Formation experiments cannot alter theology, privacy defaults, completion rules, or safety requirements.");
  }
  if (!/^[a-z0-9_-]{1,64}$/.test(input.id) || !/^[a-z0-9_-]{1,32}$/.test(input.variant)) {
    throw new Error("Invalid formation experiment identifier.");
  }
  return input;
}
