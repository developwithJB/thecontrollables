import { motion } from "framer-motion";
import { ArrowRight, Book, Flame, Target, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const controllables = [
  { emoji: "🦉", name: "Awareness", color: "text-awareness" },
  { emoji: "🐢", name: "Perspective", color: "text-perspective" },
  { emoji: "🦈", name: "Habit", color: "text-habit" },
  { emoji: "🛰️", name: "Wellness", color: "text-wellness" },
  { emoji: "🚀", name: "Environment", color: "text-environment" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="hero-glow" />
        
        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Flame className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Your flight controls for life</span>
            </div>
          </motion.div>

          <motion.h1
            className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Less noise.
            <br />
            <span className="text-accent">More clarity.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            The Dashboard helps you see what matters most. Check in daily, 
            maintain your streak, and take action in real life. No endless scrolling. 
            Just focus.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 text-base font-medium group">
                Start Your Dashboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a 
              href="https://a.co/d/1DGPGEV"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="px-8 h-12 text-base font-medium group">
                <Book className="w-4 h-4 mr-2" />
                Read the Book
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Controllables Section */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              The 5 Controllables
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Five anchors to ground your daily focus. Each one a lens to see your life clearly.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {controllables.map((c, i) => (
              <motion.div
                key={c.name}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border shadow-soft"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className={`font-medium ${c.color}`}>{c.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Daily Focus",
                description: "One singular focus per day. No overwhelm, just clarity on what matters most.",
              },
              {
                icon: Flame,
                title: "Streak Tracking",
                description: "Build momentum with daily check-ins. Watch your consistency grow over time.",
              },
              {
                icon: Compass,
                title: "7-Day Challenge",
                description: "A guided journey through all 5 Controllables. Solo or with friends.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="p-6 rounded-2xl bg-card border shadow-soft"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to reset?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              The Dashboard is your cockpit. The book is your operating manual. 
              Together, they help you fly through life with intention.
            </p>
            <Link to="/auth?mode=signup">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 h-12 text-base font-medium"
              >
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a 
              href="https://a.co/d/1DGPGEV"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              The Book
            </a>
            <span className="text-border">•</span>
            <span>© {new Date().getFullYear()} The Controllables</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
