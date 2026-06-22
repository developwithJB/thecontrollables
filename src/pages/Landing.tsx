import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Camera,
  ChevronRight,
  Compass,
  Gauge,
  LockKeyhole,
  Radio,
  RotateCcw,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Logo } from "@/components/Logo";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";
import {
  getControllableGuideClasses,
  ORDERED_CONTROLLABLE_GUIDES,
  type ControllableGuideId,
} from "@/lib/controllables";

const firstSessionSteps = [
  {
    step: "01",
    title: "Take Starting Charge",
    copy: "Get one honest read of where you are starting today.",
    icon: Gauge,
  },
  {
    step: "02",
    title: "Get your focus",
    copy: "See which Controllable is leading and which one needs training.",
    icon: Compass,
  },
  {
    step: "03",
    title: "Do Daily Charge",
    copy: "Name what you control, what you release, and the next honest move.",
    icon: Zap,
  },
  {
    step: "04",
    title: "Keep one promise",
    copy: "Complete one small mission that builds trust with yourself.",
    icon: Target,
  },
  {
    step: "05",
    title: "Add proof",
    copy: "Optionally save private photo proof after the rep.",
    icon: Camera,
  },
  {
    step: "06",
    title: "Watch Self-Trust move",
    copy: "See evidence that one kept promise counted.",
    icon: ShieldCheck,
  },
];

const fiveMinuteSteps = [
  {
    step: "01",
    title: "Get your read",
    copy: "See where your head, habits, and energy are today.",
    icon: Gauge,
  },
  {
    step: "02",
    title: "Choose your Controllable",
    copy: "Pick what you can actually control.",
    icon: Compass,
  },
  {
    step: "03",
    title: "Keep one promise",
    copy: "Do one small mission that builds trust with yourself.",
    icon: Target,
  },
  {
    step: "04",
    title: "Add private proof",
    copy: "Capture the rep without exposing your private life.",
    icon: Camera,
  },
  {
    step: "05",
    title: "Build your Dex",
    copy: "Watch your real-life reps stack up over time.",
    icon: Zap,
  },
];

const journeyEditions = [
  {
    title: "Reset Edition",
    line: "Return from drift.",
    bestFor: "Best for getting re-aligned.",
    length: "7-Day Reset",
  },
  {
    title: "Charge Edition",
    line: "Build daily momentum.",
    bestFor: "Best for staying energized.",
    length: "30-Day Upgrade",
  },
  {
    title: "Upgrade Edition",
    line: "Always Get Better.",
    bestFor: "Best for long-term growth.",
    length: "Continuous Upgrade",
  },
];

const starterPhrases: Record<ControllableGuideId, string> = {
  awareness: "Notice what is true.",
  perspective: "Reframe the story.",
  habit: "Keep one promise.",
  wellness: "Protect the vessel.",
  environment: "Clear the field.",
};

const missionDropPreview = [
  {
    label: "Core Mission",
    title: "Charge Habit",
    instruction: "Keep one small promise.",
    reward: "+40 Habit XP",
  },
  {
    label: "Chicago Mission",
    title: "Charge Wellness",
    instruction: "Get 10 minutes outside.",
    reward: "+30 Wellness XP",
  },
  {
    label: "Recovery Mission",
    title: "Return from Drift",
    instruction: "One quiet minute. No shame.",
    reward: "+20 Self-Trust",
  },
];

const dexPreview = [
  { controllable: "Habit", count: 1, active: true },
  { controllable: "Wellness", count: 0, active: false },
  { controllable: "Awareness", count: 0, active: false },
  { controllable: "Perspective", count: 0, active: false },
  { controllable: "Environment", count: 0, active: false },
];

const privacyChips = [
  "Private by default",
  "One photo at a time",
  "No background scanning",
  "No exact location sharing",
  "Captions stay private unless shared",
];

const practiceFlowCards = [
  {
    id: "starting-charge",
    title: "Starting Charge",
    copy: "Get a quick read on which Controllable is strongest, which one needs training, and where to begin.",
    cta: "Find my charge",
  },
  {
    id: "read-along",
    title: "Read Along Training",
    copy: "Use spoiler-safe chapter reps while you read, reread, or lead others through the book.",
    cta: "Read with the app",
  },
  {
    id: "daily-charge",
    title: "Daily Charge",
    copy: "Start the day with Today's Read, Ego Signal, Main Mission, and Control / Release / Move.",
    cta: "Start today grounded",
  },
  {
    id: "promise-ledger",
    title: "Promise Ledger",
    copy: "Rebuild Self-Trust by keeping small promises and logging recovery wins without shame.",
    cta: "Build Self-Trust",
  },
  {
    id: "proof-loop",
    title: "Proof Loop",
    copy: "Save private proof of real-life reps in your Controllables Dex and share only safe milestones when you choose.",
    cta: "Collect proof privately",
  },
];

