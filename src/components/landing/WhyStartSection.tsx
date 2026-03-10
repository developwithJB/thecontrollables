import { motion } from "framer-motion";

const reasons = [
  "You've tried every productivity system and none of them stuck",
  "You're managing money, health, habits, and goals in 6 different apps",
  "You own a WHOOP, Oura, or Fitbit and want your data to drive real change",
  "You've read The Controllables and want the companion tool",
  "You're done with shame-based streaks and gamified guilt",
  "You want to rebuild self-trust — not just check off tasks",
];

export function WhyStartSection() {
  return (
    <section className="py-12 md:py-16 px-6 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto text-center"
      >
        <h2 className="font-display text-xl md:text-2xl font-semibold mb-2 text-foreground">
          This is for you if...
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don't need another todo app. You need a Life OS.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
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
