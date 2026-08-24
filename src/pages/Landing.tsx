import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Compass,
  HeartHandshake,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { FullyCharged75Roadmap } from "@/components/landing/FullyCharged75Roadmap";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";
import {
  getControllableGuideClasses,
  ORDERED_CONTROLLABLE_GUIDES,
  type ControllableGuideId,
} from "@/lib/controllables";

const dailyPractice = [
  {
    step: "01",
    title: "Awareness",
    copy: "Notice what is true before reaction takes over.",
  },
  {
    step: "02",
    title: "Perspective",
    copy: "Bring the story you are telling back under truth.",
  },
  {
    step: "03",
    title: "Habit",
    copy: "Choose one concrete promise you can faithfully keep.",
  },
  {
    step: "04",
    title: "Wellness",
    copy: "Steward your body with an adaptable movement practice.",
  },
  {
    step: "05",
    title: "Environment",
    copy: "Serve, simplify, or shape the space around you.",
  },
];

const journeyPaths = [
  {
    id: "read_along",
    title: "Read Along",
    eyebrow: "Flexible pace",
    description: "Spoiler-aware practices that move with your reading, rereading, or group study.",
    bestFor: "Best if you are in the book now",
    commitment: "No deadline",
    missRule: "Continue where you left off.",
  },
  {
    id: "charge_40",
    title: "40-Day Charge",
    eyebrow: "Structured formation",
    description: "A focused season of daily practice with honest progress and room to recover.",
    bestFor: "Best for a sustainable daily rhythm",
    commitment: "40 days",
    missRule: "A missed circuit never deletes prior work.",
  },
  {
    id: "fully_charged_75",
    title: "Fully Charged 75",
    eyebrow: "Strict accountability",
    description: "An explicitly strict path for people freely choosing exact daily requirements.",
    bestFor: "Best when you want an all-in commitment",
    commitment: "75 consecutive days",
    missRule: "An incomplete day ends that attempt; history remains.",
  },
] as const;

const firstDaySteps = [
  {
    icon: Compass,
    title: "Choose the right path",
    copy: "Tell us where you are with the book, then compare pace and miss rules before deciding.",
  },
  {
    icon: ShieldCheck,
    title: "Create your private space",
    copy: "Your choice carries through signup. Prayer, reflection, and proof content stay private.",
  },
  {
    icon: CalendarDays,
    title: "Open today’s practice",
    copy: "Land on one clear screen with the practices, adaptations, and next action for today.",
  },
];

const trustPromises = [
  { icon: LockKeyhole, title: "Private by default", copy: "No public rankings or public spiritual score." },
  { icon: RotateCcw, title: "Recovery without shame", copy: "Most paths preserve honest progress after a missed day." },
  { icon: HeartHandshake, title: "Grace before performance", copy: "Practice is a response to love, not a way to earn it." },
  { icon: ShieldCheck, title: "Adaptable movement", copy: "Valid adaptations keep wellness accessible and honest." },
];

const starterPhrases: Record<ControllableGuideId, string> = {
  awareness: "Notice what is true.",
  perspective: "Bring the story under truth.",
  habit: "Keep one faithful promise.",
  wellness: "Steward the vessel.",
  environment: "Shape and serve the space.",
};

function TodayPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-label="Preview of today's formation practice">
      <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card/95 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Today’s formation</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Put Jesus first</h2>
            <p className="mt-1 text-sm text-muted-foreground">Five practical circuits. One honest next step.</p>
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Path</p>
            <p className="mt-0.5 text-xs font-semibold text-primary">Read Along</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {ORDERED_CONTROLLABLE_GUIDES.map((guide, index) => {
            const classes = getControllableGuideClasses(guide.id);
            return (
              <div key={guide.id} className="flex items-center gap-3 rounded-xl border border-border/55 bg-background/45 px-3 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${classes.cardClass}`} aria-hidden="true">
                  {guide.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{guide.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{starterPhrases[guide.id]}</p>
                </div>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${index === 0 ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
                  {index === 0 ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px]">{index + 1}</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Your work stays yours</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Optional proof never replaces a required practice.</p>
          </div>
          <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  usePageViewTracking("Landing");
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(`/home${window.location.search}`, { replace: true });
      } else {
        setAuthChecked(true);
      }
    });
  }, [navigate]);

  useEffect(() => {
    document.title = "The Dashboard | Five Controllables. Fully Charged 75.";
    const description =
      "Train Awareness, Perspective, Habit, Wellness, and Environment through private Christian formation—including the strict Fully Charged 75-day path.";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, []);

  const quickStartEnabled = onboardingQuickStartEnabled();
  const ctaPath = quickStartEnabled ? "/quick-start" : "/auth?mode=signup";
  const pathHref = (path: string) => quickStartEnabled ? `/quick-start?path=${path}` : "/auth?mode=signup";

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8" aria-label="Primary navigation">
        <Logo />
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#paths" className="transition-colors hover:text-foreground">Paths</a>
          <a href="#fully-charged-75" className="transition-colors hover:text-foreground">75 days</a>
          <a href="#privacy" className="transition-colors hover:text-foreground">Privacy & recovery</a>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to={ctaPath}>Choose your path</Link>
          </Button>
        </div>
      </nav>

      <main className="overflow-x-hidden">
        <section data-testid="landing-hero" className="relative px-5 pb-20 pt-10 md:px-8 md:pb-28 md:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,hsl(var(--primary)/0.15),transparent_32%),radial-gradient(circle_at_82%_30%,hsl(var(--wellness)/0.09),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <motion.div initial={{ y: 16 }} animate={{ y: 0 }} transition={{ duration: 0.45 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                The daily practice of The Controllables
              </div>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] text-balance sm:text-5xl md:text-6xl">
                Put Jesus first. Train what you can control.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground text-balance md:text-lg">
                Turn what you believe into a clear daily rhythm: Scripture-guided reflection, five practical Controllables, one faithful action, and honest recovery without shame.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="glow" size="lg" className="h-14 w-full px-8 text-base font-semibold sm:w-auto">
                  <Link
                    to={ctaPath}
                    data-testid="cta-get-started"
                    onClick={() => trackEvent("cta", "cta_click", { cta_label: "Choose Your Path", position: "hero" })}
                  >
                    Choose your path
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 w-full px-8 text-base font-semibold sm:w-auto">
                  <a href="#how-it-works">See today’s practice</a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">About 60 seconds to choose a path · No birthday required · Change paths anytime</p>
              <div className="mt-7 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {["Private by default", "No public rankings", "Recovery without shame", "Movement can adapt"].map((promise) => (
                  <span key={promise} className="inline-flex items-center gap-1.5 rounded-full border border-border/65 bg-card/65 px-3 py-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {promise}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <TodayPreview />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border/50 bg-card/35 px-5 py-8 md:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 text-center sm:grid-cols-3">
            <div><p className="text-2xl font-semibold text-foreground">3 paths</p><p className="mt-1 text-xs text-muted-foreground">Flexible, structured, or strict</p></div>
            <div><p className="text-2xl font-semibold text-foreground">5 Controllables</p><p className="mt-1 text-xs text-muted-foreground">One practical system for daily life</p></div>
            <div><p className="text-2xl font-semibold text-foreground">1 clear today</p><p className="mt-1 text-xs text-muted-foreground">Know exactly what to do next</p></div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Your first session</p>
              <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Know exactly what happens next.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">No personality test. No unexplained intake. Choose a formation rhythm and open your first day.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {firstDaySteps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="relative rounded-2xl border border-border/65 bg-card p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Step {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                    {index < firstDaySteps.length - 1 ? <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 text-border md:block" /> : null}
                  </article>
                );
              })}
            </div>

            <div className="mt-20 grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The daily rhythm</p>
                <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Faith becomes practice in five circuits.</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">Each path uses the same practical framework. The pace, assignments, and recovery rules change; the core remains clear.</p>
              </div>
              <div className="space-y-3">
                {dailyPractice.map((practice) => (
                  <article key={practice.title} className="flex gap-4 rounded-2xl border border-border/65 bg-card p-5">
                    <span className="font-mono text-xs text-primary">{practice.step}</span>
                    <div><h3 className="font-semibold">{practice.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{practice.copy}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="paths" className="scroll-mt-8 border-y border-border/50 bg-card/30 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Choose for this season</p>
              <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Three paths. Clear expectations.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Compare the commitment and miss rule before you create an account. You can change paths later.</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {journeyPaths.map((path, index) => (
                <article key={path.id} className={`flex flex-col rounded-2xl border p-6 ${index === 1 ? "border-primary/45 bg-primary/5 shadow-[0_18px_60px_rgba(34,211,238,0.08)]" : "border-border/65 bg-background/55"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{path.eyebrow}</p>
                      <h3 className="mt-2 text-2xl font-semibold">{path.title}</h3>
                    </div>
                    {index === 1 ? <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">Most flexible structure</span> : null}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{path.description}</p>
                  <div className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
                    <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{path.bestFor}</span></p>
                    <p className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{path.commitment}</span></p>
                    <p className="flex gap-2"><RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>If you miss: {path.missRule}</span></p>
                  </div>
                  <Button asChild variant={index === 1 ? "glow" : "outline"} className="mt-7 w-full">
                    <Link to={pathHref(path.id)} onClick={() => trackEvent("cta", "path_selected", { track: path.id, position: "landing" })}>
                      Choose {path.title}<ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <FullyCharged75Roadmap
          ctaHref={pathHref("fully_charged_75")}
          onChoose={() => trackEvent("cta", "path_selected", { track: "fully_charged_75", position: "landing_75_roadmap" })}
        />

        <section className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
              <div>
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">The book gives you the language. The app gives you the reps.</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">The Dashboard turns the ideas in The Controllables into a daily formation practice that works whether you are reading now, finished, returning, or starting without the book.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {ORDERED_CONTROLLABLE_GUIDES.map((guide) => {
                  const classes = getControllableGuideClasses(guide.id);
                  return (
                    <div key={guide.id} className={`rounded-2xl border p-4 ${classes.cardClass}`}>
                      <span className="text-2xl" aria-hidden="true">{guide.emoji}</span>
                      <h3 className="mt-4 font-semibold">{guide.name}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{starterPhrases[guide.id]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-8 border-y border-border/50 bg-card/30 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Clear guardrails</p>
              <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Built for formation, not performance.</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustPromises.map((promise) => {
                const Icon = promise.icon;
                return (
                  <article key={promise.title} className="rounded-2xl border border-border/65 bg-background/55 p-5">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-4 font-semibold">{promise.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{promise.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-3xl rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_58%)] px-6 py-12 text-center sm:px-12">
            <Sparkles className="mx-auto h-6 w-6 text-primary" />
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Choose your path. Open your first day.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Start where you are, see the rules before you commit, and take one faithful next step.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="glow" size="lg" className="h-14 px-9 text-base font-semibold">
                <Link to={ctaPath} onClick={() => trackEvent("cta", "cta_click", { cta_label: "Choose Your Path", position: "bottom" })}>
                  Choose your path<ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-base font-semibold">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 px-5 py-8 text-center">
        <p className="text-xs text-muted-foreground">The Dashboard from The Controllables · Private daily formation</p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Questions?{" "}<a href="https://instagram.com/agbcoaching" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@agbcoaching</a>
          {" · "}© {new Date().getFullYear()} AGB Coaching
        </p>
      </footer>
    </div>
  );
}
