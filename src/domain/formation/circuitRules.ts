import {
  CIRCUIT_DEFINITIONS,
  type CircuitActionId,
  type CircuitCompletionState,
  type CircuitType,
  type FormationCircuitDraft,
  type TrainingTrack,
} from "./circuits";

import { isSabbath, type SabbathContext } from "./sabbath";

const STRICT_REQUIRED_ACTIONS: Record<CircuitType, readonly CircuitActionId[]> = {
  awareness: ["scripture_opened", "reading_completed", "honest_truth_saved"],
  perspective: ["prayer_practiced", "gratitude_recorded", "control_release_move_recorded", "smaller_faithful_action"],
  habit: ["main_promise_named", "main_promise_completed"],
  wellness: [
    "nutrition_covenant_honored",
    "hydration_covenant_honored",
    "movement_block_one",
    "movement_block_two",
    "outdoor_movement",
  ],
  environment: ["friction_removed", "tomorrow_prepared", "service_completed"],
};

export interface CircuitEvaluation {
  state: CircuitCompletionState;
  completedActionIds: CircuitActionId[];
  missingRequiredActionIds: CircuitActionId[];
  requiredActionIds: readonly CircuitActionId[];
  recommendedActionIds: readonly CircuitActionId[];
  recordedCount: number;
  totalCount: number;
  isSatisfiedForTrack: boolean;
  statusLabel: string;
  statusDescription: string;
}

const hasText = (draft: FormationCircuitDraft, key: string) => Boolean(draft.fields[key]?.trim());

export function deriveCompletedActions(circuit: CircuitType, draft: FormationCircuitDraft, context?: SabbathContext | null): CircuitActionId[] {
  const completed = new Set<CircuitActionId>();
  for (const [actionId, value] of Object.entries(draft.actions)) {
    if (value && actionId !== "rest_or_walk") completed.add(actionId as CircuitActionId);
  }

  if (circuit === "awareness") {
    if (hasText(draft, "honestTruth")) completed.add("honest_truth_saved");
  }

  if (circuit === "perspective") {
    if (hasText(draft, "gratitude")) completed.add("gratitude_recorded");
    if (hasText(draft, "control") && hasText(draft, "release") && hasText(draft, "move")) {
      completed.add("control_release_move_recorded");
    }
    if (hasText(draft, "egoResponse")) completed.add("ego_signal_responded");
    if (hasText(draft, "faithfulAction")) completed.add("smaller_faithful_action");
  }

  if (circuit === "habit") {
    if (hasText(draft, "mainPromise")) completed.add("main_promise_named");
    if (hasText(draft, "recoveryReflection")) completed.add("recovery_reflection_recorded");
  }

  if (circuit === "wellness") {
    if (draft.movement.one.completed && Boolean(draft.movement.one.description.trim())) completed.add("movement_block_one");
    if (draft.movement.two.completed && Boolean(draft.movement.two.description.trim())) completed.add("movement_block_two");
    if (
      (draft.movement.one.completed && draft.movement.one.outdoors) ||
      (draft.movement.two.completed && draft.movement.two.outdoors) ||
      draft.movement.one.adaptation === "indoor_safety_alternative" ||
      draft.movement.two.adaptation === "indoor_safety_alternative"
    ) {
      completed.add("outdoor_movement");
    }
    if (draft.movement.one.adaptation !== "standard" || draft.movement.two.adaptation !== "standard") {
      completed.add("adapted_movement");
    }
  }

  if (circuit === "environment") {
    if (hasText(draft, "frictionRemoved")) completed.add("friction_removed");
    if (hasText(draft, "tomorrowPrepared")) completed.add("tomorrow_prepared");
  }

  if (circuit === "wellness" && isSabbath(context) && draft.actions.rest_or_walk &&
    hasText(draft, "restOrWalk") && draft.fields.restOrWalk.trim().length <= 500) completed.add("rest_or_walk");
  const result = CIRCUIT_DEFINITIONS[circuit].actions
    .map((action) => action.id)
    .filter((actionId) => completed.has(actionId));
  return completed.has("rest_or_walk") ? [...result, "rest_or_walk"] : result;
}

