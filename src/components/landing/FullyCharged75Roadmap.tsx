import { useState } from "react";
import { ArrowRight, CalendarCheck2, Check, ChevronDown, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FORMATION_SEASON_LABELS,
  FULLY_CHARGED_75_DAY_GUIDES,
  FULLY_CHARGED_TOTAL_DAYS,
} from "@/domain/formation/fullyChargedJourney";
import { getControllableGuideClasses, ORDERED_CONTROLLABLE_GUIDES } from "@/lib/controllables";

const seasons = [
  {
    id: "be_with_jesus",
    days: "Days 1–25",
    title: "Be With Jesus",
    copy: "Attention, honest prayer, Scripture, trust, and presence before output.",
  },
  {
    id: "become_like_jesus",
    days: "Days 26–50",
    title: "Become Like Jesus",
    copy: "Integrity, humility, self-control, mercy, repair, and steady hidden faithfulness.",
  },
  {
    id: "do_what_jesus_did",
    days: "Days 51–75",
    title: "Do What Jesus Did",
    copy: "Service, hospitality, reconciliation, encouragement, generosity, and love in action.",
  },
] as const;

const strictRules = [
  "All five Controllables are required every local day.",
  "Each day needs an explicit server-confirmed closeout.",
  "An incomplete or unclosed day ends that attempt; completed history remains.",
  "Safe movement adaptations count when the day’s requirements are honestly met.",
];

interface FullyCharged75RoadmapProps {
  ctaHref: string;
  onChoose: () => void;
}

export function FullyCharged75Roadmap({ ctaHref, onChoose }: FullyCharged75RoadmapProps) {
  const [showAllDays, setShowAllDays] = useState(false);

  return (
    <section id="fully-charged-75" className="scroll-mt-8 border-y border-border/50 bg-card/30 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-end gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Fully Charged 75</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-balance md:text-5xl">
              Five Controllables. Seventy-five consecutive days.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              The strict path turns the same five daily circuits into a clearly governed 75-day commitment. You freely opt in, see the rules before starting, and keep every completed attempt in your private history.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {ORDERED_CONTROLLABLE_GUIDES.map((guide) => {
                const classes = getControllableGuideClasses(guide.id);
                return (
                  <span key={guide.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${classes.cardClass}`}>
                    <span aria-hidden="true">{guide.emoji}</span>{guide.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-primary/25 bg-[#050b16] shadow-[0_30px_100px_rgba(0,0,0,0.32)]" data-testid="fully-charged-75-graphic">
            <div className="relative min-h-[360px] overflow-hidden p-5 sm:p-7">
              <img
                src="/fully-charged-75-visual-v1.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,8,18,0.98)_0%,rgba(3,8,18,0.78)_42%,rgba(3,8,18,0.18)_100%)]" />
              <div className="relative flex min-h-[312px] flex-col justify-between">
                <div className="max-w-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">The complete strict rhythm</p>
                  <p className="mt-3 font-display text-6xl font-bold text-white sm:text-7xl">75</p>
                  <p className="mt-1 text-xl font-semibold text-white">local days</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <p><span className="block text-lg font-semibold text-white">5</span>circuits each day</p>
                    <p><span className="block text-lg font-semibold text-white">375</span>required circuit completions</p>
                  </div>
                </div>

                <div className="mt-8 max-w-xl rounded-2xl border border-white/15 bg-slate-950/70 p-3 backdrop-blur">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">75 consecutive day markers</p>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
                    aria-hidden="true"
                  >
                    {Array.from({ length: FULLY_CHARGED_TOTAL_DAYS }, (_, index) => (
                      <span
                        key={index}
                        className={`aspect-square rounded-full border ${index < 25 ? "border-cyan-300/70 bg-cyan-300/35" : index < 50 ? "border-violet-300/70 bg-violet-300/35" : "border-amber-300/70 bg-amber-300/35"}`}
                      />
                    ))}
                  </div>
                  <span className="sr-only">Seventy-five day markers arranged in five rows of fifteen.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {seasons.map((season) => (
            <article key={season.id} className="rounded-2xl border border-border/65 bg-background/55 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{season.days}</p>
              <h3 className="mt-2 text-xl font-semibold">{season.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{season.copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 rounded-3xl border border-border/65 bg-background/55 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Strict, transparent, and private</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {strictRules.map((rule) => (
                <p key={rule} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{rule}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button
              type="button"
              variant="outline"
              aria-expanded={showAllDays}
              aria-controls="fully-charged-day-details"
              onClick={() => setShowAllDays((current) => !current)}
            >
              {showAllDays ? "Hide day-by-day details" : "Explore all 75 days"}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAllDays ? "rotate-180" : ""}`} />
            </Button>
            <Button asChild variant="glow">
              <Link to={ctaHref} onClick={onChoose}>
                Choose Fully Charged 75<ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {showAllDays ? (
          <div id="fully-charged-day-details" className="mt-8 space-y-4" data-testid="fully-charged-75-day-details">
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                This roadmap previews the day themes and Scripture references. Inside an active journey, only independently reviewed and published copy can open for that day. Reflections remain private.
              </p>
            </div>

            {seasons.map((season) => {
              const seasonGuides = FULLY_CHARGED_75_DAY_GUIDES.filter((guide) => guide.season === season.id);
              return (
                <details key={season.id} className="group rounded-2xl border border-border/65 bg-card" open={season.id === "be_with_jesus"}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:content-none">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{season.days}</p>
                      <h3 className="mt-1 text-lg font-semibold">{FORMATION_SEASON_LABELS[season.id]}</h3>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-3 border-t border-border/60 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {seasonGuides.map((guide) => (
                      <details key={guide.dayNumber} className="group/day rounded-xl border border-border/60 bg-background/55">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 marker:content-none">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Day {guide.dayNumber}</p>
                            <h4 className="mt-1 text-sm font-semibold">{guide.title}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">{guide.scriptureReference}</p>
                          </div>
                          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/day:rotate-180" />
                        </summary>
                        <div className="space-y-3 border-t border-border/50 px-4 py-4 text-xs leading-5 text-muted-foreground">
                          <p><span className="font-semibold text-foreground">Invitation:</span> {guide.invitation}</p>
                          <p><span className="font-semibold text-foreground">Private reflection:</span> {guide.reflectionPrompt}</p>
                          <p><span className="font-semibold text-foreground">Service:</span> {guide.servicePrompt}</p>
                          {guide.reviewDay ? <p className="flex items-center gap-2 font-semibold text-primary"><CalendarCheck2 className="h-3.5 w-3.5" />Weekly review day</p> : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
