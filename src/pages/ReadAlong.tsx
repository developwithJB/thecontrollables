import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, ExternalLink, LockKeyhole, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Progress } from "@/components/ui/progress";
import { FutureCard, FutureChip, FutureHero, FuturePanel } from "@/components/ui/future";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useReadAlongProgress } from "@/hooks/useReadAlongProgress";
import {
  READ_ALONG_SECTIONS,
  READING_STATUS_DESCRIPTIONS,
  READING_STATUS_LABELS,
  getReadAlongSectionIcon,
  type ReadingStatus,
} from "@/lib/readAlong";
import { APP_ROUTES } from "@/lib/appRoutes";
import { cn } from "@/lib/utils";

const readingStatusOptions = Object.keys(READING_STATUS_LABELS) as ReadingStatus[];
const bookLink = "https://a.co/d/1DGPGEV";

export default function ReadAlong() {
  usePageViewTracking("Read Along Training");
  const user = useLifeOSUser();
  const {
    progress,
    visibleSections,
    progressPercent,
    setReadingStatus,
    markSectionComplete,
    markRepComplete,
  } = useReadAlongProgress(user.id);
  const visibleIds = new Set(visibleSections.map((section) => section.id));
  const hiddenSections = READ_ALONG_SECTIONS.filter((section) => !visibleIds.has(section.id));

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-24">
      <FutureHero
        eyebrow="Chapter reps"
        title="Read Along Training"
        icon={<BookOpen className="h-5 w-5" />}
        chips={
          <>
            <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Book = belief" />
            <FutureChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="App = practice" />
            <FutureChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Spoiler-safe" />
          </>
        }
        side={
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="future-eyebrow">Reading path</p>
              <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-muted/60" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={APP_ROUTES.home}>
                  Daily Charge
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <a href={bookLink} target="_blank" rel="noopener noreferrer">
                  Book
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        }
      >
        <InfoHint title="Read Along Training">
          Read the book to understand the 5 Controllables. Use the app to practice them as you go.
        </InfoHint>
      </FutureHero>

      <FuturePanel>
        <div className="mb-3">
          <p className="future-eyebrow">
            Where are you with the book?
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {readingStatusOptions.map((status) => {
            const isSelected = progress.status === status;
            return (
              <div
                key={status}
                className={cn(
                  "rounded-xl border px-3 py-3 transition-colors",
                  isSelected
                    ? "border-primary/35 bg-primary/10"
                    : "border-border/55 bg-background/60 hover:border-primary/30",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setReadingStatus(status)}
                    className="min-w-0 flex-1 text-left text-sm font-semibold text-foreground"
                  >
                    {READING_STATUS_LABELS[status]}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <InfoHint title={`${READING_STATUS_LABELS[status]} details`} className="h-6 w-6">
                      {READING_STATUS_DESCRIPTIONS[status]}
                    </InfoHint>
                    {isSelected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </FuturePanel>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-3">
          {visibleSections.map((section) => {
            const repDone = progress.completedRepIds.includes(section.id);
            const sectionDone = progress.completedSectionIds.includes(section.id);
            return (
              <FutureCard key={section.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="future-icon-frame h-11 w-11 text-xl">
                      {getReadAlongSectionIcon(section)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {section.eyebrow}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                        <InfoHint title={`${section.title} summary`}>
                          {section.summary}
                        </InfoHint>
                      </div>
                    </div>
                  </div>
                  <Badge variant={sectionDone ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                    {sectionDone ? "Complete" : section.id === progress.currentSectionId ? "Current" : "Open"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Controllable rep
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{section.rep}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Reflection prompt
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{section.reflectionPrompt}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant={repDone ? "outline" : "default"}
                    className="gap-2"
                    disabled={repDone}
                    onClick={() => markRepComplete(section.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {repDone ? "Rep done" : "Do today's rep"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={sectionDone}
                    onClick={() => markSectionComplete(section.id)}
                  >
                    {sectionDone ? "Section complete" : "Mark section complete"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </FutureCard>
            );
          })}
        </div>

        <aside className="space-y-3">
          <FuturePanel>
            <p className="future-eyebrow">
              Spoiler-safe path
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Next section only.</h2>
              <InfoHint title="Spoiler-safe path">
                Future sections stay collapsed until you complete the current rep.
              </InfoHint>
            </div>
          </FuturePanel>

          {hiddenSections.length > 0 ? (
            <div className="space-y-2">
              {hiddenSections.map((section) => (
                <div key={section.id} className="future-card flex items-center justify-between gap-3 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg opacity-60" aria-hidden="true">
                      {getReadAlongSectionIcon(section)}
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">{section.title}</p>
                  </div>
                  <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Book completed.</p>
                <InfoHint title="What continues">
                  The work continues in Daily Charge, the Promise Ledger, and Proof Loop.
                </InfoHint>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
