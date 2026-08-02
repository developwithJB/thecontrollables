import { useState } from "react";
import {
  Camera,
  HeartHandshake,
  ImagePlus,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PracticeToggle } from "./PracticeToggle";
import {
  MOVEMENT_ADAPTATIONS,
  type CircuitActionId,
  type FormationCircuitDraft,
  type FormationCircuitEntry,
  type MovementAdaptation,
  type TrainingTrack,
} from "@/domain/formation/circuits";
import type { CircuitEvaluation } from "@/domain/formation/circuitRules";
import {
  deleteFormationProof,
  sanitizeFormationProof,
  uploadFormationProof,
  validateFormationProofFile,
} from "@/data/formation/formationProof";
import { cn } from "@/lib/utils";

export interface CircuitEditorProps {
  userId: string;
  localDate: string;
  track: TrainingTrack;
  draft: FormationCircuitDraft;
  evaluation: CircuitEvaluation;
  history: FormationCircuitEntry[];
  localOnly: boolean;
  onChange: (draft: FormationCircuitDraft) => void;
  onPersist?: (draft: FormationCircuitDraft) => Promise<void>;
}

export function AwarenessCircuitEditor(props: CircuitEditorProps) {
  const { draft, evaluation, onChange } = props;
  return (
    <div className="space-y-5">
      <PracticeToggle
        pressed={draft.actions.scripture_opened === true}
        onPressedChange={(pressed) => setAction(draft, onChange, "scripture_opened", pressed)}
        title="Scripture before the phone"
        description="Open the biblical text before feeds or messages when your circumstances allow. This is a practice, not a purity test."
        requirement={requirementFor(evaluation, "scripture_opened")}
      />
      <PracticeToggle
        pressed={draft.actions.reading_completed === true}
        onPressedChange={(pressed) => setAction(draft, onChange, "reading_completed", pressed)}
        title="Formation or book reading"
        description="Continue today's assigned reading or the current book section."
        requirement={requirementFor(evaluation, "reading_completed")}
      />

      <FieldGroup
        id="honest-truth"
        label="One honest truth"
        description="This saves when you write it. Keep names and identifying details out."
        required={evaluation.requiredActionIds.includes("honest_truth_saved")}
      >
        <Textarea
          id="honest-truth"
          value={draft.fields.honestTruth ?? ""}
          onChange={(event) => setField(draft, onChange, "honestTruth", event.target.value, 1000)}
          placeholder="What is true right now?"
          className="min-h-[96px]"
        />
      </FieldGroup>

      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Text and assumption are different</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup id="scripture-says" label="What Scripture says" description="Observation from the text—not a generated quotation.">
            <Textarea
              id="scripture-says"
              value={draft.fields.scriptureSays ?? ""}
              onChange={(event) => setField(draft, onChange, "scriptureSays", event.target.value, 1200)}
              placeholder="I observe…"
            />
          </FieldGroup>
          <FieldGroup id="my-assumption" label="What I may be assuming" description="Interpretation, fear, or story I am bringing to the text.">
            <Textarea
              id="my-assumption"
              value={draft.fields.assumption ?? ""}
              onChange={(event) => setField(draft, onChange, "assumption", event.target.value, 1200)}
              placeholder="I may be assuming…"
            />
          </FieldGroup>
        </div>
      </div>

      <PracticeToggle
        pressed={draft.actions.witness_objective_completed === true}
        onPressedChange={(pressed) => setAction(draft, onChange, "witness_objective_completed", pressed)}
        title="Witness evidence examination"
        description="Examine one objective carefully. You may defer it without penalty."
        requirement={requirementFor(evaluation, "witness_objective_completed")}
      />
    </div>
  );
}

