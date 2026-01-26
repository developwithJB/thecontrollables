import { motion } from "framer-motion";
import { Calendar, Brain, Layers } from "lucide-react";

const steps = [
  {
    icon: Calendar,
    title: "Check In",
    description: "A 5-minute daily ritual. Log how you're doing — The Dashboard is listening.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Brain,
    title: "Get Guided",
    description: "Based on your Build, patterns, and history, The Controllables suggest what to focus on.",
    color: "text-perspective",
    bgColor: "bg-perspective/10",
  },
  {
    icon: Layers,
    title: "Stack Progress",
    description: "Watch your weeks stack into a visual record of growth. The Dashboard remembers everything.",
    color: "text-habit",
    bgColor: "bg-habit/10",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-12 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        <h2 className="font-display text-xl font-semibold text-center mb-8 text-foreground">
          How It Learns You
        </h2>
        
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
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
        
        {/* Connection lines between steps */}
        <div className="hidden sm:block absolute left-[2.75rem] top-[4.5rem] w-px h-[calc(100%-6rem)] bg-gradient-to-b from-accent via-perspective to-habit opacity-20" />
      </motion.div>
    </section>
  );
}
