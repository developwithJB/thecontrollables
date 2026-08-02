import {
  createEmptyCircuitDraft,
  isMovementAdaptation,
  type CircuitActionId,
  type FormationCircuitDraft,
  type FormationCircuitEntry,
  type FormationProofReference,
  type MovementBlock,
} from "./circuits";

export function upsertFormationCircuitEntry(
  entries: FormationCircuitEntry[],
  incoming: FormationCircuitEntry,
): FormationCircuitEntry[] {
  const withoutSameCircuit = entries.filter(
    (entry) =>
      !(
        entry.userId === incoming.userId &&
        entry.localDate === incoming.localDate &&
        entry.track === incoming.track &&
        entry.circuit === incoming.circuit
      ),
  );
  return [incoming, ...withoutSameCircuit].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function normalizeCircuitDraft(value: unknown): FormationCircuitDraft {
  const empty = createEmptyCircuitDraft();
  if (!value || typeof value !== "object") return empty;
  const source = value as Partial<FormationCircuitDraft>;
  const fields = source.fields && typeof source.fields === "object"
    ? Object.fromEntries(
        Object.entries(source.fields)
          .filter(([, fieldValue]) => typeof fieldValue === "string")
          .map(([key, fieldValue]) => [key.slice(0, 60), (fieldValue as string).slice(0, 2000)]),
      )
    : {};
  const actions = source.actions && typeof source.actions === "object"
    ? Object.fromEntries(
        Object.entries(source.actions).filter(([, actionValue]) => typeof actionValue === "boolean"),
      ) as Partial<Record<CircuitActionId, boolean>>
    : {};

  return {
    actions,
    fields,
    reflection: typeof source.reflection === "string" ? source.reflection.slice(0, 4000) : "",
    movement: {
      one: normalizeMovementBlock(source.movement?.one),
      two: normalizeMovementBlock(source.movement?.two),
    },
    proof: normalizeProofReference(source.proof),
  };
}

function normalizeMovementBlock(value: unknown): MovementBlock {
  const source = value && typeof value === "object" ? (value as Partial<MovementBlock>) : {};
  return {
    completed: source.completed === true,
    description: typeof source.description === "string" ? source.description.slice(0, 240) : "",
    outdoors: source.outdoors === true,
    adaptation: isMovementAdaptation(source.adaptation) ? source.adaptation : "standard",
  };
}

function normalizeProofReference(value: unknown): FormationProofReference | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<FormationProofReference>;
  if (!source.id || !source.storagePath || !source.createdAt) return null;
  return {
    id: source.id,
    storagePath: source.storagePath,
    previewUrl: typeof source.previewUrl === "string" ? source.previewUrl : "",
    createdAt: source.createdAt,
    localOnly: source.localOnly === true,
  };
}