export function PerspectiveCircuitEditor(props: CircuitEditorProps) {
  const { draft, evaluation, onChange } = props;
  return (
    <div className="space-y-5">
      <PracticeToggle
        pressed={draft.actions.prayer_practiced === true}
        onPressedChange={(pressed) => setAction(draft, onChange, "prayer_practiced", pressed)}
        title="Prayer"
        description="Mark that you prayed; the app does not ask for or analyze the words."
        requirement={requirementFor(evaluation, "prayer_practiced")}
      />

      <FieldGroup
        id="gratitude"
        label="One concrete gratitude"
        description="Gratitude can sit beside grief or pressure; it does not have to erase either."
        required={evaluation.requiredActionIds.includes("gratitude_recorded")}
      >
        <Input
          id="gratitude"
          value={draft.fields.gratitude ?? ""}
          onChange={(event) => setField(draft, onChange, "gratitude", event.target.value, 500)}
          placeholder="I am grateful for…"
        />
      </FieldGroup>

      <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Control / Release / Move</h3>
            <RequirementBadge required={evaluation.requiredActionIds.includes("control_release_move_recorded")} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">All three fields make one complete perspective practice.</p>
        </div>
        <div className="grid gap-4">
          <FieldGroup id="control" label="What I can control">
            <Textarea id="control" value={draft.fields.control ?? ""} onChange={(event) => setField(draft, onChange, "control", event.target.value, 800)} placeholder="My responsibility is…" />
          </FieldGroup>
          <FieldGroup id="release" label="What I need to release">
            <Textarea id="release" value={draft.fields.release ?? ""} onChange={(event) => setField(draft, onChange, "release", event.target.value, 800)} placeholder="I can release…" />
          </FieldGroup>
          <FieldGroup id="move" label="What faithful move I will make">
            <Textarea id="move" value={draft.fields.move ?? ""} onChange={(event) => setField(draft, onChange, "move", event.target.value, 800)} placeholder="My next faithful move is…" />
          </FieldGroup>
        </div>
      </div>

      <FieldGroup id="ego-response" label="Ego Signal response" description="Optional: name the pressure signal and choose a truer response.">
        <Textarea id="ego-response" value={draft.fields.egoResponse ?? ""} onChange={(event) => setField(draft, onChange, "egoResponse", event.target.value, 1000)} placeholder="The pressure says… A truer response is…" />
      </FieldGroup>

      <FieldGroup
        id="faithful-action"
        label="Smaller faithful action"
        description="Make it concrete enough to do next."
        required={evaluation.requiredActionIds.includes("smaller_faithful_action")}
      >
        <Input id="faithful-action" value={draft.fields.faithfulAction ?? ""} onChange={(event) => setField(draft, onChange, "faithfulAction", event.target.value, 500)} placeholder="The next small action is…" />
      </FieldGroup>
    </div>
  );
}

export function HabitCircuitEditor(props: CircuitEditorProps) {
  const { userId, localDate, track, draft, evaluation, history, localOnly, onChange, onPersist } = props;
  return (
    <div className="space-y-5">
      <FieldGroup
        id="main-promise"
        label="One Main Promise"
        description="Make it specific enough that the answer can be honest."
        required={evaluation.requiredActionIds.includes("main_promise_named")}
      >
        <Input id="main-promise" value={draft.fields.mainPromise ?? ""} onChange={(event) => setField(draft, onChange, "mainPromise", event.target.value, 500)} placeholder="Today I will…" />
      </FieldGroup>

      <PracticeToggle
        pressed={draft.actions.main_promise_completed === true}
        onPressedChange={(pressed) => setAction(draft, onChange, "main_promise_completed", pressed)}
        title="Honest completion"
        description="Mark this only when the promise itself is complete. A note or photo never marks it for you."
        requirement={requirementFor(evaluation, "main_promise_completed")}
      />

      <FieldGroup id="text-proof" label="Optional text proof" description="A private memory of what happened—not a requirement.">
        <Textarea id="text-proof" value={draft.fields.textProof ?? ""} onChange={(event) => setField(draft, onChange, "textProof", event.target.value, 1200)} placeholder="What happened? Keep other people's private details out." />
      </FieldGroup>

      <HabitPhotoProof
        userId={userId}
        localDate={localDate}
        track={track}
        proof={draft.proof}
        localOnly={localOnly}
        onChange={async (proof) => {
          const nextDraft = { ...draft, proof };
          onChange(nextDraft);
          await onPersist?.(nextDraft);
        }}
      />

      <FieldGroup id="recovery-reflection" label="Recovery reflection" description="Optional: if you drifted, record how you returned without rewriting the day.">
        <Textarea id="recovery-reflection" value={draft.fields.recoveryReflection ?? ""} onChange={(event) => setField(draft, onChange, "recoveryReflection", event.target.value, 1200)} placeholder="I returned by…" />
      </FieldGroup>

      <SelfTrustHistory history={history} />
    </div>
  );
}

