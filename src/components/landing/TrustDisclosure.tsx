import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function TrustDisclosure() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-8 md:py-12 px-6"
    >
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
          <div className="p-1.5 rounded-lg bg-accent/10 shrink-0 mt-0.5">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Not a chatbot. Not therapy.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These are focused guides trained on The Controllables philosophy and behavior change principles. They don't diagnose. They don't lecture. They help you choose the next right rep.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