export function getRequiredActionIds(track: TrainingTrack, circuit: CircuitType, context?: SabbathContext | null): readonly CircuitActionId[] {
  if (track === "fully_charged_75" && circuit === "wellness" && isSabbath(context)) return ["nutrition_covenant_honored", "hydration_covenant_honored", "rest_or_walk"];
  return track === "fully_charged_75" ? STRICT_REQUIRED_ACTIONS[circuit] : [];
}

export function evaluateCircuit(
  track: TrainingTrack,
  circuit: CircuitType,
  draft: FormationCircuitDraft,
  context?: SabbathContext | null,
): CircuitEvaluation {
  const completedActionIds = deriveCompletedActions(circuit, draft, context);
  const allActionIds = CIRCUIT_DEFINITIONS[circuit].actions.map((action) => action.id);
  const requiredActionIds = getRequiredActionIds(track, circuit, context);
  const missingRequiredActionIds = requiredActionIds.filter((id) => !completedActionIds.includes(id));
  const hasActivity = completedActionIds.length > 0 || Boolean(draft.reflection.trim()) || Boolean(draft.proof);

  let state: CircuitCompletionState;
  let statusLabel: string;
  let statusDescription: string;
  let isSatisfiedForTrack: boolean;

  if (track === "fully_charged_75") {
    isSatisfiedForTrack = missingRequiredActionIds.length === 0;
    state = isSatisfiedForTrack ? "complete" : hasActivity ? "in_progress" : "not_started";
    statusLabel = isSatisfiedForTrack ? "Circuit complete" : hasActivity ? "In progress" : "Ready to begin";
    statusDescription = isSatisfiedForTrack
      ? "Every required practice is recorded for today."
      : `${missingRequiredActionIds.length} required ${missingRequiredActionIds.length === 1 ? "practice remains" : "practices remain"}.`;
  } else if (track === "charge_40") {
    isSatisfiedForTrack = completedActionIds.length > 0;
    state = completedActionIds.length === allActionIds.length
      ? "complete"
      : isSatisfiedForTrack
        ? "recorded"
        : hasActivity
          ? "in_progress"
          : "not_started";
    statusLabel = state === "complete" ? "Circuit complete" : isSatisfiedForTrack ? "Practice recorded" : "Ready to practice";
    statusDescription = isSatisfiedForTrack
      ? `${completedActionIds.length} of ${allActionIds.length} practices recorded. Partial progress remains honest progress.`
      : "Record one useful practice today; missing work will not restart this journey.";
  } else {
    isSatisfiedForTrack = completedActionIds.length > 0;
    state = isSatisfiedForTrack ? "recorded" : hasActivity ? "in_progress" : "not_started";
    statusLabel = isSatisfiedForTrack ? "Practice recorded" : "Optional practice";
    statusDescription = isSatisfiedForTrack
      ? "Your reading companion has saved this practice without creating a streak or deadline."
      : "Choose one practice that supports the chapter you are reading.";
  }

  return {
    state,
    completedActionIds,
    missingRequiredActionIds,
    requiredActionIds,
    recommendedActionIds: allActionIds.filter((id) => !requiredActionIds.includes(id)),
    recordedCount: completedActionIds.length,
    totalCount: allActionIds.length,
    isSatisfiedForTrack,
    statusLabel,
    statusDescription,
  };
}

export function getActionLabel(circuit: CircuitType, actionId: CircuitActionId): string {
  if (actionId === "rest_or_walk") return "Rest or a gentle walk";
  return CIRCUIT_DEFINITIONS[circuit].actions.find((action) => action.id === actionId)?.shortLabel ?? actionId;
}

export function createCircuitIdempotencyKey(
  userId: string,
  localDate: string,
  track: TrainingTrack,
  circuit: CircuitType,
): string {
  return `formation:${userId}:${localDate}:${track}:${circuit}`;
}

export function getLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
