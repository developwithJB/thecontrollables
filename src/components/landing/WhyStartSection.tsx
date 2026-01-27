import { motion } from "framer-motion";

const reasons = [
  "You keep trying to get back on track but can't find consistency",
  "You're tired of apps that gamify your life into stress",
  "You want to rebuild self-trust, not just productivity",
  "You need a quiet place to restart without judgment",
  "You believe small, imperfect action beats grand plans",
];

export function WhyStartSection() {
  return (
    <section className="py-12 px-6 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto text-center"
      >
        <h2 className="font-display text-xl font-semibold mb-2 text-foreground">
          This is for you if...
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don't need another todo app. You need a restart system.
        </p>
        
        <div className="space-y-3 text-left">
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50"
            >
              <span className="text-accent text-lg leading-none mt-0.5">✓</span>
              <p className="text-sm text-foreground leading-relaxed">{reason}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
