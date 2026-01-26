import { motion } from "framer-motion";
import { BarChart3, Sparkles, TrendingUp } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Your Build",
    description: "We assess 5 life dimensions to map your current state and unlock specific recommendations.",
  },
  {
    icon: Sparkles,
    title: "Pattern Detection",
    description: "The more you use it, the more it learns your triggers and what works for you.",
  },
  {
    icon: TrendingUp,
    title: "Adaptive Snapshots",
    description: "Weekly Snapshots evolve based on your lowest controllable and what changed.",
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
          Adaptive Intelligence
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          This dashboard learns. It doesn't just track.
        </p>
        
        <div className="grid gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border"
            >
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-medium text-sm text-foreground mb-0.5">
                  {feature.title}
                </h3>
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