function HeroDashboardPreview() {
  return (
    <div className="relative mx-auto mt-12 h-[460px] w-full max-w-[520px] sm:h-[500px]" aria-label="Dashboard preview">
      <div className="absolute inset-x-4 top-8 h-64 rounded-full border border-primary/20 opacity-80" />
      <div className="absolute inset-x-14 top-16 h-48 rounded-full border border-primary/30 opacity-80" />
      <div className="absolute left-1/2 top-24 flex h-32 w-32 -translate-x-1/2 flex-col items-center justify-center rounded-full border border-primary/40 bg-background/90 shadow-[0_0_48px_rgba(34,211,238,0.16)]">
        <Zap className="h-7 w-7 text-primary" />
        <span className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">Charge Core</span>
        <span className="text-sm font-semibold text-foreground">Level 1</span>
      </div>

      <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
        <span className="text-lg" aria-hidden="true">🦉</span>
        <p className="text-[11px] font-medium text-foreground">Awareness</p>
      </div>
      <div className="absolute left-0 top-28 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
        <span className="text-lg" aria-hidden="true">🐢</span>
        <p className="text-[11px] font-medium text-foreground">Perspective</p>
      </div>
      <div className="absolute right-0 top-28 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
        <span className="text-lg" aria-hidden="true">🦈</span>
        <p className="text-[11px] font-medium text-foreground">Habit</p>
      </div>
      <div className="absolute bottom-36 left-8 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
        <span className="text-lg" aria-hidden="true">🛰️</span>
        <p className="text-[11px] font-medium text-foreground">Wellness</p>
      </div>
      <div className="absolute bottom-36 right-8 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
        <span className="text-lg" aria-hidden="true">🚀</span>
        <p className="text-[11px] font-medium text-foreground">Environment</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-primary">Mission 001</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Charge Habit</h3>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-right">
            <p className="text-[11px] text-muted-foreground">Self-Trust</p>
            <p className="text-sm font-semibold text-primary">Level 1</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Keep one small promise before the day ends.</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[70, 45, 62, 30].map((charge, index) => (
            <div key={charge} className="h-2 rounded-full bg-muted" aria-label={`Charge ring ${index + 1}`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${charge}%` }} />
            </div>
          ))}
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
    document.title = "The Dashboard | Start charging your Controllables";
    const description =
      "Enter The Dashboard, find your Starting Charge, complete Mission 001, and keep charging your Controllables with daily Mission Drops.";
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

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Logo />
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link to="/auth">
            Sign in
          </Link>
        </Button>
      </nav>

      <main className="overflow-x-hidden">
        <section className="px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase text-primary">The Dashboard from The Controllables</p>
              <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-foreground text-balance md:text-6xl">
                Enter Your Dashboard
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-muted-foreground text-balance md:text-xl">
                Find your charge. Complete Mission 001. Build Self-Trust.
              </p>
              <div className="mt-3 flex justify-center">
                <InfoHint title="What The Dashboard does">
                  The Dashboard turns The Controllables into daily reps: read with the book, start each morning grounded, keep one promise, and collect private proof.
                </InfoHint>
              </div>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="glow" size="lg" className="h-14 w-full px-10 text-base font-semibold sm:w-auto">
                  <Link
                    to={ctaPath}
                    onClick={() => trackEvent("cta", "cta_click", { cta_label: "Start Your Scan", position: "hero" })}
                  >
                    Start Your Scan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 w-full px-8 text-base font-semibold sm:w-auto">
                  <a
                    href="#how-it-works"
                    onClick={() => trackEvent("cta", "cta_click", { cta_label: "See How It Works", position: "hero" })}
                  >
                    See How It Works
                  </a>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                {["Starting Charge", "Read Along", "Daily Charge", "Promise Ledger", "Proof Loop"].map((chip) => (
                  <span key={chip} className="rounded-md border bg-card px-3 py-1.5">
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              <HeroDashboardPreview />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border/40 px-5 py-12 md:px-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
              The book gives you the language. The app gives you the reps.
            </h2>
            <InfoHint title="Book-to-app handoff">
              The Controllables introduces The Dashboard, charge, circuits, Ego, and living Fully Charged. This is where those ideas become daily practice.
            </InfoHint>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 border-b border-border/40 px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase text-primary">How it works in 5 minutes a day</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
                One read. One promise. One proof.
              </h2>
              <div className="mt-3 flex justify-center">
                <InfoHint title="The daily loop">
                  New users should not have to wander. Start with a read, choose one Controllable, keep one promise, and collect proof.
                </InfoHint>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {fiveMinuteSteps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{item.copy}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-border/40 px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase text-primary">How The Dashboard Helps</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
                Practice the book in real life.
              </h2>
              <div className="mt-3 flex justify-center">
                <InfoHint title="How it helps">
                  Start here: find your starting point, read with reps, begin each day grounded, build Self-Trust, and collect proof of who you are becoming.
                </InfoHint>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {practiceFlowCards.map((flow, index) => (
                <article
                  key={flow.id}
                  className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                    <InfoHint title={`${flow.title} details`} className="h-7 w-7 border-transparent bg-transparent">
                      {flow.copy}
                    </InfoHint>
                  </div>
                  <Link to={flow.id === "starting-charge" ? ctaPath : "/auth?mode=signup"}>
                    <h3 className="text-base font-semibold text-foreground">{flow.title}</h3>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                      {flow.cta}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-2 text-center">
              <p className="text-xs font-semibold uppercase text-primary">First-session clarity</p>
              <h2 className="font-display text-3xl font-semibold text-foreground">The happy path is obvious.</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {firstSessionSteps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="relative rounded-lg border bg-card p-4"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <InfoHint title={`${item.title} details`} className="h-7 w-7">
                        {item.copy}
                      </InfoHint>
                    </div>
                    {index < firstSessionSteps.length - 1 ? (
                      <ChevronRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-border md:block" />
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase text-primary">Journey Edition</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Choose the path for this season</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {journeyEditions.map((edition) => (
                <div key={edition.title} className="rounded-lg border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{edition.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{edition.line}</p>
                    </div>
                    <InfoHint title={`${edition.title} details`} className="h-7 w-7">
                      {edition.bestFor}
                    </InfoHint>
                  </div>
                  <div className="mt-4 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    {edition.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase text-primary">Starter Controllable</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Choose your first charge</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ORDERED_CONTROLLABLE_GUIDES.map((guide) => {
                const classes = getControllableGuideClasses(guide.id);
                return (
                  <div key={guide.id} className={`rounded-lg border p-4 ${classes.cardClass}`}>
                    <div className="flex items-center gap-3 lg:block">
                      <span className="text-3xl" aria-hidden="true">{guide.emoji}</span>
                      <div className="lg:mt-4">
                        <h3 className="font-semibold text-foreground">{guide.name}</h3>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{starterPhrases[guide.id]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Today&apos;s Mission Drop</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-foreground">Real-life reps, not busywork</h2>
              <div className="mt-3">
                <InfoHint title="Mission Drops">
                  Every morning, missions drop. Some are personal. One can be city/state level when you opt in.
                </InfoHint>
              </div>
            </div>
            <div className="grid gap-3">
              {missionDropPreview.map((mission) => (
                <div key={mission.label} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-primary">{mission.label}</p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{mission.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{mission.instruction}</p>
                    </div>
                    <div className="w-fit rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                      {mission.reward}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Controllables Dex</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-foreground">Collect proof, not pressure.</h2>
              <div className="mt-3">
                <InfoHint title="Controllables Dex">
                  After a mission, you can optionally add one photo to your Controllables Dex. Your proof starts private.
                </InfoHint>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {privacyChips.map((chip) => (
                  <span key={chip} className="rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-primary">Private Dex</p>
                  <h3 className="text-lg font-semibold text-foreground">Mission proof</h3>
                </div>
                <LockKeyhole className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3">
                {dexPreview.map((entry) => (
                  <div key={entry.controllable} className="flex items-center gap-3">
                    <div className={`h-2 flex-1 rounded-full ${entry.active ? "bg-primary" : "bg-muted"}`} />
                    <span className="w-28 text-sm text-muted-foreground">{entry.controllable}</span>
                    <span className="w-16 text-right text-sm font-semibold text-foreground">{entry.count} proof</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Privacy-first sharing</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-foreground">Share the proof, not the private work.</h2>
              <div className="mt-3">
                <InfoHint title="Sharing rules">
                  Share cards use safe milestone copy. Reflections, captions, exact location, and private details stay out unless you choose otherwise.
                </InfoHint>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-5 flex items-center justify-between">
                <Radio className="h-5 w-5 text-primary" />
                <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  Safe share copy
                </span>
              </div>
              <div className="space-y-2 text-lg font-semibold text-foreground">
                <p>Mission 001 Complete</p>
                <p>I charged Habit today.</p>
                <p>One kept promise at a time.</p>
                <p>Control the Controllables one day at a time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <RotateCcw className="mx-auto h-6 w-6 text-primary" />
            <h2 className="mt-4 font-display text-3xl font-semibold text-foreground md:text-4xl">
              Ready to start charging?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Your first mission takes less than 10 minutes.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="glow" size="lg" className="h-14 w-full px-10 text-base font-semibold sm:w-auto">
                <Link
                  to={ctaPath}
                  onClick={() => trackEvent("cta", "cta_click", { cta_label: "Start Your Scan", position: "bottom" })}
                >
                  Start Your Scan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 w-full px-8 text-base font-semibold sm:w-auto">
                <Link
                  to="/home"
                  onClick={() => trackEvent("cta", "cta_click", { cta_label: "Explore The Dashboard", position: "bottom" })}
                >
                  Explore The Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 px-5 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          Questions?{" "}
          <a href="https://instagram.com/agbcoaching" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            @agbcoaching
          </a>
        </p>
        <p className="mt-3 text-xs text-muted-foreground/70">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
