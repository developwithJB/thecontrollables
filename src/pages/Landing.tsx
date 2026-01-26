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

const controllables: Array<{
  type: ControllableType;
  emoji: string;
  name: string;
  tagline: string;
}> = [
  { type: "awareness", emoji: "🦉", name: "Awareness", tagline: "Pause. Observe. Choose." },
  { type: "perspective", emoji: "🐢", name: "Perspective", tagline: "Zoom out. This is one chapter." },
  { type: "habit", emoji: "🦈", name: "Habit", tagline: "Keep moving. One rep." },
  { type: "wellness", emoji: "🛰️", name: "Wellness", tagline: "Check your systems." },
  { type: "environment", emoji: "🚀", name: "Environment", tagline: "Design your surroundings." },
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
              Five guides. One dashboard.
              <br />
              <span className="text-accent">Built around you.</span>
            </h1>

            <p className="text-muted-foreground text-sm leading-relaxed text-balance max-w-xs mx-auto">
              The Dashboard learns how you think, where you struggle, and what works — then adapts to guide you forward.
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
              <Button
                size="lg"
                className="w-full h-14 text-base font-medium group"
              >
                Build Your Dashboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* How It Works */}
        <HowItWorksSection />

        {/* Adaptive Intelligence */}
        <FeatureGrid />

        {/* Trust Disclosure */}
        <TrustDisclosure />

        {/* Secondary CTA */}
        <section className="py-8 px-6">
          <div className="max-w-md mx-auto space-y-3">
            <Link to="/auth?mode=signup">
              <Button
                size="lg"
                className="w-full h-12 text-base font-medium group"
              >
                Begin Your Journey
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <a
              href="https://a.co/d/1DGPGEV"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="ghost" className="w-full text-muted-foreground">
                <Book className="w-4 h-4 mr-2" />
                Read the Book First
              </Button>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} The Controllables
        </p>
      </footer>
    </div>
  );
}