export function WellnessCircuitEditor(props: CircuitEditorProps) {
  const { draft, evaluation, onChange } = props;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm">
        <p className="font-semibold text-foreground">Safe adapted movement is legitimate movement.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Walking, mobility, rehabilitation, recovery work, or an indoor safety alternative can be the honest choice. Follow clinical guidance and local conditions.</p>
      </div>

      <CovenantControl
        id="nutrition-covenant"
        label="Personal nutrition covenant"
        value={draft.fields.nutritionCovenant ?? ""}
        honored={draft.actions.nutrition_covenant_honored === true}
        required={evaluation.requiredActionIds.includes("nutrition_covenant_honored")}
        onValueChange={(value) => setField(draft, onChange, "nutritionCovenant", value, 600)}
        onHonoredChange={(pressed) => setAction(draft, onChange, "nutrition_covenant_honored", pressed)}
        placeholder="My safe personal boundary today is…"
      />
      <CovenantControl
        id="hydration-covenant"
        label="Personal hydration covenant"
        value={draft.fields.hydrationCovenant ?? ""}
        honored={draft.actions.hydration_covenant_honored === true}
        required={evaluation.requiredActionIds.includes("hydration_covenant_honored")}
        onValueChange={(value) => setField(draft, onChange, "hydrationCovenant", value, 600)}
        onHonoredChange={(pressed) => setAction(draft, onChange, "hydration_covenant_honored", pressed)}
        placeholder="My appropriate hydration plan is…"
      />

      <MovementBlockEditor
        number="one"
        block={draft.movement.one}
        required={evaluation.requiredActionIds.includes("movement_block_one")}
        onChange={(block) => onChange({ ...draft, movement: { ...draft.movement, one: block } })}
      />
      <MovementBlockEditor
        number="two"
        block={draft.movement.two}
        required={evaluation.requiredActionIds.includes("movement_block_two")}
        onChange={(block) => onChange({ ...draft, movement: { ...draft.movement, two: block } })}
      />

      <PracticeToggle
        pressed={draft.actions.sleep_preparation === true}
        onPressedChange={(pressed) => setAction(draft, onChange, "sleep_preparation", pressed)}
        title="Sleep preparation"
        description="Make one practical choice that protects rest without imposing a universal sleep target."
        requirement={requirementFor(evaluation, "sleep_preparation")}
      />
    </div>
  );
}

export function EnvironmentCircuitEditor(props: CircuitEditorProps) {
  const { draft, evaluation, onChange } = props;
  return (
    <div className="space-y-5">
      <FieldGroup id="friction" label="Remove one source of friction" description="Physical, digital, calendar, or relational—only what is within your control." required={evaluation.requiredActionIds.includes("friction_removed")}>
        <Textarea id="friction" value={draft.fields.frictionRemoved ?? ""} onChange={(event) => setField(draft, onChange, "frictionRemoved", event.target.value, 1000)} placeholder="I removed friction by…" />
      </FieldGroup>

      <FieldGroup id="tomorrow" label="Prepare tomorrow's conditions" description="Set up one cue, space, object, or boundary." required={evaluation.requiredActionIds.includes("tomorrow_prepared")}>
        <Textarea id="tomorrow" value={draft.fields.tomorrowPrepared ?? ""} onChange={(event) => setField(draft, onChange, "tomorrowPrepared", event.target.value, 1000)} placeholder="Tomorrow is easier because…" />
      </FieldGroup>

      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <div className="mb-3 flex items-start gap-3">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Encourage, serve, or help someone</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A private attestation is enough. Do not record their identity, hardship, contact information, or image.</p>
          </div>
        </div>
        <PracticeToggle
          pressed={draft.actions.service_completed === true}
          onPressedChange={(pressed) => setAction(draft, onChange, "service_completed", pressed)}
          title="I completed a private service or encouragement action"
          description={props.track === "charge_40" ? "This supports the weekly service rhythm; there is no public score." : "Keep the person and the moment private."}
          requirement={requirementFor(evaluation, "service_completed")}
        />
      </div>

      <FieldGroup id="service-note" label="Optional private note" description="Describe your own learning, not the recipient's personal situation.">
        <Textarea id="service-note" value={draft.fields.serviceNote ?? ""} onChange={(event) => setField(draft, onChange, "serviceNote", event.target.value, 1000)} placeholder="What did serving ask of me?" />
      </FieldGroup>
    </div>
  );
}

