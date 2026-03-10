import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Book } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { ControllableGuideCard, type ControllableType } from "@/components/landing/ControllableGuideCard";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { TrustDisclosure } from "@/components/landing/TrustDisclosure";
import { PhilosophySection } from "@/components/landing/PhilosophySection";
import { WhyStartSection } from "@/components/landing/WhyStartSection";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";

const controllables: Array<{
  type: ControllableType;
  emoji: string;
  name: string;
  tagline: string;
}> = [
  {
    type: "awareness",
    emoji: "🦉",
    name: "Awareness",
    tagline: "Pause before reacting. Notice what's actually happening.",
  },
  {
    type: "perspective",
    emoji: "🐢",
    name: "Perspective",
    tagline: "Zoom out. This is one chapter, not the whole story.",
  },
  { type: "habit", emoji: "🦈", name: "Habit", tagline: "One rep still counts. Show up imperfectly." },
  { type: "wellness", emoji: "🛰️", name: "Wellness", tagline: "Sleep, movement, fuel. Fix the basics first." },
  { type: "environment", emoji: "🚀", name: "Environment", tagline: "Remove friction. Make the right choice easier." },
];

export default function Landing() {
  usePageViewTracking("Landing");
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  // Auto-redirect logged-in users to /home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const params = window.location.search;
        navigate(`/home${params}`, { replace: true });
      } else {
        setAuthChecked(true);
      }
    });
  }, [navigate]);

  const quickStartEnabled = onboardingQuickStartEnabled();

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden relative">
      {/* Grid background overlay */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />
      
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none opacity-40">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.15),transparent_70%)]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto w-full">
        <Logo />
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Button>
        </Link>
      </nav>

      {/* Hero Content */}
      <main className="flex-1 relative z-10">
        <section className="px-6 py-10 md:py-16 lg:py-20 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-12"
          >
            <h1 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-5 text-balance">
              Your Life OS.
              <br />
              <span className="text-accent">Wellness. Growth. Planner. Wealth.</span>
            </h1>

            <p className="text-muted-foreground text-sm md:text-base lg:text-lg leading-relaxed text-balance max-w-xs md:max-w-lg mx-auto mb-4">
              Plan your day, track your finances, sync your calendar, and grow through 7-day focus Snapshots — all in one calm place. Full access for 7 days. No credit card.
            </p>
          </motion.div>

          {/* The Controllables Grid */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 md:mb-12 md:max-w-2xl lg:max-w-none mx-auto [&>*]:w-[calc(50%-0.375rem)] md:[&>*]:w-[calc(33.333%-0.5rem)] lg:[&>*]:w-[calc(20%-0.6rem)]">
            {controllables.map((c, i) => (
              <ControllableGuideCard
                key={c.name}
                type={c.type}
                emoji={c.emoji}
                name={c.name}
                tagline={c.tagline}
                index={i}
              />
            ))}
          </div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-3 max-w-md mx-auto"
          >
            <Link to={quickStartEnabled ? "/quick-start" : "/auth?mode=signup"} onClick={() => trackEvent("cta", "cta_click", { cta_label: "Start with a 7-Day Snapshot", position: "hero" })}>
              <Button variant="glow" size="lg" className="w-full h-14 text-base font-medium group">
                Start your free 7-Day Trial
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* How It Works */}
        <HowItWorksSection />

        {/* Why Start */}
        <WhyStartSection />

        {/* Features */}
        <FeatureGrid />

        {/* Philosophy */}
        <PhilosophySection />

        {/* Trust Disclosure */}
        <TrustDisclosure />

        {/* Secondary CTA */}
        <section className="py-8 md:py-12 px-6">
          <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto text-center space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-lg font-semibold text-foreground">Try your Life OS.</h3>
              <p className="text-sm text-muted-foreground">Full access for 7 days. No credit card. See what changes.</p>
            </div>

            <div className="space-y-3">
              <Link to={quickStartEnabled ? "/quick-start" : "/auth?mode=signup"} onClick={() => trackEvent("cta", "cta_click", { cta_label: "Start your free 7-Day Trial", position: "bottom" })}>
                <Button variant="glow" size="lg" className="w-full h-12 text-base font-medium group">
                  Start your free 7-Day Trial
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <p className="text-xs text-muted-foreground">Upgrade only if it helps.</p>

              <a
                href="https://a.co/d/1DGPGEV"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <Book className="w-3 h-3" />
                Or read the book first
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 text-center space-y-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Questions? Message us on Instagram{" "}
          <a
            href="https://instagram.com/agbcoaching"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            @agbcoaching
          </a>
        </p>
        <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
