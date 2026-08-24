export const FORMATION_RULE_VERSION = "formation-circuits-v1" as const;

export const TRAINING_TRACKS = ["read_along", "charge_40", "fully_charged_75"] as const;
export type TrainingTrack = (typeof TRAINING_TRACKS)[number];

export const CIRCUIT_TYPES = ["awareness", "perspective", "habit", "wellness", "environment"] as const;
export type CircuitType = (typeof CIRCUIT_TYPES)[number];

export const MOVEMENT_ADAPTATIONS = [
  "standard",
  "walking",
  "mobility",
  "rehabilitation",
  "recovery",
  "indoor_safety_alternative",
] as const;
export type MovementAdaptation = (typeof MOVEMENT_ADAPTATIONS)[number];

export type CircuitActionId =
  | "scripture_opened"
  | "reading_completed"
  | "honest_truth_saved"
  | "witness_objective_completed"
  | "prayer_practiced"
  | "gratitude_recorded"
  | "control_release_move_recorded"
  | "ego_signal_responded"
  | "smaller_faithful_action"
  | "main_promise_named"
  | "main_promise_completed"
  | "recovery_reflection_recorded"
  | "nutrition_covenant_honored"
  | "hydration_covenant_honored"
  | "movement_block_one"
  | "movement_block_two"
  | "outdoor_movement"
  | "sleep_preparation"
  | "adapted_movement"
  | "friction_removed"
  | "tomorrow_prepared"
  | "service_completed";

export interface MovementBlock {
  completed: boolean;
  description: string;
  outdoors: boolean;
  adaptation: MovementAdaptation;
}

export interface FormationProofReference {
  id: string;
  storagePath: string;
  previewUrl: string;
  createdAt: string;
  localOnly: boolean;
}

export interface FormationCircuitDraft {
  actions: Partial<Record<CircuitActionId, boolean>>;
  fields: Record<string, string>;
  reflection: string;
  movement: {
    one: MovementBlock;
    two: MovementBlock;
  };
  proof: FormationProofReference | null;
}

export type CircuitCompletionState = "not_started" | "in_progress" | "recorded" | "complete";

export interface FormationCircuitEntry {
  id: string;
  userId: string;
  localDate: string;
  track: TrainingTrack;
  circuit: CircuitType;
  ruleVersion: string;
  completionState: CircuitCompletionState;
  completedActionIds: CircuitActionId[];
  missingRequiredActionIds: CircuitActionId[];
  draft: FormationCircuitDraft;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  contentVersionId?: string | null;
  localOnly: boolean;
}

