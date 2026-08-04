import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookHeart, CalendarDays, Loader2, Plus, Quote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCovenant } from "@/hooks/useCovenant";
import {
  GRACE_EVIDENCE_CATEGORIES,
  getTodayDateKey,
  type GraceEvidenceCategory,
} from "@/lib/covenant";
import { format } from "date-fns";

interface EvidenceMuseumProps {
  userId: string;
}

const FAITHFUL_EVIDENCE = [
  { key: "jesusFirst", emoji: "🙏", label: "Jesus First", unit: "mornings" },
  { key: "bibleRead", emoji: "📖", label: "Bible", unit: "sessions" },
  { key: "alcoholFree", emoji: "🚫", label: "Alcohol Free", unit: "days" },
  { key: "workouts", emoji: "💪", label: "Training", unit: "workouts" },
  { key: "miles", emoji: "🏃", label: "Miles", unit: "lifetime" },
  { key: "actsOfService", emoji: "🤝", label: "Acts of Service", unit: "acts" },
  { key: "peopleEncouraged", emoji: "🗣️", label: "People Encouraged", unit: "people" },
  { key: "journalEntries", emoji: "✍️", label: "Journal Entries", unit: "entries" },
  { key: "scriptureMemorized", emoji: "🧠", label: "Scripture Memorized", unit: "verses" },
] as const;

export function EvidenceMuseum({ userId }: EvidenceMuseumProps) {
  const covenant = useCovenant(userId);
  const [graceDialogOpen, setGraceDialogOpen] = useState(false);
  const graceCounts = useMemo(
    () => Object.fromEntries(
      GRACE_EVIDENCE_CATEGORIES.map((category) => [
        category.key,
        covenant.graceEntries.filter((entry) => entry.category === category.key).length,
      ]),
    ) as Record<GraceEvidenceCategory, number>,
    [covenant.graceEntries],
  );

  if (covenant.isLoading) {
    return <div className="h-96 animate-pulse rounded-[2rem] bg-muted/40" />;
  }

  return (
    <div className="space-y-5">
      <section className="dashboard-os-surface overflow-hidden rounded-[2rem] border-primary/25 p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="relative z-10 grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Your Evidence</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-7xl font-bold leading-none text-foreground">
                {covenant.evidence.promisesKept.toLocaleString()}
              </span>
              <span className="pb-1 text-sm font-semibold text-muted-foreground">Promises Kept</span>
            </div>
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>Confidence comes from kept promises. Humility remembers who supplied the grace.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SummaryTile label="Covenant Days" value={covenant.evidence.covenantDaysKept} />
            <SummaryTile label="Current Rhythm" value={covenant.evidence.currentStreak} suffix="days" />
            <SummaryTile label="Longest Rhythm" value={covenant.evidence.bestStreak} suffix="days" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Evidence You Kept</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-foreground">A record of faithful obedience</h2>
          <p className="mt-1 text-sm text-muted-foreground">Not a scorecard. A reminder that your ordinary yeses have become a life.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FAITHFUL_EVIDENCE.map((item, index) => {
            const value = covenant.evidence[item.key];
            const formatted = item.key === "miles"
              ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : value.toLocaleString();
            return (
              <motion.article
                key={item.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.035 }}
                className="dashboard-os-card rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl">{item.emoji}</span>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-foreground">{formatted}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.unit}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{item.label}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Evidence God Changed</p>
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">Remember the work you did not do alone</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Answered prayer, Scripture, testimony, and changed lives keep the record grounded in grace instead of self-congratulation.
            </p>
          </div>
          <Button onClick={() => setGraceDialogOpen(true)} variant="outline" className="shrink-0 gap-2 border-amber-500/30">
            <Plus className="h-4 w-4" />
            Record Grace
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {GRACE_EVIDENCE_CATEGORIES.map((category) => (
            <div key={category.key} className="rounded-xl border border-amber-500/15 bg-background/55 p-3">
              <span className="text-lg">{category.emoji}</span>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">{graceCounts[category.key]}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{category.label}</p>
            </div>
          ))}
        </div>

        {covenant.graceEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-500/25 bg-background/40 px-4 py-8 text-center">
            <BookHeart className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-sm font-semibold text-foreground">Your testimony has room to grow here.</p>
            <p className="mt-1 text-xs text-muted-foreground">Record the moments you do not want hurry to make you forget.</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {covenant.graceEntries.slice(0, 8).map((entry) => {
              const category = GRACE_EVIDENCE_CATEGORIES.find((item) => item.key === entry.category);
              return (
                <article key={entry.id} className="rounded-2xl border border-amber-500/15 bg-background/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                        {category?.emoji} {category?.singular}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">{entry.title}</h3>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(`${entry.occurred_on}T12:00:00`), "MMM d, yyyy")}
                    </span>
                  </div>
                  {entry.story ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{entry.story}</p> : null}
                  {entry.scripture_reference ? (
                    <p className="mt-2 text-[11px] font-semibold text-primary">{entry.scripture_reference}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <GraceEvidenceDialog
        open={graceDialogOpen}
        onOpenChange={setGraceDialogOpen}
        onSave={covenant.addGraceEvidence}
        isSaving={covenant.isAddingGraceEvidence}
      />
    </div>
  );
}

function SummaryTile({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-background/55 p-3 text-center">
      <p className="font-display text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {suffix ? `${suffix} · ` : ""}{label}
      </p>
    </div>
  );
}

function GraceEvidenceDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    category: GraceEvidenceCategory;
    title: string;
    story?: string;
    scriptureReference?: string;
    occurredOn?: string;
  }) => Promise<unknown>;
  isSaving: boolean;
}) {
  const [category, setCategory] = useState<GraceEvidenceCategory>("answered_prayer");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [scriptureReference, setScriptureReference] = useState("");
  const [occurredOn, setOccurredOn] = useState(getTodayDateKey());

  const handleSave = async () => {
    if (!title.trim()) return;
    await onSave({ category, title, story, scriptureReference, occurredOn });
    setTitle("");
    setStory("");
    setScriptureReference("");
    setOccurredOn(getTodayDateKey());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Record Evidence of Grace</DialogTitle>
          <DialogDescription>Capture a moment you want your future self to remember with humility and gratitude.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Kind of evidence</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as GraceEvidenceCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRACE_EVIDENCE_CATEGORIES.map((item) => (
                  <SelectItem key={item.key} value={item.key}>{item.emoji} {item.singular}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grace-title">What happened?</Label>
            <Input id="grace-title" value={title} onChange={(event) => setTitle(event.target.value.slice(0, 120))} placeholder="A prayer was answered..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grace-story">Why does it matter?</Label>
            <Textarea id="grace-story" value={story} onChange={(event) => setStory(event.target.value.slice(0, 1000))} className="min-h-24" placeholder="Tell the story in your own words." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="grace-scripture">Scripture</Label>
              <Input id="grace-scripture" value={scriptureReference} onChange={(event) => setScriptureReference(event.target.value.slice(0, 80))} placeholder="Romans 8:28" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grace-date">Date</Label>
              <Input id="grace-date" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving} className="dashboard-primary-glow w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save to My Testimony
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
