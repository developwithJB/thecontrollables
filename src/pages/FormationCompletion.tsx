import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Download,
  HeartHandshake,
  LockKeyhole,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FutureChip, FutureHero, FuturePanel } from "@/components/ui/future";
import { TrackSelector } from "@/components/formation/TrackSelector";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useFormationTrack } from "@/hooks/useFormationTrack";
import { useFormationCompletion } from "@/hooks/useFormationCompletion";
import { useToast } from "@/hooks/use-toast";
import { useFormationAnalytics } from "@/hooks/useFormationAnalytics";
import { APP_ROUTES } from "@/lib/appRoutes";
import {
  CLOSING_REFLECTION_PROMPTS,
  NEXT_STEP_OPTIONS,
  buildMilestoneSvg,
  buildPrivacySafeMilestone,
  emptyClosingReflection,
  getCompletionCelebration,
  getCompletionHeadline,
  serializePrivateCompletionDownload,
  type ClosingReflection,
  type CompletionNextStep,
  type MilestoneShareDraft,
} from "@/domain/formation/completion";

const DEFAULT_SHARE_DRAFT: MilestoneShareDraft = {
  includeName: false,
  displayName: "",
  includeQuote: false,
  selectedQuote: "",
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function FormationCompletion() {
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const trackFormation = useFormationAnalytics();
  const { track, setTrack } = useFormationTrack(user.id);
  const { record, reflection, isLoading, isSaving, error, saveReflection } = useFormationCompletion(user.id, track, true);
  const [answers, setAnswers] = useState<ClosingReflection>(emptyClosingReflection);
  const [nextStep, setNextStep] = useState<CompletionNextStep | null>(null);
  const [shareDraft, setShareDraft] = useState<MilestoneShareDraft>(DEFAULT_SHARE_DRAFT);

  useEffect(() => {
    if (!reflection) return;
    setAnswers(reflection.answers);
    setNextStep(reflection.nextStep);
  }, [reflection]);

  useEffect(() => {
    if (!record || record.isPreview) return;
    void trackFormation("journey_completed", { track: record.track, outcome: "completion_record_viewed" });
  }, [record, trackFormation]);

  const milestone = useMemo(
    () => record ? buildPrivacySafeMilestone(record, shareDraft) : null,
    [record, shareDraft],
  );

  const handleSaveReflection = async () => {
    try {
      await saveReflection(answers, nextStep);
      toast({ title: "Private reflection saved", description: record?.isPreview ? "Saved only in this browser for testing." : "Saved privately to your account." });
    } catch {
      toast({ title: "Reflection was not saved", description: "Your answers remain on this screen. Try again.", variant: "destructive" });
    }
  };

  const handlePrivateDownload = () => {
    if (!record || !reflection) return;
    const currentReflection = { ...reflection, answers, nextStep };
    downloadBlob(
      new Blob([serializePrivateCompletionDownload(record, currentReflection)], { type: "application/json" }),
      `the-controllables-private-completion-${record.completedOn}.json`,
    );
  };

  const handleMilestoneDownload = () => {
    if (!record || !milestone) return;
    void trackFormation("share_previewed", { track: record.track, source: "completion" });
    downloadBlob(
      new Blob([buildMilestoneSvg(milestone)], { type: "image/svg+xml" }),
      `the-controllables-milestone-${record.completedOn}.svg`,
    );
    void trackFormation("milestone_shared", { track: record.track, outcome: "downloaded", source: "completion" });
  };

  if (isLoading) {
    return <div className="mx-auto max-w-5xl space-y-4" aria-label="Loading completion experience"><div className="h-64 animate-pulse rounded-3xl bg-muted" /><div className="h-80 animate-pulse rounded-3xl bg-muted" /></div>;
  }

  if (!record || !reflection) {
    return (
      <FuturePanel className="mx-auto max-w-2xl p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">No completion record yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">This path will appear here after an authoritative journey or reading milestone is complete.</p>
        <Button className="mt-5" onClick={() => navigate(APP_ROUTES.formationToday)}>Return to Today</Button>
      </FuturePanel>
    );
  }

  const countCards = [
    ["Dates practiced", record.counts.datesPracticed],
    ["Controllable reps", record.counts.controllableReps],
    ["Scripture progress", record.counts.scriptureProgress],
    ["Witness progress", record.counts.witnessProgress],
    ["Promises kept", record.counts.promisesKept],
    ["Recovery decisions", record.counts.recoveryDecisions],
    ["Service reps", record.counts.serviceReps],
    ["Private proof entries", record.counts.privateProofCount],
    ["Formation seasons", record.counts.formationSeasonsCompleted],
  ] as const;

  return (
    <div className="ph-no-capture mx-auto max-w-5xl space-y-6 pb-24" data-sentry-mask>
      <Button variant="ghost" onClick={() => navigate(APP_ROUTES.formationToday)} className="-ml-2 gap-2">
        <ArrowLeft className="h-4 w-4" /> Return to Today
      </Button>

      {record.isPreview ? (
        <div role="status" className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-4 text-sm text-amber-100">
          <strong>Test preview only.</strong> This sample does not claim that you completed a journey. Private preview reflections stay in this browser.
        </div>
      ) : null}

      <FutureHero
        eyebrow={record.isPreview ? "Completion experience preview" : "Journey completion"}
        title={getCompletionHeadline(record.track)}
        icon={<Sparkles className="h-6 w-6" />}
        chips={
          <>
            <FutureChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label={record.isPreview ? "Non-authoritative sample" : "Immutable completion record"} />
            <FutureChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Reflection stays private" />
          </>
        }
        side={
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Completed</p>
            <p className="mt-2 text-2xl font-bold">{record.completedOn}</p>
            <p className="mt-2 text-xs text-muted-foreground">Rule {record.ruleVersion} · Content {record.contentVersion}</p>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">{getCompletionCelebration(record.track)}</p>
      </FutureHero>

      {record.isPreview ? <TrackSelector track={track} onChange={setTrack} /> : null}

      <FuturePanel className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Completion record</p>
            <h2 className="mt-1 text-xl font-bold">Counts without exposing personal content</h2>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">“Private proof entries” is a count only. Prayer, reflection, wellness, covenant, service-recipient, proof, and Witness-note content are never shown here.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {countCards.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-background/55 p-4">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <Button variant="outline" className="mt-5 gap-2" onClick={handlePrivateDownload}>
          <Download className="h-4 w-4" /> Download private record
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">The private JSON download includes your closing reflection. Review it before storing or sharing it.</p>
      </FuturePanel>

      <FuturePanel className="p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-1 h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Private closing reflection</p>
            <h2 className="mt-1 text-xl font-bold">Notice what you want to carry forward.</h2>
            <p className="mt-2 text-sm text-muted-foreground">These answers are private, optional, and excluded from analytics and milestone sharing.</p>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          {CLOSING_REFLECTION_PROMPTS.map(([key, prompt]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`completion-${key}`}>{prompt}</Label>
              <Textarea
                id={`completion-${key}`}
                value={answers[key]}
                onChange={(event) => setAnswers({ ...answers, [key]: event.target.value.slice(0, 4000) })}
                className="min-h-[96px]"
              />
            </div>
          ))}
        </div>

        <fieldset className="mt-7">
          <legend className="text-base font-bold">What feels like the honest next step?</legend>
          <p className="mt-1 text-sm text-muted-foreground">There is no pressure to begin another strict challenge.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {NEXT_STEP_OPTIONS.map(([id, label, description]) => {
              const selected = nextStep === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setNextStep(selected ? null : id)}
                  className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/10" : "border-border/65 bg-background/55 hover:border-primary/35"}`}
                >
                  <span className="flex items-center gap-2 font-semibold">{selected ? <Check className="h-4 w-4 text-primary" /> : null}{label}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button variant="future" className="mt-6" onClick={handleSaveReflection} disabled={isSaving}>{isSaving ? "Saving…" : "Save private reflection"}</Button>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </FuturePanel>

      <FuturePanel className="overflow-hidden p-5">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-1 h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Optional milestone</p>
            <h2 className="mt-1 text-xl font-bold">Preview exactly what could be shared.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The asset can include a name or quote only after separate permission. It never includes health, prayer, covenant, service, proof, reflection, or Witness-note data.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <ConsentToggle label="Include my name" pressed={shareDraft.includeName} onChange={(includeName) => setShareDraft({ ...shareDraft, includeName })} />
            <div className="space-y-2">
              <Label htmlFor="milestone-name">Name shown on asset</Label>
              <Input id="milestone-name" disabled={!shareDraft.includeName} value={shareDraft.displayName} onChange={(event) => setShareDraft({ ...shareDraft, displayName: event.target.value.slice(0, 80) })} />
            </div>
            <ConsentToggle label="Include a non-private quote I select" pressed={shareDraft.includeQuote} onChange={(includeQuote) => setShareDraft({ ...shareDraft, includeQuote })} />
            <div className="space-y-2">
              <Label htmlFor="milestone-quote">Public quote</Label>
              <Textarea id="milestone-quote" disabled={!shareDraft.includeQuote} value={shareDraft.selectedQuote} onChange={(event) => setShareDraft({ ...shareDraft, selectedQuote: event.target.value.slice(0, 220) })} placeholder="Write a quote intended for public sharing—do not paste a private reflection." />
            </div>
          </div>

          <div aria-label="Share milestone preview" className="rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_45%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.45))] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Controllables</p>
            {milestone?.displayName ? <p className="mt-4 text-lg text-primary-foreground/80">{milestone.displayName}</p> : null}
            <p className="mt-6 text-3xl font-bold">{milestone?.formationTrack}</p>
            <p className="mt-2 text-sm text-muted-foreground">Completion milestone · {milestone?.completionDate}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <FutureChip label={`${milestone?.controllableReps ?? 0} Controllable reps`} />
              <FutureChip label={`${milestone?.formationSeasonsCompleted ?? 0} formation seasons`} />
            </div>
            {milestone?.selectedQuote ? <blockquote className="mt-7 border-l-2 border-primary/50 pl-4 text-sm italic text-muted-foreground">“{milestone.selectedQuote}”</blockquote> : null}
            <p className="mt-8 text-xs text-muted-foreground">Faithfulness practiced. Private details remain private.</p>
          </div>
        </div>
        <Button variant="outline" className="mt-5 gap-2" onClick={handleMilestoneDownload}><Share2 className="h-4 w-4" /> Download share-safe milestone</Button>
      </FuturePanel>
    </div>
  );
}

function ConsentToggle({ label, pressed, onChange }: { label: string; pressed: boolean; onChange: (pressed: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pressed ? "border-primary bg-primary/10" : "border-border/65 bg-background/55"}`}
    >
      {label}
      <span aria-hidden="true" className={`flex h-6 w-10 items-center rounded-full p-1 transition ${pressed ? "justify-end bg-primary" : "justify-start bg-muted"}`}><span className="h-4 w-4 rounded-full bg-background" /></span>
    </button>
  );
}