function FieldGroup({
  id,
  label,
  description,
  required = false,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        <RequirementBadge required={required} />
      </div>
      {description ? <p id={`${id}-description`} className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      <div aria-describedby={description ? `${id}-description` : undefined}>{children}</div>
    </div>
  );
}

function RequirementBadge({ required }: { required: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", required ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>
      {required ? "Required" : "Recommended"}
    </span>
  );
}

function CovenantControl({
  id,
  label,
  value,
  honored,
  required,
  onValueChange,
  onHonoredChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  honored: boolean;
  required: boolean;
  onValueChange: (value: string) => void;
  onHonoredChange: (honored: boolean) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/55 p-4">
      <FieldGroup id={id} label={label} description="Use a boundary appropriate to you; no calories, weight, or universal target is required." required={required}>
        <Textarea id={id} value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={placeholder} />
      </FieldGroup>
      <PracticeToggle pressed={honored} onPressedChange={onHonoredChange} title={`I honored this ${label.toLowerCase()}`} description="This is your honest attestation for today." requirement={required ? "required" : "recommended"} />
    </div>
  );
}

function MovementBlockEditor({
  number,
  block,
  required,
  onChange,
}: {
  number: "one" | "two";
  block: FormationCircuitDraft["movement"]["one"];
  required: boolean;
  onChange: (block: FormationCircuitDraft["movement"]["one"]) => void;
}) {
  const id = `movement-${number}`;
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Movement block {number}</h3>
            <RequirementBadge required={required} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Describe the honest movement you chose.</p>
        </div>
      </div>
      <FieldGroup id={`${id}-description`} label="Movement description">
        <Input id={`${id}-description`} value={block.description} onChange={(event) => onChange({ ...block, description: event.target.value.slice(0, 240) })} placeholder="Walk, mobility, rehabilitation, recovery…" />
      </FieldGroup>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-adaptation`}>Movement type or adaptation</Label>
          <select
            id={`${id}-adaptation`}
            value={block.adaptation}
            onChange={(event) => onChange({ ...block, adaptation: event.target.value as MovementAdaptation })}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {MOVEMENT_ADAPTATIONS.map((adaptation) => (
              <option key={adaptation} value={adaptation}>{formatAdaptation(adaptation)}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <PracticeToggle pressed={block.outdoors} onPressedChange={(outdoors) => onChange({ ...block, outdoors })} title="Outdoors" description="Or use the indoor safety alternative honestly." requirement={required ? "required" : "recommended"} />
        </div>
      </div>
      <PracticeToggle pressed={block.completed} onPressedChange={(completed) => onChange({ ...block, completed })} title={`Movement block ${number} completed`} description="The description and this honest attestation are both needed to record the block." requirement={required ? "required" : "recommended"} />
    </div>
  );
}

function HabitPhotoProof({
  userId,
  localDate,
  track,
  proof,
  localOnly,
  onChange,
}: {
  userId: string;
  localDate: string;
  track: TrainingTrack;
  proof: FormationCircuitDraft["proof"];
  localOnly: boolean;
  onChange: (proof: FormationCircuitDraft["proof"]) => Promise<void>;
}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateFormationProofFile(file);
    if (validationError) {
      toast({ title: "Photo not added", description: validationError, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let preparedPreview = "";
    let uploadedProof: FormationCircuitDraft["proof"] = null;
    try {
      const prepared = await sanitizeFormationProof(file);
      preparedPreview = prepared.previewUrl;
      const savedProof = await uploadFormationProof({ userId, localDate, track, sanitizedBlob: prepared.blob, localOnly });
      uploadedProof = savedProof;
      await onChange(savedProof);
      toast({ title: "Private proof added", description: localOnly ? "Saved only in this local QA session." : "Metadata was stripped and access is protected." });
    } catch (error) {
      if (uploadedProof) {
        await deleteFormationProof(userId, uploadedProof).catch(() => undefined);
      }
      toast({ title: "Photo could not be saved", description: error instanceof Error ? error.message : "Try a different image.", variant: "destructive" });
    } finally {
      if (preparedPreview) URL.revokeObjectURL(preparedPreview);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!proof) return;
    setIsDeleting(true);
    try {
      await onChange(null);
      await deleteFormationProof(userId, proof);
      toast({ title: "Proof deleted", description: "The photo is no longer attached to this practice." });
    } catch (error) {
      toast({ title: "Proof could not be deleted", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Camera className="h-4 w-4" /></span>
        <div>
          <h3 className="text-sm font-semibold">Optional private photo proof</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Re-encoded as JPEG to remove embedded metadata. Stored in a private bucket with short-lived signed access. Never required.</p>
        </div>
      </div>

      {proof ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[128px_1fr] sm:items-center">
          <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
            {proof.previewUrl ? <img src={proof.previewUrl} alt="Private promise proof preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Preview expired</div>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Private to your account</div>
            <Button type="button" variant="outline" onClick={handleDelete} disabled={isDeleting} className="gap-2"><Trash2 className="h-4 w-4" />{isDeleting ? "Deleting…" : "Delete photo"}</Button>
          </div>
        </div>
      ) : (
        <label className="mt-4 flex min-h-[84px] cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-primary/25 bg-background/60 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring">
          <ImagePlus className="h-5 w-5 text-primary" />
          {isUploading ? "Preparing private photo…" : "Choose a photo"}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={isUploading} />
        </label>
      )}
    </div>
  );
}

function SelfTrustHistory({ history }: { history: FormationCircuitEntry[] }) {
  const keptPromises = history
    .filter((entry) => entry.circuit === "habit" && entry.completedActionIds.includes("main_promise_completed"))
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Self-Trust history</h3>
          <p className="mt-1 text-xs text-muted-foreground">A private record of honest kept promises—not a spiritual score.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{keptPromises.length} recent</span>
      </div>
      {keptPromises.length ? (
        <ul className="mt-3 divide-y divide-border/50 text-sm">
          {keptPromises.map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-2"><span>{formatDate(entry.localDate)}</span><span className="text-xs font-semibold text-primary">Promise kept</span></li>)}
        </ul>
      ) : <p className="mt-3 text-xs text-muted-foreground">Your first honestly completed Main Promise will appear here.</p>}
    </div>
  );
}

function setAction(draft: FormationCircuitDraft, onChange: (draft: FormationCircuitDraft) => void, action: CircuitActionId, pressed: boolean) {
  onChange({ ...draft, actions: { ...draft.actions, [action]: pressed } });
}

function setField(draft: FormationCircuitDraft, onChange: (draft: FormationCircuitDraft) => void, field: string, value: string, maxLength: number) {
  onChange({ ...draft, fields: { ...draft.fields, [field]: value.slice(0, maxLength) } });
}

function requirementFor(evaluation: CircuitEvaluation, action: CircuitActionId): "required" | "recommended" {
  return evaluation.requiredActionIds.includes(action) ? "required" : "recommended";
}

function formatAdaptation(adaptation: MovementAdaptation): string {
  const labels: Record<MovementAdaptation, string> = {
    standard: "Standard / no adaptation",
    walking: "Walking",
    mobility: "Mobility",
    rehabilitation: "Rehabilitation",
    recovery: "Recovery work",
    indoor_safety_alternative: "Indoor safety alternative",
  };
  return labels[adaptation];
}

function formatDate(localDate: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${localDate}T00:00:00Z`));
}
