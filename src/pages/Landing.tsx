import { motion } from "framer-motion";
import { ArrowRight, Book } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { ControllableGuideCard, type ControllableType } from "@/components/landing/ControllableGuideCard";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { TrustDisclosure } from "@/components/landing/TrustDisclosure";
import { PhilosophySection } from "@/components/landing/PhilosophySection";
import { WhyStartSection } from "@/components/landing/WhyStartSection";

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

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-md mx-auto w-full">
        <Logo />
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Button>
        </Link>
      </nav>

      {/* Hero Content */}
      <main className="flex-1">
        <section className="px-6 py-10 max-w-md mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3 text-balance">
              <span className="text-accent">The Dashboard.</span>
              <br />
              Five guides. One calm place to reset.
            </h1>

            {/* Secondary CTA - Early Action */}
            <Link to="/auth?mode=signup">
              <Button variant="outline" size="lg" className="h-11 text-sm font-medium group">
                Start with one Snapshot
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <br />
            <br />

            <p className="text-muted-foreground text-sm leading-relaxed text-balance max-w-xs mx-auto mb-4">
              Check in daily, focus on what's controllable, and stack quiet proof that you can trust yourself again.
            </p>
          </motion.div>

          {/* The Controllables Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {controllables.slice(0, 4).map((c, i) => (
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

          {/* Fifth controllable centered */}
          <div className="flex justify-center mb-10">
            <div className="w-[calc(50%-0.375rem)]">
              <ControllableGuideCard
                type={controllables[4].type}
                emoji={controllables[4].emoji}
                name={controllables[4].name}
                tagline={controllables[4].tagline}
                index={4}
              />
            </div>
          </div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-3"
          >
            <Link to="/auth?mode=signup">
              <Button size="lg" className="w-full h-14 text-base font-medium group">
                Start with a 7-Day Snapshot
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
        <section className="py-8 px-6">
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-lg font-semibold text-foreground">Try one Snapshot.</h3>
              <p className="text-sm text-muted-foreground">See what changes.</p>
            </div>

            <div className="space-y-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="w-full h-12 text-base font-medium group">
                  Start free
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
      <footer className="px-6 py-8 text-center space-y-3 border-t border-border/30">
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
        <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} The Controllables</p>
      </footer>
    </div>
  );
}
