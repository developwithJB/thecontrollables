import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Book } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";
import { ORDERED_CONTROLLABLE_GUIDES } from "@/lib/controllables";

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
    document.title = "The Dashboard | Companion app for The Controllables";
    const description = "The Dashboard helps you practice The Controllables daily with one clear brief, approved next actions, and Weekly Charge Reports.";
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
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto w-full">
        <Logo />
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Button>
        </Link>
      </nav>

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">The Controllables companion app</p>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4 text-balance">
              The Dashboard from the book, built for your real life.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto text-balance">
              Awareness, Perspective, Habit, Wellness, and Environment help turn your priorities, energy, and schedule into one clear plan you approve.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={ctaPath}
                onClick={() => trackEvent("cta", "cta_click", { cta_label: "Build my first brief", position: "hero" })}
              >
                <Button variant="glow" size="lg" className="h-14 px-10 text-base font-medium group">
                  Build my first brief
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#guides" onClick={() => trackEvent("cta", "cta_click", { cta_label: "Meet The Controllables", position: "hero" })}>
                <Button variant="outline" size="lg" className="h-14 px-8 text-base font-medium">
                  Meet The Controllables
                </Button>
              </a>
            </div>
          </motion.div>
        </section>

        {/* ─── Book Bridge ─── */}
        <section className="px-6 pb-20 max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-6"
          >
            <Book className="mx-auto mb-3 h-5 w-5 text-primary" />
            <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              The book introduced the inner world. The app helps you practice it.
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed text-balance">
              The Controllables gives you the framework. The Dashboard turns that framework into a daily operating rhythm you can actually use.
            </p>
          </motion.div>
        </section>

        {/* ─── Meet the Guides ─── */}
        <section id="guides" className="px-6 py-16 md:py-24 border-t border-border/30 scroll-mt-8">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground"
            >
              Meet the five guides
            </motion.h2>
            <div className="grid gap-3 sm:grid-cols-5">
              {ORDERED_CONTROLLABLE_GUIDES.map((guide, i) => (
                <motion.div
                  key={guide.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border bg-card px-3 py-4 shadow-sm"
                >
                  <p className="text-2xl" aria-hidden="true">{guide.emoji}</p>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">{guide.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{guide.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Solution ─── */}
        <section className="px-6 py-16 md:py-24 border-t border-border/30">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground"
            >
              Built for people who need direction, not another list.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              The Dashboard reads the signals you choose to share, creates a brief, and asks you to approve the next action before anything changes.
            </motion.p>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="px-6 py-16 md:py-24 border-t border-border/30">
          <div className="max-w-xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground text-center mb-12"
            >
              How it works
            </motion.h2>
            <div className="space-y-10">
              {[
                { step: "01", title: "Read your day", desc: "Your Dashboard looks at your priorities, energy, schedule, and approved signals." },
                { step: "02", title: "Get your brief", desc: "The five Controllables turn the day into one clear direction." },
                { step: "03", title: "Approve your next action", desc: "Nothing changes until you approve, edit, or remove the suggested move." },
                { step: "04", title: "Review your charge", desc: "Weekly Charge Reports show the patterns that helped or drained your week." },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-5"
                >
                  <span className="text-xs font-mono text-muted-foreground/50 pt-1 shrink-0">{item.step}</span>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Trust / Paid Value ─── */}
        <section className="px-6 py-16 md:py-24 border-t border-border/30">
          <div className="max-w-2xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground text-center mb-12"
            >
              Trust is part of the system
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8 md:gap-6">
              {[
                { title: "Nothing changes without your approval.", desc: "The Dashboard can suggest. You decide what gets added, edited, or removed." },
                { title: "Start simple.", desc: "Build your first brief without connecting every part of your life on day one." },
                { title: "Go deeper when it matters.", desc: "Pro unlocks Weekly Charge Reports and memory personalization for stronger patterns over time." },
              ].map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="text-center md:text-left"
                >
                  <h3 className="font-medium text-foreground mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Contrast ─── */}
        <section className="px-6 py-16 md:py-24 border-t border-border/30">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground"
            >
              The book teaches the framework. The app helps you practice it daily.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground leading-relaxed"
            >
              You do not need to have read the book to use The Dashboard. But if you have, this is where the framework becomes a daily operating system.
            </motion.p>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="px-6 py-20 md:py-28 border-t border-border/30">
          <div className="max-w-md mx-auto text-center space-y-6">
            <h3 className="font-display text-lg md:text-xl font-semibold text-foreground">
              Start your first Mission of the Day.
            </h3>
            <p className="text-sm text-muted-foreground">
              Start with one day, one priority, and one next action you approve. No credit card required.
            </p>
            <Link
              to={ctaPath}
              onClick={() => trackEvent("cta", "cta_click", { cta_label: "Start my first mission", position: "bottom" })}
            >
              <Button variant="glow" size="lg" className="h-12 px-8 text-base font-medium group">
                Start my first mission
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
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
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center space-y-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Questions?{" "}
          <a href="https://instagram.com/agbcoaching" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            @agbcoaching
          </a>
        </p>
        <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
