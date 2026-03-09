import { motion } from "framer-motion";
import { Heart, RefreshCw, CheckCircle } from "lucide-react";

const principles = [
  {
    icon: RefreshCw,
    title: "Starting over is the skill",
    description: "Missed a day? A week? It doesn't matter. What matters is coming back. The Dashboard is designed for restart, not perfection.",
  },
  {
    icon: Heart,
    title: "Consistency beats intensity",
    description: "One small rep still counts. Showing up imperfectly is better than waiting for motivation. The goal is proof, not performance.",
  },
  {
    icon: CheckCircle,
    title: "Control what's controllable",
    description: "You can't control outcomes. But you can control your Awareness, Perspective, Habits, Wellness, and Environment. Focus there.",
  },
];

export function PhilosophySection() {
  return (
    <section className="py-12 md:py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        <h2 className="font-display text-xl md:text-2xl font-semibold text-center mb-2 text-foreground">
          The Philosophy
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Built on principles from The Controllables book.
        </p>
        
        <div className="space-y-4">
          {principles.map((principle, index) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border"
            >
              <div className="p-2.5 rounded-lg bg-accent/10 shrink-0">
                <principle.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">
                  {principle.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {principle.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
