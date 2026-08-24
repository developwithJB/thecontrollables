import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Archive, CheckCircle2, Download, Eye, FileUp, History, Plus, RefreshCw, Send, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  EVIDENCE_CLASSIFICATIONS,
  FORMATION_CONTENT_TYPES,
  FORMATION_SEASONS,
  canPublishFormationContent,
  createNewContentDraft,
  createNextContentVersion,
  parseFormationContentImport,
  serializeFormationContentExport,
  validateFormationContent,
  type FormationContentDraft,
  type FormationContentVersion,
} from "@/domain/formation/content";
import { INITIAL_FORMATION_CONTENT_SEED } from "@/domain/formation/contentSeed";
import {
  listFormationContentVersions,
  publishFormationContentVersion,
  reviewFormationContentVersion,
  saveFormationContentDraft,
  submitFormationContentForReview,
} from "@/data/formation/contentRepository";

const today = () => new Date().toISOString().slice(0, 10);

export default function FormationContentStudio() {
  const { toast } = useToast();
  const importInput = useRef<HTMLInputElement>(null);
  const [versions, setVersions] = useState<FormationContentVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormationContentDraft>(() => createNewContentDraft());
  const [reviewer, setReviewer] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const selected = versions.find((version) => version.id === selectedId) ?? null;
  const issues = useMemo(() => validateFormationContent(draft, "draft"), [draft]);

  const load = async () => {
    setIsLoading(true);
    try {
      setVersions(await listFormationContentVersions());
    } catch (error) {
      toast({ title: "Content could not be loaded", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    supabase.auth.getUser().then(({ data }) => {
      const identity = data.user?.email ?? data.user?.id ?? "";
      setDraft((current) => current.author ? current : { ...current, author: identity });
      setReviewer(identity);
    });
    // Initial admin-panel load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (work: () => Promise<void>, success: string) => {
    setIsWorking(true);
    try {
      await work();
      toast({ title: success });
      await load();
    } catch (error) {
      toast({ title: "Content action failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  const selectVersion = (version: FormationContentVersion) => {
    setSelectedId(version.id);
    setDraft(createNextContentVersion(version, draft.author || reviewer));
  };

  const saveDraft = () => run(async () => {
    const errors = issues.filter((issue) => issue.severity === "error");
    if (errors.length) throw new Error(errors[0].message);
    await saveFormationContentDraft(draft);
    setDraft(createNewContentDraft(draft.author));
    setSelectedId(null);
  }, "New draft version saved");

  const importFile = async (file: File) => run(async () => {
    const imported = parseFormationContentImport(await file.text());
    for (const contentDraft of imported) await saveFormationContentDraft(contentDraft, true);
  }, "Content imported as drafts");

  const seedInitialSet = () => run(async () => {
    for (const contentDraft of INITIAL_FORMATION_CONTENT_SEED) await saveFormationContentDraft(contentDraft, true);
  }, "75-day and representative draft content seeded");

  const exportVersions = () => {
    const blob = new Blob([serializeFormationContentExport(versions)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `formation-content-${today()}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Formation Content Studio</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">Drafts never leak into production. Every published version requires an independent human review, validated Scripture references, and citations for historical claims.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>
            <Button variant="outline" size="sm" onClick={exportVersions}><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => importInput.current?.click()}><FileUp className="mr-2 h-4 w-4" />Import drafts</Button>
            <input ref={importInput} className="sr-only" type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ""; }} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Version history</CardTitle>
            <CardDescription>{versions.length} immutable content versions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1" tabIndex={0} aria-label="Formation content version history">
              {versions.map((version) => (
                <button key={version.id} type="button" onClick={() => selectVersion(version)} className={`w-full rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId === version.id ? "border-primary bg-primary/8" : "border-border hover:border-primary/35"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{version.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{version.stableId} · v{version.version}</p></div>
                    <Badge variant={version.publicationStatus === "published" ? "default" : "secondary"}>{version.publicationStatus}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span>{version.contentType}</span><span>{version.formationTrack}</span>{version.evidenceClassification ? <span>{version.evidenceClassification}</span> : null}</div>
                </button>
              ))}
              {!versions.length && !isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">No content versions yet. Seed the reviewed-sample workflow or create a draft.</p> : null}
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={seedInitialSet} disabled={isWorking}><Upload className="mr-2 h-4 w-4" />Seed initial 75-day drafts</Button>
            <p className="mt-2 text-xs text-muted-foreground">Seed content remains draft and pending until named humans complete review.</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> New immutable version</CardTitle><CardDescription>Saving creates a new version; it never overwrites history.</CardDescription></div>
              <Button variant="ghost" size="sm" onClick={() => { setDraft(createNewContentDraft(draft.author)); setSelectedId(null); }}>Clear</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Stable identifier"><Input value={draft.stableId} onChange={(event) => setDraft({ ...draft, stableId: event.target.value })} placeholder="day.1.scripture" /></Field><Field label="Slug"><Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} placeholder="day-1-scripture" /></Field></div>
              <Field label="Title"><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Content type"><NativeSelect value={draft.contentType} onChange={(value) => setDraft({ ...draft, contentType: value as FormationContentDraft["contentType"] })} options={FORMATION_CONTENT_TYPES} /></Field><Field label="Formation track"><NativeSelect value={draft.formationTrack} onChange={(value) => setDraft({ ...draft, formationTrack: value as FormationContentDraft["formationTrack"] })} options={["all", "read_along", "charge_40", "fully_charged_75"]} /></Field></div>
              <Field label="Content body"><Textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="min-h-[180px]" /></Field>
              <div className="grid gap-4 sm:grid-cols-3"><Field label="Day start"><Input type="number" min={1} max={75} value={draft.dayStart ?? ""} onChange={(event) => setDraft({ ...draft, dayStart: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Day end"><Input type="number" min={1} max={75} value={draft.dayEnd ?? ""} onChange={(event) => setDraft({ ...draft, dayEnd: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Season"><NativeSelect value={draft.formationSeason ?? ""} onChange={(value) => setDraft({ ...draft, formationSeason: value ? value as FormationContentDraft["formationSeason"] : null })} options={["", ...FORMATION_SEASONS]} /></Field></div>
              <div className="grid gap-4 sm:grid-cols-3"><Field label="Book chapter"><Input value={draft.bookChapter ?? ""} onChange={(event) => setDraft({ ...draft, bookChapter: event.target.value || null })} /></Field><Field label="Spoiler level"><Input type="number" min={0} max={5} value={draft.spoilerLevel} onChange={(event) => setDraft({ ...draft, spoilerLevel: Number(event.target.value) })} /></Field><Field label="Classification"><NativeSelect value={draft.evidenceClassification ?? ""} onChange={(value) => setDraft({ ...draft, evidenceClassification: value ? value as FormationContentDraft["evidenceClassification"] : null })} options={["", ...EVIDENCE_CLASSIFICATIONS]} /></Field></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Scripture reference"><Input value={draft.scriptureReference ?? ""} onChange={(event) => setDraft({ ...draft, scriptureReference: event.target.value || null })} placeholder="Matthew 9:9-13" /></Field><Field label="Bible translation"><Input value={draft.bibleTranslation ?? ""} onChange={(event) => setDraft({ ...draft, bibleTranslation: event.target.value || null })} /></Field></div>
              <Field label="Source citations (one HTTPS URL per line)"><Textarea value={draft.sourceCitations.join("\n")} onChange={(event) => setDraft({ ...draft, sourceCitations: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Author"><Input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></Field><Field label="AI assistance"><NativeSelect value={draft.aiAssisted ? "yes" : "no"} onChange={(value) => setDraft({ ...draft, aiAssisted: value === "yes" })} options={["no", "yes"]} /></Field></div>

              {issues.length ? <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-xs"><p className="font-semibold">Validation</p><ul className="mt-2 space-y-1">{issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.field}: {issue.message}</li>)}</ul></div> : null}
              <Button onClick={saveDraft} disabled={isWorking || issues.some((issue) => issue.severity === "error")}><Plus className="mr-2 h-4 w-4" />Save new draft version</Button>
            </CardContent>
          </Card>

          {selected ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Review and publication controls</CardTitle><CardDescription>Selected: {selected.stableId} v{selected.version}. Author and reviewer must be different authenticated admins.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Reviewer"><Input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></Field><Field label="Review note"><Input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></Field></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => run(() => submitFormationContentForReview(selected.id), "Submitted for review")} disabled={isWorking || selected.publicationStatus !== "draft"}><Send className="mr-2 h-4 w-4" />Submit</Button>
                  <Button variant="outline" onClick={() => run(() => reviewFormationContentVersion({ versionId: selected.id, reviewer, theologicalStatus: "approved", historicalStatus: selected.contentType === "historical_context" || selected.evidenceClassification === "Historical Context" ? "approved" : "not_required", note: reviewNote }), "Independent review recorded")} disabled={isWorking || !["draft", "in_review"].includes(selected.publicationStatus)}><CheckCircle2 className="mr-2 h-4 w-4" />Approve review</Button>
                  <Button onClick={() => run(() => publishFormationContentVersion(selected.id, today()), "Published version activated")} disabled={isWorking || !canPublishFormationContent({ ...createNextContentVersion(selected, selected.author), reviewer: selected.reviewer, theologicalReviewStatus: selected.theologicalReviewStatus, historicalReviewStatus: selected.historicalReviewStatus, publicationStatus: selected.publicationStatus, effectiveDate: today(), lastReviewedDate: selected.lastReviewedDate })}><ShieldCheck className="mr-2 h-4 w-4" />Publish</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4" /> Preview mode</CardTitle><CardDescription>Draft-only admin preview with visible classification.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setShowPreview((value) => !value)}>{showPreview ? "Hide" : "Show"}</Button></CardHeader>
            {showPreview ? <CardContent><div className="rounded-2xl border bg-background p-5"><div className="flex flex-wrap gap-2"><Badge>{draft.contentType}</Badge><Badge variant="outline">{draft.formationTrack}</Badge>{draft.evidenceClassification ? <Badge variant="secondary">{draft.evidenceClassification}</Badge> : null}<Badge variant="secondary"><Archive className="mr-1 h-3 w-3" />Draft preview</Badge></div><h3 className="mt-5 text-2xl font-bold">{draft.title || "Untitled content"}</h3><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{draft.body || "Content preview will appear here."}</p>{draft.scriptureReference ? <p className="mt-5 text-xs font-semibold text-primary">{draft.scriptureReference} · {draft.bibleTranslation}</p> : null}</div></CardContent> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }

function NativeSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{options.map((option) => <option key={option || "none"} value={option}>{option || "None"}</option>)}</select>;
}
