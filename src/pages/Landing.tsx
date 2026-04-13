import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Book } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";

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
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">AI Life Operating System</p>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4 text-balance">
              Your AI Life
              <br />
              Operating System
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto text-balance">
              Set it up once. Live with less friction.
            </p>
            <Link
              to={ctaPath}
              onClick={() => trackEvent("cta", "cta_click", { cta_label: "Get your daily direction", position: "hero" })}
            >
              <Button variant="glow" size="lg" className="h-14 px-10 text-base font-medium group">
                Get your daily direction
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* ─── Supporting copy ─── */}
        <section className="px-6 pb-20 max-w-xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm md:text-base text-muted-foreground leading-relaxed text-balance"
          >
            Connect your calendar, energy, habits, and environment.
            The Controllables turns the signals of your life into one clear daily direction.
          </motion.p>
        </section>

        {/* ─── Problem ─── */}
        <section className="px-6 py-16 md:py-24 border-t border-border/30">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground"
            >
              Most tools make you manage more.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              You already have calendars, trackers, notes, and intentions. But none of them work together to help you understand what kind of day you're actually in.
            </motion.p>
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
              One system that connects the dots.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              The Controllables connects your plans, your energy, and your real patterns — so you can respond with clarity instead of reacting on autopilot.
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
                { step: "01", title: "Set it up once", desc: "Connect your calendar and wearable. Tell us what matters this season." },
                { step: "02", title: "Get one clear daily direction", desc: "Each morning, your system synthesizes your energy, schedule, and patterns into guidance you can act on." },
                { step: "03", title: "Adjust before things spiral", desc: "Quiet signals help you protect your energy and stay aligned — before you feel overwhelmed." },
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

        {/* ─── Pillars ─── */}
        <section className="px-6 py-16 md:py-24 border-t border-border/30">
          <div className="max-w-2xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-xl md:text-2xl font-semibold text-foreground text-center mb-12"
            >
              Three things your system does
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8 md:gap-6">
              {[
                { title: "Understand Your Day", desc: "Know what kind of day you're in — before you decide what to do with it." },
                { title: "Protect Your Energy", desc: "See what could drain you and get a clear suggestion to stay ahead of it." },
                { title: "Stay Aligned", desc: "One daily reading and one quiet signal to keep you moving in the right direction." },
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
              Not more inputs. Better interpretation.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground leading-relaxed"
            >
              You don't need another app to fill in. You need one system that reads the signals you're already sending.
            </motion.p>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="px-6 py-20 md:py-28 border-t border-border/30">
          <div className="max-w-md mx-auto text-center space-y-6">
            <h3 className="font-display text-lg md:text-xl font-semibold text-foreground">
              Start with clarity.
            </h3>
            <p className="text-sm text-muted-foreground">
              Set up your Life OS in under 3 minutes. No credit card required.
            </p>
            <Link
              to={ctaPath}
              onClick={() => trackEvent("cta", "cta_click", { cta_label: "Set up your Life OS", position: "bottom" })}
            >
              <Button variant="glow" size="lg" className="h-12 px-8 text-base font-medium group">
                Set up your Life OS
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
