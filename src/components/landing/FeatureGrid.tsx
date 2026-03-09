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
  Mail,
  Calendar,
  DollarSign,
  Plug,
  Heart
} from "lucide-react";

const coreFeatures = [
  {
    icon: Calendar,
    title: "Planner",
    description: "Your daily command center. Tasks, time blocks, routines — synced with Google Calendar and Todoist if you want.",
  },
  {
    icon: DollarSign,
    title: "Money Hub",
    description: "Track bills, subscriptions, budgets, and savings goals. Import bank transactions via CSV. See what's due and where you stand.",
  },
  {
    icon: Plug,
    title: "Integration Hub",
    description: "Connect Google Calendar, Gmail, Todoist, and Notion. Sync events, import tasks, get inbox summaries, export to Notion.",
  },
  {
    icon: Camera,
    title: "7-Day Snapshots",
    description: "Each week is a fresh start. Pick one focus, complete small daily actions, and build proof that you can show up — imperfectly.",
  },
  {
    icon: BarChart3,
    title: "Build Assessment",
    description: "See which Controllable needs attention. Are you depleted in Wellness? Struggling with Habit? Know where to focus first.",
  },
  {
    icon: Heart,
    title: "Brain & Body Tracker",
    description: "Log sleep, movement, and nutrition. Import from Apple Health or Google Fit. See how wellness affects everything else.",
  },
  {
    icon: Target,
    title: "Daily OS",
    description: "Your prioritized daily actions, briefing, and Gmail summary (if connected). One clear starting point each morning.",
  },
  {
    icon: Clock,
    title: "Time Reflection",
    description: "Log minutes invested vs. wasted. A simple daily reflection that reveals patterns over time.",
  },
  {
    icon: Shield,
    title: "Integrity Meter",
    description: "Make small promises. Keep them. Watch your self-trust rebuild one kept commitment at a time.",
  },
  {
    icon: Sparkles,
    title: "7-Day Free Trial",
    description: "Get full access to every feature for your first week. No credit card required. Upgrade only if it helps.",
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
    title: "AI Guides",
    description: "Five focused voices — Awareness, Perspective, Habit, Wellness, Environment — trained on behavior change principles. A thinking partner.",
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
    description: "A personalized morning email with scripture, a growth reflection, and one clear action — built from your data. Delivered at 6 AM your time.",
    premium: true,
  },
];

export function FeatureGrid() {
  return (
    <section className="py-12 md:py-16 px-6 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        <h2 className="font-display text-xl md:text-2xl font-semibold text-center mb-2 text-foreground">
          Everything You Need to Run Your Life
        </h2>
        <p className="text-sm md:text-base text-muted-foreground text-center mb-8">
          Planner, money, wellness, growth — all in one calm interface.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
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
