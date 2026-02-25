import { motion } from "framer-motion";
import { 
  BarChart3, 
  Camera, 
  History, 
  Target, 
  Clock, 
  Shield, 
  Sparkles, 
  MessageCircle,
  Mail
} from "lucide-react";

const coreFeatures = [
  {
    icon: Camera,
    title: "7-Day Snapshots",
    description: "Each week is a fresh start. Pick one focus, complete small daily actions, and build proof that you can show up — imperfectly.",
  },
  {
    icon: BarChart3,
    title: "Your Build Assessment",
    description: "See which Controllable needs attention. Are you depleted in Wellness? Struggling with Habit? Know where to focus first.",
  },
  {
    icon: Target,
    title: "Today's Actions",
    description: "One primary task each day. No overwhelm. If you do one thing today, make it count.",
  },
  {
    icon: Clock,
    title: "Time Reflection",
    description: "Log yesterday's focus level. A simple daily reflection that reveals patterns over time.",
  },
  {
    icon: Shield,
    title: "Integrity Meter",
    description: "Make small promises. Keep them. Watch your self-trust rebuild one kept commitment at a time.",
  },
  {
    icon: Sparkles,
    title: "7-Day Free Trial",
    description: "Get full access to every feature during your first Snapshot. No credit card required. Upgrade only if it helps.",
    trialBadge: true,
  },
  {
    icon: History,
    title: "Experience History",
    description: "Your weeks stack into quiet proof. Patterns emerge. The Dashboard remembers — even when you don't.",
    premium: true,
    trialAccess: true,
  },
  {
    icon: MessageCircle,
    title: "The Controllables Guides",
    description: "Five focused voices — Awareness, Perspective, Habit, Wellness, Environment — trained on behavior change principles. Not a chatbot. A thinking partner.",
    premium: true,
    trialAccess: true,
  },
  {
    icon: Sparkles,
    title: "Personalized Insights",
    description: "Weekly observations about your patterns, based on your check-ins and Snapshots. \"You're most consistent on Tuesdays.\"",
    premium: true,
  },
  {
    icon: Mail,
    title: "Daily Alignment",
    description: "A personalized morning email with scripture, a growth reflection, and one clear action — built from your Snapshot progress, Build scores, and check-in history. Delivered at 6 AM your time.",
    premium: true,
  },
];

export function FeatureGrid() {
  return (
    <section className="py-12 px-6 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        <h2 className="font-display text-xl font-semibold text-center mb-2 text-foreground">
          Everything You Need to Restart
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Simple tools that help you rebuild momentum — without the noise.
        </p>
        
        <div className="grid gap-3">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border"
            >
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display font-medium text-sm text-foreground">
                    {feature.title}
                  </h3>
                  {(feature as any).trialBadge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                      Free
                    </span>
                  )}
                  {(feature as any).trialAccess && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                      Free during trial
                    </span>
                  )}
                  {feature.premium && !(feature as any).trialAccess && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