export interface CircuitActionDefinition {
  id: CircuitActionId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface CircuitDefinition {
  id: CircuitType;
  name: string;
  purpose: string;
  invitation: string;
  privacyNote?: string;
  actions: readonly CircuitActionDefinition[];
}

const ACTIONS: Record<CircuitActionId, CircuitActionDefinition> = {
  scripture_opened: {
    id: "scripture_opened",
    label: "Open Scripture before the phone",
    shortLabel: "Scripture opened",
    description: "Begin with the biblical text before feeds, messages, or noise when your circumstances allow.",
  },
  reading_completed: {
    id: "reading_completed",
    label: "Complete formation or book reading",
    shortLabel: "Reading completed",
    description: "Read today's assigned formation material or continue the book where you left off.",
  },
  honest_truth_saved: {
    id: "honest_truth_saved",
    label: "Name one honest truth",
    shortLabel: "Honest truth saved",
    description: "Separate what the text says from the assumption you brought into the moment.",
  },
  witness_objective_completed: {
    id: "witness_objective_completed",
    label: "Examine one Witness objective",
    shortLabel: "Witness examined",
    description: "Look closely at one piece of evidence without forcing a conclusion.",
  },
  prayer_practiced: {
    id: "prayer_practiced",
    label: "Pray honestly",
    shortLabel: "Prayer practiced",
    description: "Prayer can remain entirely between you and God; no prayer text is required.",
  },
  gratitude_recorded: {
    id: "gratitude_recorded",
    label: "Record one gratitude",
    shortLabel: "Gratitude recorded",
    description: "Name one concrete gift without using gratitude to deny what is hard.",
  },
  control_release_move_recorded: {
    id: "control_release_move_recorded",
    label: "Complete Control / Release / Move",
    shortLabel: "Control / Release / Move",
    description: "Name what is yours to control, what to release, and the faithful move you will make.",
  },
  ego_signal_responded: {
    id: "ego_signal_responded",
    label: "Respond to an Ego Signal",
    shortLabel: "Ego Signal answered",
    description: "Notice pressure, defensiveness, comparison, or all-or-nothing thinking and choose a truthful response.",
  },
  smaller_faithful_action: {
    id: "smaller_faithful_action",
    label: "Choose the smaller faithful action",
    shortLabel: "Faithful action chosen",
    description: "Reduce the next move until it is honest, concrete, and possible.",
  },
  main_promise_named: {
    id: "main_promise_named",
    label: "Name one Main Promise",
    shortLabel: "Promise named",
    description: "Choose a promise clear enough that you can answer honestly at the end of the day.",
  },
  main_promise_completed: {
    id: "main_promise_completed",
    label: "Complete the Main Promise honestly",
    shortLabel: "Promise completed",
    description: "Mark this only when the promise itself is complete. Proof never completes it automatically.",
  },
  recovery_reflection_recorded: {
    id: "recovery_reflection_recorded",
    label: "Record a Recovery Win",
    shortLabel: "Recovery reflected",
    description: "If you drifted, name how you returned without erasing what happened.",
  },
  nutrition_covenant_honored: {
    id: "nutrition_covenant_honored",
    label: "Honor your nutrition covenant",
    shortLabel: "Nutrition covenant",
    description: "Use the personal, safe boundary you chose; the app does not impose a universal target.",
  },
  hydration_covenant_honored: {
    id: "hydration_covenant_honored",
    label: "Honor your hydration covenant",
    shortLabel: "Hydration covenant",
    description: "Follow your own appropriate hydration plan and any relevant clinical guidance.",
  },
  movement_block_one: {
    id: "movement_block_one",
    label: "Complete movement block one",
    shortLabel: "Movement one",
    description: "Walking, mobility, rehabilitation, and recovery work are legitimate movement.",
  },
  movement_block_two: {
    id: "movement_block_two",
    label: "Complete movement block two",
    shortLabel: "Movement two",
    description: "Choose a second block that respects ability, recovery, environment, and safety.",
  },
  outdoor_movement: {
    id: "outdoor_movement",
    label: "Complete one movement block outdoors",
    shortLabel: "Outdoor movement",
    description: "Never override unsafe weather, access, or medical guidance. Use the safety adaptation when needed.",
  },
  sleep_preparation: {
    id: "sleep_preparation",
    label: "Prepare for sleep",
    shortLabel: "Sleep prepared",
    description: "Make one practical choice that protects tonight's rest.",
  },
  adapted_movement: {
    id: "adapted_movement",
    label: "Choose an honest movement adaptation",
    shortLabel: "Movement adapted",
    description: "Adaptation is stewardship, not a lesser version of completion.",
  },
  friction_removed: {
    id: "friction_removed",
    label: "Remove one source of friction",
    shortLabel: "Friction removed",
    description: "Change one physical, digital, calendar, or relational condition that is within your control.",
  },
  tomorrow_prepared: {
    id: "tomorrow_prepared",
    label: "Prepare tomorrow's conditions",
    shortLabel: "Tomorrow prepared",
    description: "Set up one cue, space, or boundary that makes tomorrow's faithful move easier.",
  },
  service_completed: {
    id: "service_completed",
    label: "Encourage, serve, or help someone",
    shortLabel: "Service completed",
    description: "Keep the recipient's identity, hardship, and personal information private.",
  },
};

export const CIRCUIT_DEFINITIONS: Record<CircuitType, CircuitDefinition> = {
  awareness: {
    id: "awareness",
    name: "Awareness",
    purpose: "See what is true before noise or assumption decides the day.",
    invitation: "Begin with Scripture, read carefully, and name one honest truth.",
    privacyNote: "Your honest truth and evidence notes are private by default.",
    actions: [ACTIONS.scripture_opened, ACTIONS.reading_completed, ACTIONS.honest_truth_saved, ACTIONS.witness_objective_completed],
  },
  perspective: {
    id: "perspective",
    name: "Perspective",
    purpose: "Bring the story you are telling into prayer, gratitude, and faithful action.",
    invitation: "Release what is not yours and make the next move smaller and truer.",
    privacyNote: "Prayer text is never required and private fields are excluded from formation analytics.",
    actions: [
      ACTIONS.prayer_practiced,
      ACTIONS.gratitude_recorded,
      ACTIONS.control_release_move_recorded,
      ACTIONS.ego_signal_responded,
      ACTIONS.smaller_faithful_action,
    ],
  },
  habit: {
    id: "habit",
    name: "Habit",
    purpose: "Turn intention into one clear promise and answer honestly about the result.",
    invitation: "Name the promise first; add proof only if it helps you remember the rep.",
    privacyNote: "Text and photo proof are optional and private. Uploading proof never marks the promise complete.",
    actions: [ACTIONS.main_promise_named, ACTIONS.main_promise_completed, ACTIONS.recovery_reflection_recorded],
  },
  wellness: {
    id: "wellness",
    name: "Wellness",
    purpose: "Steward the body carrying the work through personal covenants, movement, and rest.",
    invitation: "Choose safe practices appropriate to your body, guidance, environment, and recovery.",
    privacyNote: "Wellness details are private. The app does not set universal nutrition, hydration, sleep, or exercise targets.",
    actions: [
      ACTIONS.nutrition_covenant_honored,
      ACTIONS.hydration_covenant_honored,
      ACTIONS.movement_block_one,
      ACTIONS.movement_block_two,
      ACTIONS.outdoor_movement,
      ACTIONS.sleep_preparation,
      ACTIONS.adapted_movement,
    ],
  },
  environment: {
    id: "environment",
    name: "Environment",
    purpose: "Shape the conditions around faithfulness and make room to serve without performing it.",
    invitation: "Remove friction, prepare tomorrow, and quietly help someone.",
    privacyNote: "Service details remain private. Do not record a recipient's identity, hardship, or personal information.",
    actions: [ACTIONS.friction_removed, ACTIONS.tomorrow_prepared, ACTIONS.service_completed],
  },
};

export const TRACK_LABELS: Record<TrainingTrack, string> = {
  read_along: "Read Along",
  charge_40: "40-Day Charge",
  fully_charged_75: "Fully Charged: 75 Days",
};

export const TRACK_DESCRIPTIONS: Record<TrainingTrack, string> = {
  read_along: "A low-pressure practice. Record one meaningful step; reflection and proof stay optional.",
  charge_40: "Flexible formation. Partial progress counts honestly and a Recovery Win is always available.",
  fully_charged_75: "Strict daily practice. Every required item is shown clearly before the circuit is complete.",
};

export function createEmptyCircuitDraft(): FormationCircuitDraft {
  const emptyMovement = (): MovementBlock => ({
    completed: false,
    description: "",
    outdoors: false,
    adaptation: "standard",
  });

  return {
    actions: {},
    fields: {},
    reflection: "",
    movement: { one: emptyMovement(), two: emptyMovement() },
    proof: null,
  };
}

export function isTrainingTrack(value: unknown): value is TrainingTrack {
  return TRAINING_TRACKS.includes(value as TrainingTrack);
}

export function isCircuitType(value: unknown): value is CircuitType {
  return CIRCUIT_TYPES.includes(value as CircuitType);
}

export function isMovementAdaptation(value: unknown): value is MovementAdaptation {
  return MOVEMENT_ADAPTATIONS.includes(value as MovementAdaptation);
}
