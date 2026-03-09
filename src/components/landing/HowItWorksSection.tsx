import { motion } from "framer-motion";
import { Calendar, Brain, Camera, Layers, DollarSign, Plug } from "lucide-react";

const steps = [
  {
    icon: Calendar,
    title: "Plan Your Day",
    description: "Open your Planner. See your tasks, events, and routines. Sync with Google Calendar if you want — or keep it simple.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: DollarSign,
    title: "Know Your Money",
    description: "Bills due, budget status, savings progress — all in one place. Import transactions or track manually.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Plug,
    title: "Connect Your Tools",
    description: "Link Google Calendar, Gmail, Todoist, and Notion. Your existing tools feed into one unified dashboard.",
    color: "text-perspective",
    bgColor: "bg-perspective/10",
  },
  {
    icon: Camera,
    title: "Run a Snapshot",
    description: "Each week is a 7-day focus period. Pick a theme, check in daily, and build proof you can show up.",
    color: "text-wellness",
    bgColor: "bg-wellness/10",
  },
  {
    icon: Brain,
    title: "Get Guided",
    description: "AI Guides notice what you actually do and help you focus on what matters. Human-centric, not robotic.",
    color: "text-habit",
    bgColor: "bg-habit/10",
  },
  {
    icon: Layers,
    title: "Stack Proof",
    description: "Your days and weeks stack into a quiet record of effort. The Dashboard remembers — even when you don't.",
    color: "text-environment",
    bgColor: "bg-environment/10",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-12 md:py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        <h2 className="font-display text-xl md:text-2xl font-semibold text-center mb-8 text-foreground">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border"
            >
              <div className={`p-2.5 rounded-lg ${step.bgColor} shrink-0`}>
                <step.icon className={`w-5 h-5 ${step.color}`} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
